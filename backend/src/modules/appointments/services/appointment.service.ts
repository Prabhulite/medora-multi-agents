import { AppDataSource } from '../../../config/data-source.js';
import {
  Appointment,
  AppointmentStatusHistory,
  Doctor,
  DoctorLeave,
  DoctorSchedule,
  DoctorTimeSlot,
  Patient,
  PatientVisit,
  type AppointmentStatus,
} from '../../../database/entities/index.js';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import {
  appointmentRepository,
  toAppointmentView,
} from '../repositories/appointment.repository.js';
import type {
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from '../validators/appointment.validators.js';

const ACTIVE_SLOT_STATUSES: AppointmentStatus[] = [
  'booked',
  'confirmed',
  'checked_in',
  'rescheduled',
];

const DEFAULT_SLOT_MINUTES = 15;

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeTime(value: string): string {
  const trimmed = value.slice(0, 8);
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function displayTime(value: string): string {
  return normalizeTime(value).slice(0, 5);
}

function parseMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function dayOfWeekFromDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function assertNotPastDate(date: string) {
  if (date < todayLocalDate()) {
    throw new ValidationError('Past date appointment booking is not allowed');
  }
}

function generateWindowSlots(
  start: string | null,
  end: string | null,
  durationMinutes: number,
  breakStart: string | null,
  breakEnd: string | null,
): string[] {
  if (!start || !end) return [];
  const startMin = parseMinutes(start);
  const endMin = parseMinutes(end);
  if (endMin <= startMin) return [];

  const breakFrom = breakStart ? parseMinutes(breakStart) : null;
  const breakTo = breakEnd ? parseMinutes(breakEnd) : null;
  const slots: string[] = [];

  for (let cursor = startMin; cursor + durationMinutes <= endMin; cursor += durationMinutes) {
    const slotEnd = cursor + durationMinutes;
    const overlapsBreak =
      breakFrom !== null &&
      breakTo !== null &&
      cursor < breakTo &&
      slotEnd > breakFrom;
    if (!overlapsBreak) {
      slots.push(minutesToTime(cursor));
    }
  }

  return slots;
}

async function loadDoctorOrThrow(doctorId: number) {
  const doctor = await AppDataSource.getRepository(Doctor).findOne({
    where: { id: doctorId },
    relations: { schedules: true, leaves: true, department: true },
  });
  if (!doctor || !doctor.isActive) {
    throw new NotFoundError('Doctor not found');
  }
  return doctor;
}

function isDoctorOnLeave(doctor: Doctor, date: string): boolean {
  return (doctor.leaves || []).some(
    (leave: DoctorLeave) =>
      leave.status === 'scheduled' && leave.leaveFrom <= date && leave.leaveTo >= date,
  );
}

function scheduleForDate(doctor: Doctor, date: string): DoctorSchedule | null {
  const dow = dayOfWeekFromDate(date);
  return (doctor.schedules || []).find((s) => s.dayOfWeek === dow && s.isAvailable) ?? null;
}

function buildCandidateSlots(doctor: Doctor, date: string): string[] {
  if (isDoctorOnLeave(doctor, date)) return [];
  const schedule = scheduleForDate(doctor, date);
  if (!schedule) return [];

  const duration = doctor.consultationDurationMinutes || DEFAULT_SLOT_MINUTES;
  const morning = generateWindowSlots(
    schedule.morningStart,
    schedule.morningEnd,
    duration,
    schedule.breakStart,
    schedule.breakEnd,
  );
  const evening = generateWindowSlots(
    schedule.eveningStart,
    schedule.eveningEnd,
    duration,
    schedule.breakStart,
    schedule.breakEnd,
  );
  return [...morning, ...evening];
}

async function findActiveSlotConflict(
  doctorId: number,
  date: string,
  time: string,
  excludeAppointmentId?: number,
) {
  const qb = appointmentRepository
    .repo()
    .createQueryBuilder('appointment')
    .where('appointment.doctor_id = :doctorId', { doctorId })
    .andWhere('appointment.appointment_date = :date', { date })
    .andWhere('appointment.appointment_time = :time', { time: normalizeTime(time) })
    .andWhere('appointment.status IN (:...statuses)', { statuses: ACTIVE_SLOT_STATUSES });

  if (excludeAppointmentId) {
    qb.andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId });
  }

  return qb.getOne();
}

