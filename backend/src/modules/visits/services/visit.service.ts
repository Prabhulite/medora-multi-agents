import { AppDataSource } from '../../../config/data-source.js';
import {
  Appointment,
  Doctor,
  Invoice,
  Patient,
  PatientVisit,
  PatientAuditLog,
} from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateOpCheckinInput, VisitListFilters } from '../validators/visit.validators.js';

function patientFullName(patient: Patient | null | undefined) {
  if (!patient) return '';
  return [patient.title, patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function dayBounds(dateIso: string) {
  const end = new Date(`${dateIso}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    dayStart: `${dateIso} 00:00:00`,
    dayEnd: `${end.toISOString().slice(0, 10)} 00:00:00`,
  };
}

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function durationLabel(start: Date, end: Date | null) {
  const endMs = (end ?? new Date()).getTime();
  const mins = Math.max(0, Math.floor((endMs - start.getTime()) / 60_000));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours}h ${rem}m`;
}

async function nextTokenForDoctor(
  manager: typeof AppDataSource.manager,
  doctorId: number,
  dateIso: string,
) {
  const { dayStart, dayEnd } = dayBounds(dateIso);
  const row = await manager
    .getRepository(PatientVisit)
    .createQueryBuilder('visit')
    .select('MAX(visit.tokenNumber)', 'maxToken')
    .setLock('pessimistic_write')
    .where('visit.doctorId = :doctorId', { doctorId })
    .andWhere('visit.visitAt >= :dayStart AND visit.visitAt < :dayEnd', { dayStart, dayEnd })
    .getRawOne<{ maxToken: number | string | null }>();
  return Number(row?.maxToken || 0) + 1;
}

function toCheckinView(
  visit: PatientVisit,
  extras?: {
    billAmount?: number | null;
    nextAppointmentAt?: string | null;
    appointmentNumber?: string | null;
  },
) {
  const inside = !visit.checkedOutAt && visit.status !== 'cancelled' && visit.status !== 'completed';
  return {
    id: visit.id,
    visitNumber: visit.visitNumber,
    opNumber: visit.opNumber,
    patientId: visit.patientId,
    patientName: patientFullName(visit.patient),
    patientMrdNumber: visit.patient?.mrdNumber ?? null,
    patientFamilyId: visit.patient?.familyId ?? null,
    patientMobile: visit.patient?.contact?.mobileNumber ?? null,
    patientPhotoData: visit.patient?.photoData ?? null,
    doctorId: visit.doctorId,
    doctorName: visit.doctor?.name ?? null,
    doctorQualification: visit.doctor?.qualification ?? null,
    departmentId: visit.departmentId,
    departmentName: visit.department?.name ?? null,
    natureOfVisit: visit.natureOfVisit,
    purposeOfVisit: visit.purposeOfVisit,
    referredBy: visit.visitReferredBy,
    appointmentId: visit.appointmentId,
    appointmentNumber: extras?.appointmentNumber ?? null,
    isMlc: visit.isMlc,
    hadFood: visit.hadFood,
    tokenNumber: visit.tokenNumber,
    checkedInAt: visit.visitAt,
    checkedInByName: visit.createdBy?.fullName ?? null,
    checkedOutAt: visit.checkedOutAt,
    consultationStartedAt: visit.consultationStartedAt,
    consultationStartedByName: visit.consultationStartedBy?.fullName ?? null,
    checkedOutByName: visit.checkedOutBy?.fullName ?? null,
    visitDuration: durationLabel(visit.visitAt, visit.checkedOutAt),
    visitState: inside ? 'inside' : 'done',
    status: visit.status,
    billAmount: extras?.billAmount ?? null,
    nextAppointmentAt: extras?.nextAppointmentAt ?? null,
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
  };
}

export const visitService = {
  async list(filters: VisitListFilters) {
    const qb = AppDataSource.getRepository(PatientVisit)
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.patient', 'patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('visit.doctor', 'doctor')
      .leftJoinAndSelect('visit.department', 'department')
      .leftJoinAndSelect('visit.createdBy', 'createdBy')
      .leftJoinAndSelect('visit.checkedOutBy', 'checkedOutBy')
      .leftJoinAndSelect('visit.consultationStartedBy', 'consultationStartedBy')
      .where('visit.visitType = :visitType', { visitType: 'OP' })
      .orderBy('visit.visitAt', 'DESC')
      .take(500);

    const fromDate = filters.fromDate || filters.date;
    const toDate = filters.toDate || filters.date;
    if (fromDate) {
      qb.andWhere('visit.visitAt >= :fromAt', { fromAt: `${fromDate} 00:00:00` });
    }
    if (toDate) {
      qb.andWhere('visit.visitAt < :toAt', { toAt: dayBounds(toDate).dayEnd });
    }
    if (filters.doctorId) {
      qb.andWhere('visit.doctorId = :doctorId', { doctorId: filters.doctorId });
    }
    if (filters.patientId) {
      qb.andWhere('visit.patientId = :patientId', { patientId: filters.patientId });
    }
    if (filters.status === 'waiting' || filters.status === 'consulting') {
      qb.andWhere('visit.checkedOutAt IS NULL')
        .andWhere('visit.status = :queueStatus', { queueStatus: filters.status === 'waiting' ? 'in_progress' : 'consulting' });
      qb.orderBy('visit.doctorId', 'ASC').addOrderBy('visit.tokenNumber', 'ASC').addOrderBy('visit.id', 'ASC');
    } else if (filters.status === 'inside') {
      qb.andWhere('visit.checkedOutAt IS NULL').andWhere('visit.status NOT IN (:...closed)', {
        closed: ['cancelled', 'completed'],
      });
    } else if (filters.status === 'done') {
      qb.andWhere('(visit.checkedOutAt IS NOT NULL OR visit.status = :completed)', {
        completed: 'completed',
      });
    }

    const rows = await qb.getMany();
    const patientIds = [...new Set(rows.map((row) => row.patientId))];

    const invoiceMap = new Map<number, number>();
    const nextAppointmentMap = new Map<number, string>();
    const appointmentNumberMap = new Map<number, string>();

    if (patientIds.length) {
      const invoices = await AppDataSource.getRepository(Invoice)
        .createQueryBuilder('invoice')
        .where('invoice.patientId IN (:...patientIds)', { patientIds })
        .orderBy('invoice.createdAt', 'DESC')
        .getMany();
      for (const invoice of invoices) {
        if (!invoiceMap.has(invoice.patientId)) {
          invoiceMap.set(invoice.patientId, Number(invoice.total || 0));
        }
      }

      const nowIso = new Date().toISOString();
      const appointments = await AppDataSource.getRepository(Appointment)
        .createQueryBuilder('appointment')
        .where('appointment.patientId IN (:...patientIds)', { patientIds })
        .andWhere('appointment.status NOT IN (:...closed)', {
          closed: ['cancelled', 'no_show', 'completed'],
        })
        .andWhere(
          "(CONCAT(appointment.appointmentDate, 'T', appointment.appointmentTime) >= :nowIso OR appointment.appointmentDate >= :today)",
          { nowIso, today: todayIso() },
        )
        .orderBy('appointment.appointmentDate', 'ASC')
        .addOrderBy('appointment.appointmentTime', 'ASC')
        .getMany();

      for (const appointment of appointments) {
        if (!nextAppointmentMap.has(appointment.patientId)) {
          nextAppointmentMap.set(
            appointment.patientId,
            `${appointment.appointmentDate} ${String(appointment.appointmentTime).slice(0, 5)}`,
          );
        }
      }

      const linkedIds = rows.map((row) => row.appointmentId).filter(Boolean) as number[];
      if (linkedIds.length) {
        const linked = await AppDataSource.getRepository(Appointment)
          .createQueryBuilder('appointment')
          .where('appointment.id IN (:...ids)', { ids: linkedIds })
          .getMany();
        for (const appointment of linked) {
          appointmentNumberMap.set(appointment.id, appointment.appointmentNumber);
        }
      }
    }

    return rows.map((visit) =>
      toCheckinView(visit, {
        billAmount: invoiceMap.get(visit.patientId) ?? null,
        nextAppointmentAt: nextAppointmentMap.get(visit.patientId) ?? null,
        appointmentNumber: visit.appointmentId
          ? appointmentNumberMap.get(visit.appointmentId) ?? null
          : null,
      }),
    );
  },

  async patientAppointments(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({
      where: { id: patientId },
    });
    if (!patient || !patient.isActive) throw new NotFoundError('Active patient not found');

    const rows = await AppDataSource.getRepository(Appointment)
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .where('appointment.patient_id = :patientId', { patientId })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: ['booked', 'confirmed', 'rescheduled'],
      })
      .andWhere('appointment.appointment_date >= :today', { today: todayIso() })
      .orderBy('appointment.appointment_date', 'ASC')
      .addOrderBy('appointment.appointment_time', 'ASC')
      .take(50)
      .getMany();

    return rows.map((row) => ({
      id: row.id,
      appointmentNumber: row.appointmentNumber,
      appointmentDate: row.appointmentDate,
      appointmentTime: String(row.appointmentTime).slice(0, 5),
      doctorId: row.doctorId,
      doctorName: row.doctor?.name ?? null,
      status: row.status,
      reason: row.reason,
    }));
  },

  async checkin(input: CreateOpCheckinInput, userId: number | null) {
    if (!input.makeNewCheckin) {
      throw new ValidationError('Enable Make a New Checkin to continue');
    }

    return AppDataSource.transaction(async (manager) => {
      const patient = await manager
        .getRepository(Patient)
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.contact', 'contact')
        .setLock('pessimistic_write')
        .where('patient.id = :id', { id: input.patientId })
        .getOne();
      if (!patient || !patient.isActive) throw new NotFoundError('Active patient not found');

      const doctor = await manager.getRepository(Doctor).findOne({
        where: { id: input.doctorId, isActive: true },
      });
      if (!doctor) throw new NotFoundError('Active consultant not found');

      let appointment: Appointment | null = null;
      if (input.appointmentId) {
        appointment = await manager.getRepository(Appointment).findOne({
          where: { id: input.appointmentId, patientId: patient.id },
        });
        if (!appointment) throw new NotFoundError('Appointment not found for this patient');
        if (!['booked', 'confirmed', 'rescheduled'].includes(appointment.status)) {
          throw new ConflictError('Selected appointment cannot be checked in');
        }
      }

      const today = todayIso();
      const { dayStart, dayEnd } = dayBounds(today);
      const openVisit = await manager
        .getRepository(PatientVisit)
        .createQueryBuilder('visit')
        .where('visit.patientId = :patientId', { patientId: patient.id })
        .andWhere('visit.visitType = :visitType', { visitType: 'OP' })
        .andWhere('visit.checkedOutAt IS NULL')
        .andWhere('visit.status NOT IN (:...closed)', { closed: ['cancelled', 'completed'] })
        .andWhere('visit.visitAt >= :dayStart AND visit.visitAt < :dayEnd', { dayStart, dayEnd })
        .orderBy('visit.visitAt', 'DESC')
        .getOne();

      if (openVisit) {
        throw new ConflictError(
          `Patient already checked in today (OP ${openVisit.opNumber || openVisit.visitNumber}). Check out first or continue from Check-in List.`,
        );
      }

      if (input.familyId !== undefined) {
        patient.familyId = input.familyId?.trim() || null;
        await manager.save(patient);
      }

      // Patient lock is acquired first in every check-in; the doctor lock serializes number and token allocation.
      await manager.getRepository(Doctor).createQueryBuilder('doctor')
        .setLock('pessimistic_write').where('doctor.id = :id', { id: doctor.id }).getOneOrFail();
      const visitNumber = await nextSequenceNumber(manager, 'VIS', 'VIS', 6);
      const opNumber = await nextSequenceNumber(manager, 'OP', 'OP', 6);
      const tokenNumber = await nextTokenForDoctor(manager, doctor.id, today);

      const visit = await manager.save(
        manager.create(PatientVisit, {
          patientId: patient.id,
          visitNumber,
          opNumber,
          visitType: 'OP',
          visitAt: new Date(),
          checkedOutAt: null,
          checkedOutById: null,
          departmentId: doctor.departmentId ?? null,
          doctorId: doctor.id,
          natureOfVisit: input.natureOfVisit,
          purposeOfVisit: input.purposeOfVisit,
          visitReferredBy: input.referredBy?.trim() || patient.referredBy || null,
          appointmentId: appointment?.id ?? null,
          isMlc: Boolean(input.isMlc),
          hadFood: Boolean(input.hadFood),
          tokenNumber,
          status: 'in_progress',
          notes: appointment
            ? `OP check-in from appointment ${appointment.appointmentNumber}`
            : 'Walk-in OP check-in',
          createdById: userId,
        }),
      );

      if (appointment) {
        appointment.visitId = visit.id;
        appointment.status = 'checked_in';
        appointment.updatedById = userId;
        if (!appointment.doctorId) appointment.doctorId = doctor.id;
        await manager.save(appointment);
      }

      const saved = await manager.getRepository(PatientVisit).findOne({
        where: { id: visit.id },
        relations: {
          patient: { contact: true },
          doctor: true,
          department: true,
          createdBy: true,
          checkedOutBy: true,
          consultationStartedBy: true,
        },
      });

      return toCheckinView(saved!);
    });
  },

  async startConsultation(id: number, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PatientVisit);
      const visit = await repo.createQueryBuilder('visit').setLock('pessimistic_write')
        .where('visit.id = :id', { id }).getOne();
      if (!visit) throw new NotFoundError('Check-in visit not found');
      if (visit.visitType !== 'OP') throw new ConflictError('Only OP visits can start consultation');
      if (visit.checkedOutAt || visit.status !== 'in_progress') {
        throw new ConflictError('Visit is not waiting for consultation');
      }
      visit.status = 'consulting';
      visit.consultationStartedAt = new Date();
      visit.consultationStartedById = userId;
      await repo.save(visit);
      await manager.getRepository(PatientAuditLog).save(manager.create(PatientAuditLog, {
        patientId: visit.patientId, action: 'consultation_started', changedById: userId,
        changeSummary: `OP consultation started for visit ${visit.visitNumber}`,
        beforeData: null, afterData: null,
      }));
      const saved = await repo.findOne({ where: { id }, relations: {
        patient: { contact: true }, doctor: true, department: true, createdBy: true,
        checkedOutBy: true, consultationStartedBy: true,
      } });
      return toCheckinView(saved!);
    });
  },

  async checkout(id: number, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PatientVisit);
      const visit = await repo
        .createQueryBuilder('visit')
        .setLock('pessimistic_write')
        .where('visit.id = :id', { id })
        .getOne();
      if (!visit) throw new NotFoundError('Check-in visit not found');
      if (visit.visitType !== 'OP') throw new ValidationError('Only OP visits can be checked out');
      if (visit.checkedOutAt || visit.status === 'completed') {
        throw new ConflictError('Visit is already checked out');
      }
      if (visit.status === 'cancelled') throw new ConflictError('Cancelled visits cannot be checked out');

      visit.checkedOutAt = new Date();
      visit.checkedOutById = userId;
      visit.status = 'completed';
      await repo.save(visit);

      const saved = await repo.findOne({
        where: { id },
        relations: {
          patient: { contact: true },
          doctor: true,
          department: true,
          createdBy: true,
          checkedOutBy: true,
          consultationStartedBy: true,
        },
      });
      return toCheckinView(saved!);
    });
  },
};
