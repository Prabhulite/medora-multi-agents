import { RegistrationSource, type IdProofType } from '../../../database/entities/index.js';
import { AppDataSource } from '../../../config/data-source.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { doctorRepository } from '../../doctors/repositories/doctor.repository.js';
import { patientRepository } from '../repositories/patient.repository.js';
import type {
  CreatePatientInput,
  DuplicateCheckInput,
  MergePatientInput,
  UpdatePatientInput,
} from '../validators/patient.validators.js';

type IdentificationPatch = {
  idProofType: IdProofType | null;
  idProofNumber: string | null;
  abhaNumber: string | null;
  abhaAddress: string | null;
  idProofDocumentName?: string | null;
  idProofDocumentFileName?: string | null;
  idProofDocumentMimeType?: string | null;
  idProofDocumentData?: string | null;
};

function normalizeIdentification(
  identification: CreatePatientInput['identification'] | UpdatePatientInput['identification'],
  options?: { requireDocumentPayload?: boolean },
): IdentificationPatch | null | undefined {
  if (identification === undefined) return undefined;
  if (identification === null) return null;

  const document = identification.idProofDocument;
  const base: IdentificationPatch = {
    idProofType: identification.idProofType ?? null,
    idProofNumber: identification.idProofNumber ?? null,
    abhaNumber: identification.abhaNumber ?? null,
    abhaAddress: identification.abhaAddress ?? null,
  };

  if (document) {
    return {
      ...base,
      idProofDocumentName: document.name ?? null,
      idProofDocumentFileName: document.fileName ?? null,
      idProofDocumentMimeType: document.mimeType ?? null,
      idProofDocumentData: document.fileData,
    };
  }

  if (options?.requireDocumentPayload) {
    return {
      ...base,
      idProofDocumentName: null,
      idProofDocumentFileName: null,
      idProofDocumentMimeType: null,
      idProofDocumentData: null,
    };
  }

  return base;
}

async function assertReferralDoctor(referralDoctorId?: number | null) {
  if (referralDoctorId == null) return;
  const doctor = await doctorRepository.findById(referralDoctorId);
  if (!doctor || !doctor.isActive) {
    throw new ValidationError('Referral doctor is invalid or inactive');
  }
}

async function assertRegistrationSource(sourceId?: number | null) {
  if (sourceId == null) return;
  const source = await AppDataSource.getRepository(RegistrationSource).findOne({ where: { id: sourceId, isActive: true } });
  if (!source) throw new ValidationError('Registration source is invalid or inactive');
}

