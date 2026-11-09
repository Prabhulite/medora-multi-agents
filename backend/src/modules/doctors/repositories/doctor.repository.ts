import { AppDataSource } from '../../../config/data-source.js';
import {
  Doctor,
  DoctorConsultationFee,
  DoctorDocument,
  DoctorLeave,
  DoctorSchedule,
  type DoctorDesignation,
  type DoctorGender,
  type DoctorLeaveStatus,
  type DoctorType,
} from '../../../database/entities/index.js';

export interface DoctorFeeView {
  newConsultationFee: number | null;
  followUpConsultationFee: number | null;
  emergencyConsultationFee: number | null;
}

export interface DoctorScheduleView {
  dayOfWeek: number;
  isAvailable: boolean;
  morningStart: string | null;
  morningEnd: string | null;
  eveningStart: string | null;
  eveningEnd: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  maxPatientsPerSession: number | null;
}

export interface DoctorLeaveView {
  id: number;
  leaveFrom: string;
  leaveTo: string;
  reason: string | null;
  status: DoctorLeaveStatus;
}

export interface DoctorDocumentView {
  id: number;
  name: string;
  fileName: string;
  mimeType: string | null;
  fileData: string;
  createdAt: Date;
}

export interface DoctorListView {
  id: number;
  doctorCode: string;
  name: string;
  mobileNumber: string;
  email: string | null;
  qualification: string;
  specializationId: number;
  specializationName: string | null;
  departmentId: number;
  departmentName: string | null;
  designation: DoctorDesignation | null;
  doctorType: DoctorType | null;
  isActive: boolean;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorDetailView extends DoctorListView {
  gender: DoctorGender | null;
  dob: string | null;
  address: string | null;
  photoData: string | null;
  medicalRegistrationNumber: string;
  experienceYears: number | null;
  reviewValidityDays: number | null;
  consultationDurationMinutes: number | null;
  walkInAllowed: boolean;
  appointmentRequired: boolean;
  consultationRoom: string | null;
  joiningDate: string | null;
  fees: DoctorFeeView;
  schedules: DoctorScheduleView[];
  leaves: DoctorLeaveView[];
  documents: DoctorDocumentView[];
}

function moneyToNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}

function trimTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

function toListView(doctor: Doctor, documentCount = 0): DoctorListView {
  return {
    id: doctor.id,
    doctorCode: doctor.doctorCode,
    name: doctor.name,
    mobileNumber: doctor.mobileNumber,
    email: doctor.email,
    qualification: doctor.qualification,
    specializationId: doctor.specializationId,
    specializationName: doctor.specialization?.name ?? null,
    departmentId: doctor.departmentId,
    departmentName: doctor.department?.name ?? null,
    designation: doctor.designation,
    doctorType: doctor.doctorType,
    isActive: doctor.isActive,
    documentCount,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

function toDetailView(doctor: Doctor): DoctorDetailView {
  const fee = doctor.consultationFee;
  const documents = doctor.documents || [];
  return {
    ...toListView(doctor, documents.length),
    gender: doctor.gender,
    dob: doctor.dob,
    address: doctor.address,
    photoData: doctor.photoData,
    medicalRegistrationNumber: doctor.medicalRegistrationNumber,
    experienceYears: doctor.experienceYears,
    reviewValidityDays: doctor.reviewValidityDays,
    consultationDurationMinutes: doctor.consultationDurationMinutes,
    walkInAllowed: doctor.walkInAllowed,
    appointmentRequired: doctor.appointmentRequired,
    consultationRoom: doctor.consultationRoom,
    joiningDate: doctor.joiningDate,
    fees: {
      newConsultationFee: moneyToNumber(fee?.newConsultationFee),
      followUpConsultationFee: moneyToNumber(fee?.followUpConsultationFee),
      emergencyConsultationFee: moneyToNumber(fee?.emergencyConsultationFee),
    },
    schedules: (doctor.schedules || [])
      .slice()
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        isAvailable: schedule.isAvailable,
        morningStart: trimTime(schedule.morningStart),
        morningEnd: trimTime(schedule.morningEnd),
        eveningStart: trimTime(schedule.eveningStart),
        eveningEnd: trimTime(schedule.eveningEnd),
        breakStart: trimTime(schedule.breakStart),
        breakEnd: trimTime(schedule.breakEnd),
        maxPatientsPerSession: schedule.maxPatientsPerSession,
      })),
    leaves: (doctor.leaves || [])
      .slice()
      .sort((a, b) => String(b.leaveFrom).localeCompare(String(a.leaveFrom)))
      .map((leave) => ({
        id: leave.id,
        leaveFrom: leave.leaveFrom,
        leaveTo: leave.leaveTo,
        reason: leave.reason,
        status: leave.status,
      })),
    documents: documents.map((document) => ({
      id: document.id,
      name: document.name,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileData: document.fileData,
      createdAt: document.createdAt,
    })),
  };
}

