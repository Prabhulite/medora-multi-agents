import { AppDataSource } from '../../../config/data-source.js';
import {
  Appointment,
  AppointmentStatusHistory,
  DoctorTimeSlot,
  type AppointmentStatus,
} from '../../../database/entities/index.js';

const detailRelations = {
  patient: { contact: true },
  doctor: true,
  department: true,
  visit: true,
  createdBy: true,
  statusHistory: { changedBy: true },
} as const;

function trimTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function patientFullName(patient: Appointment['patient']): string {
  if (!patient) return '';
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function toAppointmentView(appointment: Appointment) {
  const history = (appointment.statusHistory || [])
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((item) => ({
      id: item.id,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      notes: item.notes,
      changedById: item.changedById,
      changedByName: item.changedBy?.fullName ?? null,
      createdAt: item.createdAt,
    }));

  return {
    id: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    patientId: appointment.patientId,
    patientMrdNumber: appointment.patient?.mrdNumber ?? null,
    patientName: patientFullName(appointment.patient),
    patientAgeYears: appointment.patient?.ageYears ?? null,
    patientGender: appointment.patient?.gender ?? null,
    patientMobile: appointment.patient?.contact?.mobileNumber ?? null,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctor?.name ?? null,
    departmentId: appointment.departmentId,
    departmentName: appointment.department?.name ?? null,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: trimTime(appointment.appointmentTime),
    appointmentType: appointment.appointmentType,
    reason: appointment.reason,
    remarks: appointment.remarks,
    status: appointment.status,
    visitId: appointment.visitId,
    visitNumber: appointment.visit?.visitNumber ?? null,
    opNumber: appointment.visit?.opNumber ?? null,
    createdById: appointment.createdById,
    createdByName: appointment.createdBy?.fullName ?? null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    statusHistory: history,
  };
}

export const appointmentRepository = {
  repo() {
    return AppDataSource.getRepository(Appointment);
  },

  historyRepo() {
    return AppDataSource.getRepository(AppointmentStatusHistory);
  },

  slotRepo() {
    return AppDataSource.getRepository(DoctorTimeSlot);
  },

  async findById(id: number) {
    return this.repo().findOne({
      where: { id },
      relations: detailRelations,
    });
  },

  async list(filters: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    doctorId?: number;
    patientId?: number;
    status?: AppointmentStatus;
  }) {
    const qb = this.repo()
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('appointment.department', 'department')
      .leftJoinAndSelect('appointment.visit', 'visit')
      .leftJoinAndSelect('appointment.createdBy', 'createdBy')
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC');

    if (filters.date) {
      qb.andWhere('appointment.appointment_date = :date', { date: filters.date });
    } else {
      if (filters.fromDate) {
        qb.andWhere('appointment.appointment_date >= :fromDate', {
          fromDate: filters.fromDate,
        });
      }
      if (filters.toDate) {
        qb.andWhere('appointment.appointment_date <= :toDate', { toDate: filters.toDate });
      }
    }
    if (filters.doctorId) {
      qb.andWhere('appointment.doctor_id = :doctorId', { doctorId: filters.doctorId });
    }
    if (filters.patientId) {
      qb.andWhere('appointment.patient_id = :patientId', { patientId: filters.patientId });
    }
    if (filters.status) {
      qb.andWhere('appointment.status = :status', { status: filters.status });
    }

    const rows = await qb.getMany();
    return rows.map(toAppointmentView);
  },
};
