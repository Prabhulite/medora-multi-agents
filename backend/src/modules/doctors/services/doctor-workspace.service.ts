import { AppDataSource } from '../../../config/data-source.js';
import { Appointment, Doctor, PatientVisit } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function patientSummary(patient: { id: number; mrdNumber: string; firstName: string; middleName: string | null; lastName: string | null; ageYears: number | null; gender: string }) {
  return {
    id: patient.id,
    mrdNumber: patient.mrdNumber,
    name: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' '),
    ageYears: patient.ageYears,
    gender: patient.gender,
  };
}

export const doctorWorkspaceService = {
  async getForUser(userId: number) {
    const doctor = await AppDataSource.getRepository(Doctor).findOne({
      where: { accountUserId: userId, isActive: true },
      relations: { department: true, specialization: true },
    });
    if (!doctor) throw new NotFoundError('No active doctor profile is linked to this account');

    const today = localDate();
    const [todayAppointments, upcomingAppointments, recentVisits] = await Promise.all([
      AppDataSource.getRepository(Appointment).find({
        where: { doctorId: doctor.id, appointmentDate: today },
        relations: { patient: true },
        order: { appointmentTime: 'ASC', id: 'ASC' },
        take: 50,
      }),
      AppDataSource.getRepository(Appointment).createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.patient', 'patient')
        .where('appointment.doctor_id = :doctorId', { doctorId: doctor.id })
        .andWhere('appointment.appointment_date > :today', { today })
        .andWhere('appointment.status IN (:...statuses)', { statuses: ['booked', 'confirmed', 'checked_in', 'rescheduled'] })
        .orderBy('appointment.appointmentDate', 'ASC').addOrderBy('appointment.appointmentTime', 'ASC').addOrderBy('appointment.id', 'ASC').take(20).getMany(),
      AppDataSource.getRepository(PatientVisit).find({
        where: { doctorId: doctor.id },
        relations: { patient: true },
        order: { visitAt: 'DESC', id: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      doctor: { id: doctor.id, name: doctor.name, doctorCode: doctor.doctorCode, qualification: doctor.qualification, specialization: doctor.specialization?.name ?? null, department: doctor.department?.name ?? null },
      today,
      todayAppointments: todayAppointments.map((appointment) => ({ id: appointment.id, appointmentNumber: appointment.appointmentNumber, appointmentTime: appointment.appointmentTime, appointmentType: appointment.appointmentType, status: appointment.status, patient: patientSummary(appointment.patient) })),
      upcomingAppointments: upcomingAppointments.map((appointment) => ({ id: appointment.id, appointmentNumber: appointment.appointmentNumber, appointmentDate: appointment.appointmentDate, appointmentTime: appointment.appointmentTime, appointmentType: appointment.appointmentType, status: appointment.status, patient: patientSummary(appointment.patient) })),
      recentPatients: recentVisits.map((visit) => ({ id: visit.id, visitNumber: visit.visitNumber, visitAt: visit.visitAt, status: visit.status, patient: patientSummary(visit.patient) })),
    };
  },
};
