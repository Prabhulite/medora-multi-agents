import { NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { departmentRepository } from '../../departments/repositories/department.repository.js';
import { specializationRepository } from '../../specializations/repositories/specialization.repository.js';
import { doctorRepository } from '../repositories/doctor.repository.js';
import type {
  CreateDoctorInput,
  UpdateDoctorInput,
} from '../validators/doctor.validators.js';

function buildSchedules(schedule?: CreateDoctorInput['schedule']) {
  if (!schedule) return [];
  const days = Array.from(new Set(schedule.availableDays || [])).sort((a, b) => a - b);
  return days.map((dayOfWeek) => ({
    dayOfWeek,
    morningStart: schedule.morningStart ?? null,
    morningEnd: schedule.morningEnd ?? null,
    eveningStart: schedule.eveningStart ?? null,
    eveningEnd: schedule.eveningEnd ?? null,
    breakStart: schedule.breakStart ?? null,
    breakEnd: schedule.breakEnd ?? null,
    maxPatientsPerSession: schedule.maxPatientsPerSession ?? null,
  }));
}

async function assertRefs(departmentId?: number, specializationId?: number) {
  if (departmentId) {
    const department = await departmentRepository.findActiveById(departmentId);
    if (!department) {
      throw new ValidationError('Department is invalid or inactive');
    }
  }
  if (specializationId) {
    const specialization = await specializationRepository.findById(specializationId);
    if (!specialization || !specialization.isActive) {
      throw new ValidationError('Specialization is invalid or inactive');
    }
  }
}

export const doctorService = {
  list() {
    return doctorRepository.findAll();
  },

  async getById(id: number) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new NotFoundError('Doctor not found');
    return doctor;
  },

  async create(input: CreateDoctorInput) {
    await assertRefs(input.departmentId, input.specializationId);
    const doctorCode = await doctorRepository.nextDoctorCode();

    return doctorRepository.createWithDetails({
      doctorCode,
      name: input.name.trim(),
      gender: input.gender ?? null,
      dob: input.dob ?? null,
      mobileNumber: input.mobileNumber.trim(),
      email: input.email ?? null,
      address: input.address ?? null,
      photoData: input.photoData ?? null,
      qualification: input.qualification.trim(),
      specializationId: input.specializationId,
      departmentId: input.departmentId,
      medicalRegistrationNumber: input.medicalRegistrationNumber.trim(),
      experienceYears: input.experienceYears ?? null,
      designation: input.designation ?? null,
      reviewValidityDays: input.reviewValidityDays ?? null,
      consultationDurationMinutes: input.consultationDurationMinutes ?? null,
      walkInAllowed: input.walkInAllowed,
      appointmentRequired: input.appointmentRequired,
      consultationRoom: input.consultationRoom ?? null,
      doctorType: input.doctorType ?? null,
      joiningDate: input.joiningDate ?? null,
      isActive: input.isActive,
      fees: input.fees,
      schedules: buildSchedules(input.schedule),
      leaves: (input.leaves || []).map((leave) => ({
        leaveFrom: leave.leaveFrom,
        leaveTo: leave.leaveTo,
        reason: leave.reason ?? null,
        status: leave.status,
      })),
      documents: input.documents?.map((document) => ({
        name: document.name.trim(),
        fileName: document.fileName.trim(),
        mimeType: document.mimeType ?? null,
        fileData: document.fileData,
      })),
    });
  },

  async update(id: number, input: UpdateDoctorInput) {
    const existing = await doctorRepository.findById(id);
    if (!existing) throw new NotFoundError('Doctor not found');

    await assertRefs(input.departmentId, input.specializationId);

    const updated = await doctorRepository.updateWithDetails(id, {
      name: input.name?.trim(),
      gender: input.gender,
      dob: input.dob,
      mobileNumber: input.mobileNumber?.trim(),
      email: input.email,
      address: input.address,
      photoData: input.photoData,
      qualification: input.qualification?.trim(),
      specializationId: input.specializationId,
      departmentId: input.departmentId,
      medicalRegistrationNumber: input.medicalRegistrationNumber?.trim(),
      experienceYears: input.experienceYears,
      designation: input.designation,
      reviewValidityDays: input.reviewValidityDays,
      consultationDurationMinutes: input.consultationDurationMinutes,
      walkInAllowed: input.walkInAllowed,
      appointmentRequired: input.appointmentRequired,
      consultationRoom: input.consultationRoom,
      doctorType: input.doctorType,
      joiningDate: input.joiningDate,
      isActive: input.isActive,
      fees: input.fees,
      schedules: input.schedule ? buildSchedules(input.schedule) : undefined,
      leaves: input.leaves
        ? input.leaves.map((leave) => ({
            leaveFrom: leave.leaveFrom,
            leaveTo: leave.leaveTo,
            reason: leave.reason ?? null,
            status: leave.status,
          }))
        : undefined,
      documents: input.documents
        ? input.documents.map((document) => ({
            name: document.name.trim(),
            fileName: document.fileName.trim(),
            mimeType: document.mimeType ?? null,
            fileData: document.fileData,
          }))
        : undefined,
    });

    if (!updated) throw new NotFoundError('Doctor not found');
    return updated;
  },

  async remove(id: number) {
    const existing = await doctorRepository.findById(id);
    if (!existing) throw new NotFoundError('Doctor not found');
    const deleted = await doctorRepository.delete(id);
    if (!deleted) throw new NotFoundError('Doctor not found');
  },
};