export const doctorRepository = {
  repo() {
    return AppDataSource.getRepository(Doctor);
  },

  feeRepo() {
    return AppDataSource.getRepository(DoctorConsultationFee);
  },

  scheduleRepo() {
    return AppDataSource.getRepository(DoctorSchedule);
  },

  leaveRepo() {
    return AppDataSource.getRepository(DoctorLeave);
  },

  async findAll(): Promise<DoctorListView[]> {
    const rows = await this.repo().find({
      relations: { department: true, specialization: true },
      order: { doctorCode: 'ASC' },
    });

    const counts = await AppDataSource.getRepository(DoctorDocument)
      .createQueryBuilder('document')
      .select('document.doctor_id', 'doctorId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('document.doctor_id')
      .getRawMany<{ doctorId: number; count: string }>();

    const countMap = new Map(counts.map((row) => [Number(row.doctorId), Number(row.count)]));
    return rows.map((row) => toListView(row, countMap.get(row.id) ?? 0));
  },

  async findById(id: number): Promise<DoctorDetailView | null> {
    const row = await this.repo().findOne({
      where: { id },
      relations: {
        department: true,
        specialization: true,
        consultationFee: true,
        schedules: true,
        leaves: true,
        documents: true,
      },
    });
    return row ? toDetailView(row) : null;
  },

  async nextDoctorCode(): Promise<string> {
    const latest = await this.repo()
      .createQueryBuilder('doctor')
      .select('doctor.doctor_code', 'doctorCode')
      .where('doctor.doctor_code LIKE :prefix', { prefix: 'DOC-%' })
      .orderBy('doctor.id', 'DESC')
      .limit(1)
      .getRawOne<{ doctorCode: string }>();

    const match = latest?.doctorCode?.match(/^DOC-(\d+)$/i);
    const next = match ? Number(match[1]) + 1 : 1;
    return `DOC-${String(next).padStart(4, '0')}`;
  },

  async createWithDetails(input: {
    doctorCode: string;
    name: string;
    gender: DoctorGender | null;
    dob: string | null;
    mobileNumber: string;
    email: string | null;
    address: string | null;
    photoData: string | null;
    qualification: string;
    specializationId: number;
    departmentId: number;
    medicalRegistrationNumber: string;
    experienceYears: number | null;
    designation: DoctorDesignation | null;
    reviewValidityDays: number | null;
    consultationDurationMinutes: number | null;
    walkInAllowed: boolean;
    appointmentRequired: boolean;
    consultationRoom: string | null;
    doctorType: DoctorType | null;
    joiningDate: string | null;
    isActive: boolean;
    fees?: {
      newConsultationFee?: number | null;
      followUpConsultationFee?: number | null;
      emergencyConsultationFee?: number | null;
    };
    schedules: Array<{
      dayOfWeek: number;
      morningStart?: string | null;
      morningEnd?: string | null;
      eveningStart?: string | null;
      eveningEnd?: string | null;
      breakStart?: string | null;
      breakEnd?: string | null;
      maxPatientsPerSession?: number | null;
    }>;
    leaves: Array<{
      leaveFrom: string;
      leaveTo: string;
      reason?: string | null;
      status?: DoctorLeaveStatus;
    }>;
    documents?: Array<{
      name: string;
      fileName: string;
      mimeType?: string | null;
      fileData: string;
    }>;
  }): Promise<DoctorDetailView> {
    return AppDataSource.transaction(async (manager) => {
      const doctorRepo = manager.getRepository(Doctor);
      const feeRepo = manager.getRepository(DoctorConsultationFee);
      const scheduleRepo = manager.getRepository(DoctorSchedule);
      const leaveRepo = manager.getRepository(DoctorLeave);
      const documentRepo = manager.getRepository(DoctorDocument);

      const doctor = await doctorRepo.save(
        doctorRepo.create({
          doctorCode: input.doctorCode,
          name: input.name,
          gender: input.gender,
          dob: input.dob,
          mobileNumber: input.mobileNumber,
          email: input.email,
          address: input.address,
          photoData: input.photoData,
          qualification: input.qualification,
          specializationId: input.specializationId,
          departmentId: input.departmentId,
          medicalRegistrationNumber: input.medicalRegistrationNumber,
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
        }),
      );

      await feeRepo.save(
        feeRepo.create({
          doctorId: doctor.id,
          newConsultationFee:
            input.fees?.newConsultationFee != null
              ? String(input.fees.newConsultationFee)
              : null,
          followUpConsultationFee:
            input.fees?.followUpConsultationFee != null
              ? String(input.fees.followUpConsultationFee)
              : null,
          emergencyConsultationFee:
            input.fees?.emergencyConsultationFee != null
              ? String(input.fees.emergencyConsultationFee)
              : null,
        }),
      );

      if (input.schedules.length) {
        await scheduleRepo.save(
          input.schedules.map((schedule) =>
            scheduleRepo.create({
              doctorId: doctor.id,
              dayOfWeek: schedule.dayOfWeek,
              isAvailable: true,
              morningStart: schedule.morningStart ?? null,
              morningEnd: schedule.morningEnd ?? null,
              eveningStart: schedule.eveningStart ?? null,
              eveningEnd: schedule.eveningEnd ?? null,
              breakStart: schedule.breakStart ?? null,
              breakEnd: schedule.breakEnd ?? null,
              maxPatientsPerSession: schedule.maxPatientsPerSession ?? null,
            }),
          ),
        );
      }

      if (input.leaves.length) {
        await leaveRepo.save(
          input.leaves.map((leave) =>
            leaveRepo.create({
              doctorId: doctor.id,
              leaveFrom: leave.leaveFrom,
              leaveTo: leave.leaveTo,
              reason: leave.reason ?? null,
              status: leave.status ?? 'scheduled',
            }),
          ),
        );
      }

      if (input.documents?.length) {
        await documentRepo.save(
          input.documents.map((document) =>
            documentRepo.create({
              doctorId: doctor.id,
              name: document.name,
              fileName: document.fileName,
              mimeType: document.mimeType ?? null,
              fileData: document.fileData,
            }),
          ),
        );
      }

      const saved = await doctorRepo.findOne({
        where: { id: doctor.id },
        relations: {
          department: true,
          specialization: true,
          consultationFee: true,
          schedules: true,
          leaves: true,
          documents: true,
        },
      });

      return toDetailView(saved!);
    });
  },

  async updateWithDetails(
    id: number,
    input: {
      name?: string;
      gender?: DoctorGender | null;
      dob?: string | null;
      mobileNumber?: string;
      email?: string | null;
      address?: string | null;
      photoData?: string | null;
      qualification?: string;
      specializationId?: number;
      departmentId?: number;
      medicalRegistrationNumber?: string;
      experienceYears?: number | null;
      designation?: DoctorDesignation | null;
      reviewValidityDays?: number | null;
      consultationDurationMinutes?: number | null;
      walkInAllowed?: boolean;
      appointmentRequired?: boolean;
      consultationRoom?: string | null;
      doctorType?: DoctorType | null;
      joiningDate?: string | null;
      isActive?: boolean;
      fees?: {
        newConsultationFee?: number | null;
        followUpConsultationFee?: number | null;
        emergencyConsultationFee?: number | null;
      };
      schedules?: Array<{
        dayOfWeek: number;
        morningStart?: string | null;
        morningEnd?: string | null;
        eveningStart?: string | null;
        eveningEnd?: string | null;
        breakStart?: string | null;
        breakEnd?: string | null;
        maxPatientsPerSession?: number | null;
      }>;
      leaves?: Array<{
        leaveFrom: string;
        leaveTo: string;
        reason?: string | null;
        status?: DoctorLeaveStatus;
      }>;
      documents?: Array<{
        name: string;
        fileName: string;
        mimeType?: string | null;
        fileData: string;
      }>;
    },
  ): Promise<DoctorDetailView | null> {
    return AppDataSource.transaction(async (manager) => {
      const doctorRepo = manager.getRepository(Doctor);
      const feeRepo = manager.getRepository(DoctorConsultationFee);
      const scheduleRepo = manager.getRepository(DoctorSchedule);
      const leaveRepo = manager.getRepository(DoctorLeave);
      const documentRepo = manager.getRepository(DoctorDocument);

      const doctor = await doctorRepo.findOne({ where: { id } });
      if (!doctor) return null;

      if (input.name !== undefined) doctor.name = input.name;
      if (input.gender !== undefined) doctor.gender = input.gender;
      if (input.dob !== undefined) doctor.dob = input.dob;
      if (input.mobileNumber !== undefined) doctor.mobileNumber = input.mobileNumber;
      if (input.email !== undefined) doctor.email = input.email;
      if (input.address !== undefined) doctor.address = input.address;
      if (input.photoData !== undefined) doctor.photoData = input.photoData;
      if (input.qualification !== undefined) doctor.qualification = input.qualification;
      if (input.specializationId !== undefined) doctor.specializationId = input.specializationId;
      if (input.departmentId !== undefined) doctor.departmentId = input.departmentId;
      if (input.medicalRegistrationNumber !== undefined) {
        doctor.medicalRegistrationNumber = input.medicalRegistrationNumber;
      }
      if (input.experienceYears !== undefined) doctor.experienceYears = input.experienceYears;
      if (input.designation !== undefined) doctor.designation = input.designation;
      if (input.reviewValidityDays !== undefined) {
        doctor.reviewValidityDays = input.reviewValidityDays;
      }
      if (input.consultationDurationMinutes !== undefined) {
        doctor.consultationDurationMinutes = input.consultationDurationMinutes;
      }
      if (input.walkInAllowed !== undefined) doctor.walkInAllowed = input.walkInAllowed;
      if (input.appointmentRequired !== undefined) {
        doctor.appointmentRequired = input.appointmentRequired;
      }
      if (input.consultationRoom !== undefined) doctor.consultationRoom = input.consultationRoom;
      if (input.doctorType !== undefined) doctor.doctorType = input.doctorType;
      if (input.joiningDate !== undefined) doctor.joiningDate = input.joiningDate;
      if (input.isActive !== undefined) doctor.isActive = input.isActive;

      await doctorRepo.save(doctor);

      if (input.fees) {
        let fee = await feeRepo.findOne({ where: { doctorId: id } });
        if (!fee) {
          fee = feeRepo.create({ doctorId: id });
        }
        if (input.fees.newConsultationFee !== undefined) {
          fee.newConsultationFee =
            input.fees.newConsultationFee != null ? String(input.fees.newConsultationFee) : null;
        }
        if (input.fees.followUpConsultationFee !== undefined) {
          fee.followUpConsultationFee =
            input.fees.followUpConsultationFee != null
              ? String(input.fees.followUpConsultationFee)
              : null;
        }
        if (input.fees.emergencyConsultationFee !== undefined) {
          fee.emergencyConsultationFee =
            input.fees.emergencyConsultationFee != null
              ? String(input.fees.emergencyConsultationFee)
              : null;
        }
        await feeRepo.save(fee);
      }

      if (input.schedules) {
        await scheduleRepo.delete({ doctorId: id });
        if (input.schedules.length) {
          await scheduleRepo.save(
            input.schedules.map((schedule) =>
              scheduleRepo.create({
                doctorId: id,
                dayOfWeek: schedule.dayOfWeek,
                isAvailable: true,
                morningStart: schedule.morningStart ?? null,
                morningEnd: schedule.morningEnd ?? null,
                eveningStart: schedule.eveningStart ?? null,
                eveningEnd: schedule.eveningEnd ?? null,
                breakStart: schedule.breakStart ?? null,
                breakEnd: schedule.breakEnd ?? null,
                maxPatientsPerSession: schedule.maxPatientsPerSession ?? null,
              }),
            ),
          );
        }
      }

      if (input.leaves) {
        await leaveRepo.delete({ doctorId: id });
        if (input.leaves.length) {
          await leaveRepo.save(
            input.leaves.map((leave) =>
              leaveRepo.create({
                doctorId: id,
                leaveFrom: leave.leaveFrom,
                leaveTo: leave.leaveTo,
                reason: leave.reason ?? null,
                status: leave.status ?? 'scheduled',
              }),
            ),
          );
        }
      }

      if (input.documents) {
        await documentRepo.delete({ doctorId: id });
        if (input.documents.length) {
          await documentRepo.save(
            input.documents.map((document) =>
              documentRepo.create({
                doctorId: id,
                name: document.name,
                fileName: document.fileName,
                mimeType: document.mimeType ?? null,
                fileData: document.fileData,
              }),
            ),
          );
        }
      }

      const saved = await doctorRepo.findOne({
        where: { id },
        relations: {
          department: true,
          specialization: true,
          consultationFee: true,
          schedules: true,
          leaves: true,
          documents: true,
        },
      });

      return saved ? toDetailView(saved) : null;
    });
  },

  async delete(id: number): Promise<boolean> {
    const result = await this.repo().delete({ id });
    return (result.affected ?? 0) > 0;
  },
};
