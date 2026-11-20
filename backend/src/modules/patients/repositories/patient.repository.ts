import { Brackets, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import {
  Patient,
  PatientAddress,
  PatientAuditLog,
  PatientContact,
  PatientEmergencyContact,
  PatientIdentification,
  PatientVisit,
  type EmergencyRelationship,
  type IdProofType,
  type PatientCategory,
  type PatientGender,
} from '../../../database/entities/index.js';
import { nextMonthlyNumber, nextSequenceNumber } from '../services/number-sequence.service.js';
import { ConflictError } from '../../../shared/errors/AppError.js';

export interface PatientListView {
  id: number;
  mrdNumber: string;
  familyId: string | null;
  registrationAt: Date;
  fullName: string;
  gender: PatientGender;
  dateOfBirth: string | null;
  ageYears: number | null;
  ageIsApproximate: boolean;
  bloodGroup: string | null;
  photoData: string | null;
  mobileNumber: string | null;
  city: string | null;
  addressLine: string | null;
  district: string | null;
  state: string | null;
  patientCategory: PatientCategory | null;
  latestVisitNumber: string | null;
  latestOpNumber: string | null;
  latestVisitAt: Date | null;
  latestVisitDepartmentId: number | null;
  mergedIntoPatientId: number | null;
  createdById: number | null;
  createdByName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientDetailView extends PatientListView {
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  religion: string | null;
  occupation: string | null;
  referredBy: string | null;
  registrationSourceId: number | null;
  registrationSourceName: string | null;
  referralDoctorId: number | null;
  referralDoctorName: string | null;
  preferredLanguage: string | null;
  specialRemarks: string | null;
  contact: {
    mobileNumber: string;
    alternateMobile: string | null;
    email: string | null;
  } | null;
  address: {
    addressLine1: string;
    addressLine2: string | null;
    country: string;
    state: string;
    district: string;
    city: string;
    pincode: string;
  } | null;
  identification: {
    idProofType: IdProofType | null;
    idProofNumber: string | null;
    idProofDocumentName: string | null;
    idProofDocumentFileName: string | null;
    idProofDocumentMimeType: string | null;
    idProofDocumentData: string | null;
    abhaNumber: string | null;
    abhaAddress: string | null;
  } | null;
  emergencyContact: {
    contactPersonName: string | null;
    relationship: EmergencyRelationship | null;
    contactNumber: string | null;
    alternateNumber: string | null;
    address: string | null;
  } | null;
  visits: Array<{
    id: number;
    visitNumber: string;
    opNumber: string | null;
    visitType: string;
    visitAt: Date;
    status: string;
  }>;
  updatedById: number | null;
  updatedByName: string | null;
}

function fullName(patient: Patient): string {
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function primaryAddress(patient: Patient): PatientAddress | null {
  if (!patient.addresses?.length) return null;
  return patient.addresses.find((row) => row.isPrimary) || patient.addresses[0] || null;
}

function toListView(patient: Patient): PatientListView {
  const address = primaryAddress(patient);
  const latestVisit = [...(patient.visits || [])].sort(
    (a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime(),
  )[0];

  return {
    id: patient.id,
    mrdNumber: patient.mrdNumber,
    familyId: patient.familyId,
    registrationAt: patient.registrationAt,
    fullName: fullName(patient),
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
    ageYears: patient.ageYears,
    ageIsApproximate: patient.ageIsApproximate,
    bloodGroup: patient.bloodGroup,
    photoData: patient.photoData,
    mobileNumber: patient.contact?.mobileNumber ?? null,
    city: address?.city ?? null,
    addressLine: address?.addressLine1 ?? null,
    district: address?.district ?? null,
    state: address?.state ?? null,
    patientCategory: patient.patientCategory,
    latestVisitNumber: latestVisit?.visitNumber ?? null,
    latestOpNumber: latestVisit?.opNumber ?? null,
    latestVisitAt: latestVisit?.visitAt ?? null,
    latestVisitDepartmentId: latestVisit?.departmentId ?? null,
    mergedIntoPatientId: patient.mergedIntoPatientId,
    createdById: patient.createdById,
    createdByName: patient.createdBy?.fullName ?? null,
    isActive: patient.isActive,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

function toDetailView(patient: Patient): PatientDetailView {
  const address = primaryAddress(patient);
  return {
    ...toListView(patient),
    title: patient.title,
    firstName: patient.firstName,
    middleName: patient.middleName,
    lastName: patient.lastName,
    maritalStatus: patient.maritalStatus,
    nationality: patient.nationality,
    religion: patient.religion,
    occupation: patient.occupation,
    referredBy: patient.referredBy,
    registrationSourceId: patient.registrationSourceId,
    registrationSourceName: patient.registrationSource?.name ?? null,
    referralDoctorId: patient.referralDoctorId,
    referralDoctorName: patient.referralDoctor?.name ?? null,
    preferredLanguage: patient.preferredLanguage,
    specialRemarks: patient.specialRemarks,
    contact: patient.contact
      ? {
          mobileNumber: patient.contact.mobileNumber,
          alternateMobile: patient.contact.alternateMobile,
          email: patient.contact.email,
        }
      : null,
    address: address
      ? {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          country: address.country,
          state: address.state,
          district: address.district,
          city: address.city,
          pincode: address.pincode,
        }
      : null,
    identification: patient.identification
      ? {
          idProofType: patient.identification.idProofType,
          idProofNumber: patient.identification.idProofNumber,
          idProofDocumentName: patient.identification.idProofDocumentName,
          idProofDocumentFileName: patient.identification.idProofDocumentFileName,
          idProofDocumentMimeType: patient.identification.idProofDocumentMimeType,
          idProofDocumentData: patient.identification.idProofDocumentData,
          abhaNumber: patient.identification.abhaNumber,
          abhaAddress: patient.identification.abhaAddress,
        }
      : null,
    emergencyContact: patient.emergencyContact
      ? {
          contactPersonName: patient.emergencyContact.contactPersonName,
          relationship: patient.emergencyContact.relationship,
          contactNumber: patient.emergencyContact.contactNumber,
          alternateNumber: patient.emergencyContact.alternateNumber,
          address: patient.emergencyContact.address,
        }
      : null,
    visits: (patient.visits || [])
      .slice()
      .sort((a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime())
      .map((visit) => ({
        id: visit.id,
        visitNumber: visit.visitNumber,
        opNumber: visit.opNumber,
        visitType: visit.visitType,
        visitAt: visit.visitAt,
        status: visit.status,
      })),
    updatedById: patient.updatedById,
    updatedByName: patient.updatedBy?.fullName ?? null,
  };
}

const detailRelations = {
  contact: true,
  addresses: true,
  identification: true,
  emergencyContact: true,
  visits: true,
  referralDoctor: true,
  registrationSource: true,
  createdBy: true,
  updatedBy: true,
} as const;

function calcAgeYears(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}

export const patientRepository = {
  repo() {
    return AppDataSource.getRepository(Patient);
  },

  async findAll(includeInactive = false): Promise<PatientListView[]> {
    const qb = this.repo()
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('patient.addresses', 'addresses')
      .leftJoinAndSelect('patient.visits', 'visits')
      .leftJoinAndSelect('patient.createdBy', 'createdBy')
      .orderBy('patient.createdAt', 'DESC');

    if (!includeInactive) {
      qb.andWhere('patient.is_active = :active', { active: true });
      qb.andWhere('patient.merged_into_patient_id IS NULL');
    }

    const rows = await qb.getMany();
    return rows.map(toListView);
  },

  async search(input: {
    q?: string;
    mrdNumber?: string;
    mobileNumber?: string;
    visitNumber?: string;
    includeInactive?: boolean;
  }): Promise<PatientListView[]> {
    const qb = this.repo()
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('patient.addresses', 'addresses')
      .leftJoinAndSelect('patient.visits', 'visits')
      .leftJoinAndSelect('patient.createdBy', 'createdBy')
      .orderBy('patient.createdAt', 'DESC')
      .take(100);

    if (!input.includeInactive) {
      qb.andWhere('patient.is_active = :active', { active: true });
      qb.andWhere('patient.merged_into_patient_id IS NULL');
    }

    if (input.mrdNumber) {
      const mrd = `%${input.mrdNumber.replace(/\//g, '-')}%`;
      qb.andWhere(
        new Brackets((where) => where
          .where('patient.mrd_number LIKE :mrd', { mrd })
          .orWhere('EXISTS (SELECT 1 FROM patients merged WHERE merged.merged_into_patient_id = patient.id AND merged.mrd_number LIKE :mrd)', { mrd })),
      );
    }
    if (input.mobileNumber) {
      qb.andWhere('contact.mobile_number LIKE :mobile', {
        mobile: `%${input.mobileNumber}%`,
      });
    }
    if (input.visitNumber) {
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('visits.visit_number LIKE :visit', { visit: `%${input.visitNumber}%` })
            .orWhere('visits.op_number LIKE :visit', { visit: `%${input.visitNumber}%` });
        }),
      );
    }
    if (input.q) {
      const q = `%${input.q.replace(/\//g, '-')}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('patient.mrd_number LIKE :q', { q })
            .orWhere('EXISTS (SELECT 1 FROM patients merged WHERE merged.merged_into_patient_id = patient.id AND merged.mrd_number LIKE :q)', { q })
            .orWhere('patient.first_name LIKE :q', { q })
            .orWhere('patient.middle_name LIKE :q', { q })
            .orWhere('patient.last_name LIKE :q', { q })
            .orWhere('contact.mobile_number LIKE :q', { q })
            .orWhere('visits.visit_number LIKE :q', { q })
            .orWhere('visits.op_number LIKE :q', { q });
        }),
      );
    }

    const rows = await qb.getMany();
    return rows.map(toListView);
  },

  async findById(id: number): Promise<PatientDetailView | null> {
    const row = await this.repo().findOne({
      where: { id },
      relations: detailRelations,
    });
    return row ? toDetailView(row) : null;
  },

  async findEntityById(id: number): Promise<Patient | null> {
    return this.repo().findOne({
      where: { id },
      relations: detailRelations,
    });
  },

  async findDuplicates(input: {
    firstName: string;
    lastName?: string | null;
    mobileNumber: string;
    dateOfBirth?: string | null;
    idProofType?: IdProofType | null;
    idProofNumber?: string | null;
    excludePatientId?: number;
  }): Promise<PatientListView[]> {
    const qb = this.repo()
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('patient.addresses', 'addresses')
      .leftJoinAndSelect('patient.visits', 'visits')
      .leftJoinAndSelect('patient.identification', 'identification')
      .where('patient.is_active = :active', { active: true })
      .andWhere('patient.merged_into_patient_id IS NULL')
      .take(20);

    if (input.excludePatientId) {
      qb.andWhere('patient.id <> :excludeId', { excludeId: input.excludePatientId });
    }

    qb.andWhere(
      new Brackets((where) => {
        where.where('contact.mobile_number = :mobile', { mobile: input.mobileNumber });

        where.orWhere(
          new Brackets((nameWhere) => {
            nameWhere.where('LOWER(patient.first_name) = LOWER(:firstName)', {
              firstName: input.firstName,
            });
            if (input.lastName) {
              nameWhere.andWhere('LOWER(patient.last_name) = LOWER(:lastName)', {
                lastName: input.lastName,
              });
            }
            if (input.dateOfBirth) {
              nameWhere.andWhere('patient.date_of_birth = :dob', {
                dob: input.dateOfBirth,
              });
            }
          }),
        );

        if (input.idProofType && input.idProofNumber) {
          where.orWhere(
            new Brackets((idWhere) => {
              idWhere
                .where('identification.id_proof_type = :idType', {
                  idType: input.idProofType,
                })
                .andWhere('identification.id_proof_number = :idNumber', {
                  idNumber: input.idProofNumber,
                });
            }),
          );
        }
      }),
    );

    const rows = await qb.getMany();
    return rows.map(toListView);
  },

  async createWithDetails(input: {
    title: string | null;
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    gender: PatientGender;
    dateOfBirth: string | null;
    ageYears: number | null;
    ageIsApproximate: boolean;
    bloodGroup: string | null;
    maritalStatus: string | null;
    nationality: string | null;
    religion: string | null;
    photoData: string | null;
    occupation: string | null;
    patientCategory: PatientCategory | null;
    referredBy: string | null;
    registrationSourceId: number | null;
    referralDoctorId: number | null;
    preferredLanguage: string | null;
    specialRemarks: string | null;
    isActive: boolean;
    createdById: number | null;
    createVisit: boolean;
    contact: {
      mobileNumber: string;
      alternateMobile: string | null;
      email: string | null;
    };
    address?: {
      addressLine1: string;
      addressLine2: string | null;
      country: string;
      state: string;
      district: string;
      city: string;
      pincode: string;
    };
    identification?: {
      idProofType: IdProofType | null;
      idProofNumber: string | null;
      idProofDocumentName?: string | null;
      idProofDocumentFileName?: string | null;
      idProofDocumentMimeType?: string | null;
      idProofDocumentData?: string | null;
      abhaNumber: string | null;
      abhaAddress: string | null;
    } | null;
    emergencyContact?: {
      contactPersonName: string | null;
      relationship: EmergencyRelationship | null;
      contactNumber: string | null;
      alternateNumber: string | null;
      address: string | null;
    } | null;
  }): Promise<PatientDetailView> {
    return AppDataSource.transaction(async (manager) => {
      const mrdNumber = await nextSequenceNumber(manager, 'MRD', 'MRD', 4);
      const now = new Date();
      const ageYears =
        input.dateOfBirth && !input.ageIsApproximate
          ? calcAgeYears(input.dateOfBirth)
          : input.ageYears;

      const patient = manager.create(Patient, {
        mrdNumber,
        registrationAt: now,
        title: input.title,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        ageYears,
        ageIsApproximate: input.ageIsApproximate || !input.dateOfBirth,
        bloodGroup: input.bloodGroup,
        maritalStatus: input.maritalStatus,
        nationality: input.nationality,
        religion: input.religion,
        photoData: input.photoData,
        occupation: input.occupation,
        patientCategory: input.patientCategory,
        referredBy: input.referredBy,
        registrationSourceId: input.registrationSourceId,
        referralDoctorId: input.referralDoctorId,
        preferredLanguage: input.preferredLanguage,
        specialRemarks: input.specialRemarks,
        isActive: input.isActive,
        createdById: input.createdById,
        updatedById: input.createdById,
      });
      const saved = await manager.save(patient);

      await manager.save(
        manager.create(PatientContact, {
          patientId: saved.id,
          mobileNumber: input.contact.mobileNumber,
          alternateMobile: input.contact.alternateMobile,
          email: input.contact.email,
        }),
      );

      if (input.address) await manager.save(
        manager.create(PatientAddress, {
          patientId: saved.id,
          addressLine1: input.address.addressLine1,
          addressLine2: input.address.addressLine2,
          country: input.address.country,
          state: input.address.state,
          district: input.address.district,
          city: input.address.city,
          pincode: input.address.pincode,
          isPrimary: true,
        }),
      );

      if (input.identification) {
        await manager.save(
          manager.create(PatientIdentification, {
            patientId: saved.id,
            idProofType: input.identification.idProofType,
            idProofNumber: input.identification.idProofNumber,
            idProofDocumentName: input.identification.idProofDocumentName,
            idProofDocumentFileName: input.identification.idProofDocumentFileName,
            idProofDocumentMimeType: input.identification.idProofDocumentMimeType,
            idProofDocumentData: input.identification.idProofDocumentData,
            abhaNumber: input.identification.abhaNumber,
            abhaAddress: input.identification.abhaAddress,
          }),
        );
      }

      if (input.emergencyContact) {
        await manager.save(
          manager.create(PatientEmergencyContact, {
            patientId: saved.id,
            contactPersonName: input.emergencyContact.contactPersonName,
            relationship: input.emergencyContact.relationship,
            contactNumber: input.emergencyContact.contactNumber,
            alternateNumber: input.emergencyContact.alternateNumber,
            address: input.emergencyContact.address,
          }),
        );
      }

      if (input.createVisit) {
        const visitNumber = await nextSequenceNumber(manager, 'VIS', 'VIS', 6);
        const opNumber = await nextMonthlyNumber(manager, 'OP');
        await manager.save(
          manager.create(PatientVisit, {
            patientId: saved.id,
            visitNumber,
            opNumber,
            visitType: 'OP',
            visitAt: now,
            status: 'registered',
            createdById: input.createdById,
          }),
        );
      }

      await manager.save(
        manager.create(PatientAuditLog, {
          patientId: saved.id,
          action: 'create',
          changedById: input.createdById,
          changeSummary: `Patient registered with ${mrdNumber}`,
          beforeData: null,
          afterData: JSON.stringify({ mrdNumber }),
        }),
      );

      const detail = await manager.getRepository(Patient).findOne({
        where: { id: saved.id },
        relations: detailRelations,
      });
      if (!detail) throw new Error('Patient created but could not be loaded');
      return toDetailView(detail);
    });
  },

  async updateWithDetails(
    id: number,
    input: {
      title?: string | null;
      firstName?: string;
      middleName?: string | null;
      lastName?: string | null;
      gender?: PatientGender;
      dateOfBirth?: string | null;
      ageYears?: number | null;
      ageIsApproximate?: boolean;
      bloodGroup?: string | null;
      maritalStatus?: string | null;
      nationality?: string | null;
      religion?: string | null;
      photoData?: string | null;
      occupation?: string | null;
      patientCategory?: PatientCategory | null;
      referredBy?: string | null;
      registrationSourceId?: number | null;
      referralDoctorId?: number | null;
      preferredLanguage?: string | null;
      specialRemarks?: string | null;
      isActive?: boolean;
      updatedById: number | null;
      contact?: {
        mobileNumber: string;
        alternateMobile: string | null;
        email: string | null;
      };
      address?: {
        addressLine1: string;
        addressLine2: string | null;
        country: string;
        state: string;
        district: string;
        city: string;
        pincode: string;
      };
      identification?: {
        idProofType: IdProofType | null;
        idProofNumber: string | null;
        idProofDocumentName?: string | null;
        idProofDocumentFileName?: string | null;
        idProofDocumentMimeType?: string | null;
        idProofDocumentData?: string | null;
        abhaNumber: string | null;
        abhaAddress: string | null;
      } | null;
      emergencyContact?: {
        contactPersonName: string | null;
        relationship: EmergencyRelationship | null;
        contactNumber: string | null;
        alternateNumber: string | null;
        address: string | null;
      } | null;
    },
  ): Promise<PatientDetailView | null> {
    return AppDataSource.transaction(async (manager) => {
      const patientRepo = manager.getRepository(Patient);
      const existing = await patientRepo
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.contact', 'contact')
        .select([
          'patient.id',
          'patient.firstName',
          'patient.lastName',
          'patient.dateOfBirth',
          'patient.ageYears',
          'patient.ageIsApproximate',
          'patient.isActive',
          'contact.id',
          'contact.mobileNumber',
        ])
        .where('patient.id = :id', { id })
        .getOne();
      if (!existing) return null;

      const beforeSnapshot = {
        firstName: existing.firstName,
        lastName: existing.lastName,
        mobileNumber: existing.contact?.mobileNumber ?? null,
        isActive: existing.isActive,
      };

      const patientPatch: Record<string, unknown> = {
        updatedById: input.updatedById,
      };

      if (input.title !== undefined) patientPatch.title = input.title;
      if (input.firstName !== undefined) patientPatch.firstName = input.firstName;
      if (input.middleName !== undefined) patientPatch.middleName = input.middleName;
      if (input.lastName !== undefined) patientPatch.lastName = input.lastName;
      if (input.gender !== undefined) patientPatch.gender = input.gender;
      if (input.dateOfBirth !== undefined) patientPatch.dateOfBirth = input.dateOfBirth;
      if (input.ageIsApproximate !== undefined) {
        patientPatch.ageIsApproximate = input.ageIsApproximate;
      }
      if (input.dateOfBirth !== undefined && input.dateOfBirth && !input.ageIsApproximate) {
        patientPatch.ageYears = calcAgeYears(input.dateOfBirth);
        patientPatch.ageIsApproximate = false;
      } else if (input.ageYears !== undefined) {
        patientPatch.ageYears = input.ageYears;
      }
      if (input.bloodGroup !== undefined) patientPatch.bloodGroup = input.bloodGroup;
      if (input.maritalStatus !== undefined) patientPatch.maritalStatus = input.maritalStatus;
      if (input.nationality !== undefined) patientPatch.nationality = input.nationality;
      if (input.religion !== undefined) patientPatch.religion = input.religion;
      if (input.photoData !== undefined) patientPatch.photoData = input.photoData;
      if (input.occupation !== undefined) patientPatch.occupation = input.occupation;
      if (input.patientCategory !== undefined) patientPatch.patientCategory = input.patientCategory;
      if (input.referredBy !== undefined) patientPatch.referredBy = input.referredBy;
      if (input.registrationSourceId !== undefined) patientPatch.registrationSourceId = input.registrationSourceId;
      if (input.referralDoctorId !== undefined) {
        patientPatch.referralDoctorId = input.referralDoctorId;
      }
      if (input.preferredLanguage !== undefined) {
        patientPatch.preferredLanguage = input.preferredLanguage;
      }
      if (input.specialRemarks !== undefined) patientPatch.specialRemarks = input.specialRemarks;
      if (input.isActive !== undefined) patientPatch.isActive = input.isActive;

      await patientRepo.update(id, patientPatch);

      if (input.contact) {
        const contactRepo = manager.getRepository(PatientContact);
        const contact = await contactRepo.findOne({ where: { patientId: id } });
        if (!contact) {
          await contactRepo.save(
            contactRepo.create({ patientId: id, ...input.contact }),
          );
        } else {
          await contactRepo.update(contact.id, {
            mobileNumber: input.contact.mobileNumber,
            alternateMobile: input.contact.alternateMobile,
            email: input.contact.email,
          });
        }
      }

      if (input.address) {
        const addressRepo = manager.getRepository(PatientAddress);
        const address = await addressRepo.findOne({
          where: { patientId: id, isPrimary: true },
        });
        if (!address) {
          await addressRepo.save(
            addressRepo.create({
              patientId: id,
              ...input.address,
              isPrimary: true,
            }),
          );
        } else {
          await addressRepo.update(address.id, input.address);
        }
      }

      if (input.identification !== undefined) {
        const idRepo = manager.getRepository(PatientIdentification);
        const identification = await idRepo
          .createQueryBuilder('identification')
          .select(['identification.id', 'identification.patientId'])
          .where('identification.patient_id = :id', { id })
          .getOne();

        if (!input.identification) {
          if (identification) await idRepo.delete(identification.id);
        } else {
          const identificationPatch: Record<string, unknown> = {
            idProofType: input.identification.idProofType,
            idProofNumber: input.identification.idProofNumber,
            abhaNumber: input.identification.abhaNumber,
            abhaAddress: input.identification.abhaAddress,
          };
          if (input.identification.idProofDocumentData !== undefined) {
            identificationPatch.idProofDocumentName =
              input.identification.idProofDocumentName ?? null;
            identificationPatch.idProofDocumentFileName =
              input.identification.idProofDocumentFileName ?? null;
            identificationPatch.idProofDocumentMimeType =
              input.identification.idProofDocumentMimeType ?? null;
            identificationPatch.idProofDocumentData =
              input.identification.idProofDocumentData;
          }

          if (!identification) {
            await idRepo.save(
              idRepo.create({
                patientId: id,
                ...identificationPatch,
              }),
            );
          } else {
            await idRepo.update(identification.id, identificationPatch);
          }
        }
      }

      if (input.emergencyContact !== undefined) {
        const emergencyRepo = manager.getRepository(PatientEmergencyContact);
        const emergency = await emergencyRepo.findOne({ where: { patientId: id } });
        if (!input.emergencyContact) {
          if (emergency) await emergencyRepo.delete(emergency.id);
        } else if (!emergency) {
          await emergencyRepo.save(
            emergencyRepo.create({
              patientId: id,
              ...input.emergencyContact,
            }),
          );
        } else {
          await emergencyRepo.update(emergency.id, input.emergencyContact);
        }
      }

      await manager.save(
        manager.create(PatientAuditLog, {
          patientId: id,
          action: 'update',
          changedById: input.updatedById,
          changeSummary: 'Patient details updated',
          beforeData: JSON.stringify(beforeSnapshot),
          afterData: JSON.stringify({
            firstName: input.firstName ?? existing.firstName,
            lastName: input.lastName ?? existing.lastName,
            mobileNumber: input.contact?.mobileNumber ?? existing.contact?.mobileNumber ?? null,
            isActive: input.isActive ?? existing.isActive,
          }),
        }),
      );

      const detail = await patientRepo.findOne({
        where: { id },
        relations: detailRelations,
      });
      return detail ? toDetailView(detail) : null;
    });
  },

  async softDeactivate(id: number, updatedById: number | null): Promise<boolean> {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).findOne({ where: { id } });
      if (!patient) return false;
      patient.isActive = false;
      patient.updatedById = updatedById;
      await manager.save(patient);
      await manager.save(
        manager.create(PatientAuditLog, {
          patientId: id,
          action: 'deactivate',
          changedById: updatedById,
          changeSummary: 'Patient deactivated (soft delete)',
          beforeData: JSON.stringify({ isActive: true }),
          afterData: JSON.stringify({ isActive: false }),
        }),
      );
      return true;
    });
  },

  async mergePatients(
    sourcePatientId: number,
    targetPatientId: number,
    changedById: number | null,
  ): Promise<PatientDetailView | null> {
    return AppDataSource.transaction(async (manager) => {
      const patientRepo = manager.getRepository(Patient);
      const lockedPatients = await patientRepo
        .createQueryBuilder('patient')
        .where('patient.id IN (:...ids)', { ids: [sourcePatientId, targetPatientId] })
        .orderBy('patient.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      const source = lockedPatients.find((patient) => patient.id === sourcePatientId);
      const target = lockedPatients.find((patient) => patient.id === targetPatientId);
      if (!source || !target) return null;
      if (!source.isActive || source.mergedIntoPatientId) return null;
      if (!target.isActive || target.mergedIntoPatientId) return null;

      const activeAdmissions: Array<{ patientId: number }> = await manager.query(
        "SELECT DISTINCT patient_id AS patientId FROM admissions WHERE patient_id IN (?, ?) AND status <> 'discharged'",
        [sourcePatientId, targetPatientId],
      );
      if (activeAdmissions.length > 1) {
        throw new ConflictError('Both patients have active admissions. Resolve one before merging.');
      }
      const activeEmergencyCases: Array<{ patientId: number }> = await manager.query(
        "SELECT DISTINCT patient_id AS patientId FROM emergency_cases WHERE patient_id IN (?, ?) AND status IN ('waiting', 'in_care')",
        [sourcePatientId, targetPatientId],
      );
      if (activeEmergencyCases.length > 1) {
        throw new ConflictError('Both patients have active emergency cases. Resolve one before merging.');
      }

      source.isActive = false;
      source.mergedIntoPatientId = targetPatientId;
      source.updatedById = changedById;
      await patientRepo.save(source);

      // Keep the source's unique demographic records and audit trail intact. Clinical
      // records must share the surviving patient ID so chart and module queries agree.
      const clinicalTables = [
        'patient_visits', 'patient_documents', 'patient_allergies',
        'patient_medical_history', 'patient_consents', 'patient_communications',
        'appointments', 'clinical_encounters', 'home_medications',
        'prescriptions', 'admissions', 'emergency_cases', 'laboratory_orders',
        'radiology_orders', 'surgery_cases', 'invoices', 'stock_transactions',
        'ambulance_trips',
      ] as const;
      const movedRecords: Record<string, number> = {};
      for (const table of clinicalTables) {
        const result: { affectedRows?: number } = await manager.query(
          `UPDATE \`${table}\` SET patient_id = ? WHERE patient_id = ?`,
          [targetPatientId, sourcePatientId],
        );
        if (result.affectedRows) movedRecords[table] = result.affectedRows;
      }
      const bloodUnits: { affectedRows?: number } = await manager.query(
        'UPDATE `blood_units` SET issued_patient_id = ? WHERE issued_patient_id = ?',
        [targetPatientId, sourcePatientId],
      );
      if (bloodUnits.affectedRows) movedRecords.blood_units = bloodUnits.affectedRows;

      await manager.save(
        manager.create(PatientAuditLog, {
          patientId: targetPatientId,
          action: 'merge',
          changedById,
          changeSummary: `Merged patient ${source.mrdNumber} into ${target.mrdNumber}`,
          beforeData: JSON.stringify({ sourcePatientId, targetPatientId, movedRecords }),
          afterData: JSON.stringify({
            keptMrd: target.mrdNumber,
            mergedMrd: source.mrdNumber,
          }),
        }),
      );

      await manager.save(
        manager.create(PatientAuditLog, {
          patientId: sourcePatientId,
          action: 'merge_source',
          changedById,
          changeSummary: `Merged into ${target.mrdNumber}`,
          beforeData: null,
          afterData: JSON.stringify({ mergedIntoPatientId: targetPatientId }),
        }),
      );

      const detail = await patientRepo.findOne({
        where: { id: targetPatientId },
        relations: detailRelations,
      });
      return detail ? toDetailView(detail) : null;
    });
  },

  async listAuditLogs(patientId: number) {
    const mergedSources = await AppDataSource.getRepository(Patient).find({
      where: { mergedIntoPatientId: patientId },
      select: { id: true, mrdNumber: true },
    });
    const sourceMrdById = new Map(mergedSources.map((source) => [source.id, source.mrdNumber]));
    const rows = await AppDataSource.getRepository(PatientAuditLog).find({
      where: { patientId: In([patientId, ...sourceMrdById.keys()]) },
      relations: { changedBy: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      changeSummary: row.changeSummary,
      changedByName: row.changedBy?.fullName ?? null,
      sourceMrdNumber: sourceMrdById.get(row.patientId) ?? null,
      createdAt: row.createdAt,
    }));
  },
};