export const patientService = {
  list(includeInactive = false) {
    return patientRepository.findAll(includeInactive);
  },

  search(query: {
    q?: string;
    mrdNumber?: string;
    mobileNumber?: string;
    visitNumber?: string;
    includeInactive?: boolean;
  }) {
    return patientRepository.search(query);
  },

  async getById(id: number) {
    const patient = await patientRepository.findById(id);
    if (!patient) throw new NotFoundError('Patient not found');
    return patient;
  },

  checkDuplicates(input: DuplicateCheckInput) {
    return patientRepository.findDuplicates({
      firstName: input.firstName.trim(),
      lastName: input.lastName ?? null,
      mobileNumber: input.mobileNumber.trim(),
      dateOfBirth: input.dateOfBirth ?? null,
      idProofType: input.idProofType ?? null,
      idProofNumber: input.idProofNumber ?? null,
      excludePatientId: input.excludePatientId,
    });
  },

  async create(input: CreatePatientInput, userId: number | null) {
    await assertReferralDoctor(input.referralDoctorId ?? null);
    await assertRegistrationSource(input.registrationSourceId ?? null);

    return patientRepository.createWithDetails({
      title: input.title ?? null,
      firstName: input.firstName.trim(),
      middleName: input.middleName ?? null,
      lastName: input.lastName ?? null,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth ?? null,
      ageYears: input.ageYears ?? null,
      ageIsApproximate: Boolean(input.ageIsApproximate) || !input.dateOfBirth,
      bloodGroup: input.bloodGroup ?? null,
      maritalStatus: input.maritalStatus ?? null,
      nationality: input.nationality ?? null,
      religion: input.religion ?? null,
      photoData: input.photoData ?? null,
      occupation: input.occupation ?? null,
      patientCategory: input.patientCategory ?? null,
      referredBy: input.referredBy ?? null,
      registrationSourceId: input.registrationSourceId ?? null,
      referralDoctorId: input.referralDoctorId ?? null,
      preferredLanguage: input.preferredLanguage ?? null,
      specialRemarks: input.specialRemarks ?? null,
      isActive: input.isActive ?? true,
      createdById: userId,
      createVisit: input.createVisit ?? true,
      contact: {
        mobileNumber: input.contact.mobileNumber.trim(),
        alternateMobile: input.contact.alternateMobile ?? null,
        email: input.contact.email ?? null,
      },
      address: input.address ? {
        addressLine1: input.address.addressLine1.trim(),
        addressLine2: input.address.addressLine2 ?? null,
        country: input.address.country.trim(),
        state: input.address.state.trim(),
        district: input.address.district.trim(),
        city: input.address.city.trim(),
        pincode: input.address.pincode.trim(),
      } : undefined,
      identification:
        normalizeIdentification(input.identification, { requireDocumentPayload: true }) ?? null,
      emergencyContact: input.emergencyContact
        ? {
            contactPersonName: input.emergencyContact.contactPersonName ?? null,
            relationship: input.emergencyContact.relationship ?? null,
            contactNumber: input.emergencyContact.contactNumber ?? null,
            alternateNumber: input.emergencyContact.alternateNumber ?? null,
            address: input.emergencyContact.address ?? null,
          }
        : null,
    });
  },

  async update(id: number, input: UpdatePatientInput, userId: number | null) {
    const existing = await patientRepository.findById(id);
    if (!existing) throw new NotFoundError('Patient not found');
    if (existing.mergedIntoPatientId) {
      throw new ValidationError('Merged patient records cannot be edited');
    }

    if (input.referralDoctorId !== undefined) {
      await assertReferralDoctor(input.referralDoctorId);
    }
    if (input.registrationSourceId !== undefined && input.registrationSourceId !== existing.registrationSourceId) {
      await assertRegistrationSource(input.registrationSourceId);
    }

    const updated = await patientRepository.updateWithDetails(id, {
      title: input.title,
      firstName: input.firstName?.trim(),
      middleName: input.middleName,
      lastName: input.lastName,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      ageYears: input.ageYears,
      ageIsApproximate: input.ageIsApproximate,
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
      updatedById: userId,
      contact: input.contact
        ? {
            mobileNumber: input.contact.mobileNumber.trim(),
            alternateMobile: input.contact.alternateMobile ?? null,
            email: input.contact.email ?? null,
          }
        : undefined,
      address: input.address
        ? {
            addressLine1: input.address.addressLine1.trim(),
            addressLine2: input.address.addressLine2 ?? null,
            country: input.address.country.trim(),
            state: input.address.state.trim(),
            district: input.address.district.trim(),
            city: input.address.city.trim(),
            pincode: input.address.pincode.trim(),
          }
        : undefined,
      identification: normalizeIdentification(input.identification),
      emergencyContact:
        input.emergencyContact === undefined
          ? undefined
          : input.emergencyContact
            ? {
                contactPersonName: input.emergencyContact.contactPersonName ?? null,
                relationship: input.emergencyContact.relationship ?? null,
                contactNumber: input.emergencyContact.contactNumber ?? null,
                alternateNumber: input.emergencyContact.alternateNumber ?? null,
                address: input.emergencyContact.address ?? null,
              }
            : null,
    });

    if (!updated) throw new NotFoundError('Patient not found');
    return updated;
  },

  async remove(id: number, userId: number | null) {
    const existing = await patientRepository.findById(id);
    if (!existing) throw new NotFoundError('Patient not found');
    const deleted = await patientRepository.softDeactivate(id, userId);
    if (!deleted) throw new NotFoundError('Patient not found');
  },

  async merge(input: MergePatientInput, userId: number | null) {
    const merged = await patientRepository.mergePatients(
      input.sourcePatientId,
      input.targetPatientId,
      userId,
    );
    if (!merged) {
      throw new ValidationError('Unable to merge patients. Check both records are active.');
    }
    return merged;
  },

  async auditLogs(id: number) {
    const existing = await patientRepository.findById(id);
    if (!existing) throw new NotFoundError('Patient not found');
    return patientRepository.listAuditLogs(id);
  },
};