async function releaseSlot(
  manager: typeof AppDataSource.manager,
  doctorId: number,
  date: string,
  time: string,
  appointmentId: number,
) {
  const slotRepo = manager.getRepository(DoctorTimeSlot);
  const slot = await slotRepo.findOne({
    where: {
      doctorId,
      slotDate: date,
      slotTime: normalizeTime(time),
    },
  });
  if (slot && slot.appointmentId === appointmentId) {
    slot.isAvailable = true;
    slot.appointmentId = null;
    await slotRepo.save(slot);
  }
}

async function bookSlot(
  manager: typeof AppDataSource.manager,
  doctorId: number,
  date: string,
  time: string,
  appointmentId: number,
) {
  const slotRepo = manager.getRepository(DoctorTimeSlot);
  let slot = await slotRepo.findOne({
    where: {
      doctorId,
      slotDate: date,
      slotTime: normalizeTime(time),
    },
  });

  if (!slot) {
    slot = slotRepo.create({
      doctorId,
      slotDate: date,
      slotTime: normalizeTime(time),
      isAvailable: false,
      appointmentId,
    });
  } else {
    if (!slot.isAvailable && slot.appointmentId && slot.appointmentId !== appointmentId) {
      throw new ConflictError('This time slot is already booked for the selected doctor');
    }
    slot.isAvailable = false;
    slot.appointmentId = appointmentId;
  }

  await slotRepo.save(slot);
}

async function appendHistory(
  manager: typeof AppDataSource.manager,
  appointmentId: number,
  fromStatus: AppointmentStatus | null,
  toStatus: AppointmentStatus,
  changedById: number | null,
  notes?: string | null,
) {
  await manager.save(
    manager.create(AppointmentStatusHistory, {
      appointmentId,
      fromStatus,
      toStatus,
      notes: notes ?? null,
      changedById,
    }),
  );
}

export const appointmentService = {
  async list(filters: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    doctorId?: number;
    patientId?: number;
    status?: AppointmentStatus;
  }) {
    return appointmentRepository.list(filters);
  },

  async getById(id: number) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');
    return toAppointmentView(appointment);
  },

  async availableDoctors(date: string, departmentId?: number) {
    assertNotPastDate(date);

    const qb = AppDataSource.getRepository(Doctor)
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.schedules', 'schedules')
      .leftJoinAndSelect('doctor.leaves', 'leaves')
      .leftJoinAndSelect('doctor.department', 'department')
      .where('doctor.is_active = :active', { active: true });

    if (departmentId) {
      qb.andWhere('doctor.department_id = :departmentId', { departmentId });
    }

    const doctors = await qb.getMany();
    return doctors
      .filter((doctor) => buildCandidateSlots(doctor, date).length > 0)
      .map((doctor) => ({
        id: doctor.id,
        doctorCode: doctor.doctorCode,
        name: doctor.name,
        departmentId: doctor.departmentId,
        departmentName: doctor.department?.name ?? null,
        consultationDurationMinutes:
          doctor.consultationDurationMinutes || DEFAULT_SLOT_MINUTES,
      }));
  },

  async getSlots(doctorId: number, date: string, excludeAppointmentId?: number) {
    assertNotPastDate(date);
    const doctor = await loadDoctorOrThrow(doctorId);
    const candidates = buildCandidateSlots(doctor, date);

    if (!candidates.length) {
      return {
        doctorId,
        date,
        slots: [] as Array<{ time: string; available: boolean }>,
        message: isDoctorOnLeave(doctor, date)
          ? 'Doctor is on leave for the selected date'
          : 'Doctor has no schedule for the selected date',
      };
    }

    const qb = appointmentRepository
      .repo()
      .createQueryBuilder('appointment')
      .select(['appointment.id', 'appointment.appointmentTime'])
      .where('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere('appointment.appointment_date = :date', { date })
      .andWhere('appointment.status IN (:...statuses)', { statuses: ACTIVE_SLOT_STATUSES });

    if (excludeAppointmentId) {
      qb.andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId });
    }

    const booked = await qb.getMany();
    const bookedSet = new Set(booked.map((row) => displayTime(row.appointmentTime)!));

    return {
      doctorId,
      date,
      slots: candidates.map((time) => ({
        time: displayTime(time)!,
        available: !bookedSet.has(displayTime(time)!),
      })),
      message: null as string | null,
    };
  },

  async create(input: CreateAppointmentInput, userId: number | null) {
    assertNotPastDate(input.appointmentDate);

    const patient = await AppDataSource.getRepository(Patient).findOne({
      where: { id: input.patientId, isActive: true },
      relations: { contact: true },
    });
    if (!patient) throw new NotFoundError('Patient not found');

    const doctor = await loadDoctorOrThrow(input.doctorId);
    if (doctor.departmentId !== input.departmentId) {
      throw new ValidationError('Selected doctor does not belong to the selected department');
    }

    const candidates = buildCandidateSlots(doctor, input.appointmentDate);
    const requested = normalizeTime(input.appointmentTime);
    if (!candidates.some((slot) => slot === requested)) {
      throw new ValidationError('Selected time is not within doctor availability');
    }

    const conflict = await findActiveSlotConflict(
      input.doctorId,
      input.appointmentDate,
      input.appointmentTime,
    );
    if (conflict) {
      throw new ConflictError('This time slot is already booked for the selected doctor');
    }

    const sameDay = await appointmentRepository
      .repo()
      .createQueryBuilder('appointment')
      .where('appointment.patient_id = :patientId', { patientId: input.patientId })
      .andWhere('appointment.appointment_date = :date', { date: input.appointmentDate })
      .andWhere('appointment.status IN (:...statuses)', { statuses: ACTIVE_SLOT_STATUSES })
      .getMany();

    if (sameDay.length && !input.forceDuplicate) {
      throw new AppError(
        'Patient already has an appointment on this date. Confirm to book another.',
        409,
        'DUPLICATE_BOOKING_WARNING',
        {
          existingAppointments: sameDay.map((row) => ({
            id: row.id,
            appointmentNumber: row.appointmentNumber,
            appointmentTime: displayTime(row.appointmentTime),
            doctorId: row.doctorId,
            status: row.status,
          })),
        },
      );
    }

    const savedId = await AppDataSource.transaction(async (manager) => {
      const appointmentNumber = await nextSequenceNumber(manager, 'APT', 'APT', 6);
      const appointment = await manager.save(
        manager.create(Appointment, {
          appointmentNumber,
          patientId: input.patientId,
          doctorId: input.doctorId,
          departmentId: input.departmentId,
          appointmentDate: input.appointmentDate,
          appointmentTime: requested,
          appointmentType: input.appointmentType,
          reason: input.reason ?? null,
          remarks: input.remarks ?? null,
          status: 'booked',
          createdById: userId,
          updatedById: userId,
        }),
      );

      await bookSlot(
        manager,
        input.doctorId,
        input.appointmentDate,
        requested,
        appointment.id,
      );
      await appendHistory(manager, appointment.id, null, 'booked', userId, 'Appointment created');
      return appointment.id;
    });

    return this.getById(savedId);
  },

  async updateStatus(id: number, input: UpdateAppointmentStatusInput, userId: number | null) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');

    const fromStatus = appointment.status;
    const toStatus = input.status;

    if (fromStatus === toStatus && toStatus !== 'rescheduled') {
      return toAppointmentView(appointment);
    }

    if (['cancelled', 'completed', 'no_show'].includes(fromStatus) && toStatus !== fromStatus) {
      throw new ValidationError(`Cannot change status from ${fromStatus}`);
    }

    if (toStatus === 'rescheduled') {
      if (!input.appointmentDate || !input.appointmentTime) {
        throw new ValidationError('New appointment date and time are required to reschedule');
      }
      assertNotPastDate(input.appointmentDate);

      const nextDoctorId = input.doctorId ?? appointment.doctorId;
      const nextDepartmentId = input.departmentId ?? appointment.departmentId;
      const doctor = await loadDoctorOrThrow(nextDoctorId);
      if (doctor.departmentId !== nextDepartmentId) {
        throw new ValidationError('Selected doctor does not belong to the selected department');
      }

      const candidates = buildCandidateSlots(doctor, input.appointmentDate);
      const requested = normalizeTime(input.appointmentTime);
      if (!candidates.some((slot) => slot === requested)) {
        throw new ValidationError('Selected time is not within doctor availability');
      }

      const conflict = await findActiveSlotConflict(
        nextDoctorId,
        input.appointmentDate,
        requested,
        appointment.id,
      );
      if (conflict) {
        throw new ConflictError('This time slot is already booked for the selected doctor');
      }

      await AppDataSource.transaction(async (manager) => {
        await releaseSlot(
          manager,
          appointment.doctorId,
          appointment.appointmentDate,
          appointment.appointmentTime,
          appointment.id,
        );

        appointment.doctorId = nextDoctorId;
        appointment.departmentId = nextDepartmentId;
        appointment.appointmentDate = input.appointmentDate!;
        appointment.appointmentTime = requested;
        appointment.status = 'booked';
        appointment.updatedById = userId;
        await manager.save(appointment);

        await bookSlot(
          manager,
          nextDoctorId,
          input.appointmentDate!,
          requested,
          appointment.id,
        );
        await appendHistory(
          manager,
          appointment.id,
          fromStatus,
          'rescheduled',
          userId,
          input.notes ??
            `Rescheduled to ${input.appointmentDate} ${displayTime(requested)}`,
        );
        await appendHistory(manager, appointment.id, 'rescheduled', 'booked', userId, 'Rebooked after reschedule');
      });

      return this.getById(id);
    }

    if (toStatus === 'checked_in') {
      if (!['booked', 'confirmed', 'rescheduled'].includes(fromStatus)) {
        throw new ValidationError('Only booked/confirmed appointments can be checked in');
      }

      await AppDataSource.transaction(async (manager) => {
        if (appointment.visitId) {
          throw new ConflictError('OP visit already exists for this appointment');
        }

        const dayStart = `${appointment.appointmentDate} 00:00:00`;
        const dayEnd = `${appointment.appointmentDate} 23:59:59`;

        const existingVisit = await manager
          .getRepository(PatientVisit)
          .createQueryBuilder('visit')
          .where('visit.patient_id = :patientId', { patientId: appointment.patientId })
          .andWhere('visit.visit_type = :visitType', { visitType: 'OP' })
          .andWhere('visit.status != :cancelled', { cancelled: 'cancelled' })
          .andWhere('visit.visit_at BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd })
          .orderBy('visit.visit_at', 'DESC')
          .getOne();

        let visit = existingVisit;
        if (!visit) {
          const visitNumber = await nextSequenceNumber(manager, 'VIS', 'VIS', 6);
          const opNumber = await nextSequenceNumber(manager, 'OP', 'OP', 6);
          visit = await manager.save(
            manager.create(PatientVisit, {
              patientId: appointment.patientId,
              visitNumber,
              opNumber,
              visitType: 'OP',
              visitAt: new Date(),
              departmentId: appointment.departmentId,
              doctorId: appointment.doctorId,
              status: 'registered',
              notes: `Created from appointment ${appointment.appointmentNumber}`,
              createdById: userId,
            }),
          );
        }

        appointment.visitId = visit!.id;
        appointment.status = 'checked_in';
        appointment.updatedById = userId;
        await manager.save(appointment);
        await appendHistory(
          manager,
          appointment.id,
          fromStatus,
          'checked_in',
          userId,
          input.notes ?? `Checked in — OP ${visit!.opNumber}`,
        );
      });

      return this.getById(id);
    }

    if (toStatus === 'cancelled' || toStatus === 'no_show') {
      await AppDataSource.transaction(async (manager) => {
        await releaseSlot(
          manager,
          appointment.doctorId,
          appointment.appointmentDate,
          appointment.appointmentTime,
          appointment.id,
        );
        appointment.status = toStatus;
        appointment.updatedById = userId;
        await manager.save(appointment);
        await appendHistory(manager, appointment.id, fromStatus, toStatus, userId, input.notes);
      });
      return this.getById(id);
    }

    if (toStatus === 'confirmed' || toStatus === 'completed') {
      if (toStatus === 'confirmed' && !['booked', 'rescheduled'].includes(fromStatus)) {
        throw new ValidationError('Only booked appointments can be confirmed');
      }
      if (toStatus === 'completed' && fromStatus !== 'checked_in') {
        throw new ValidationError('Only checked-in appointments can be completed');
      }

      await AppDataSource.transaction(async (manager) => {
        appointment.status = toStatus;
        appointment.updatedById = userId;
        await manager.save(appointment);
        await appendHistory(manager, appointment.id, fromStatus, toStatus, userId, input.notes);
      });
      return this.getById(id);
    }

    throw new ValidationError('Unsupported status transition');
  },
};
