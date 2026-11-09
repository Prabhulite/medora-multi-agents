import { hospitalProfileRepository } from '../repositories/hospital-profile.repository.js';
import type { UpsertHospitalProfileInput } from '../validators/hospital-profile.validators.js';

export const hospitalProfileService = {
  async get() {
    return hospitalProfileRepository.findCurrent();
  },

  async upsert(input: UpsertHospitalProfileInput) {
    return hospitalProfileRepository.upsert({
      hospitalName: input.hospitalName.trim(),
      hospitalCode: input.hospitalCode.trim().toUpperCase(),
      hospitalType: input.hospitalType ?? null,
      registrationNumber: input.registrationNumber ?? null,
      gstNumber: input.gstNumber ?? null,
      contactNumber: input.contactNumber ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      country: input.country ?? null,
      state: input.state ?? null,
      district: input.district ?? null,
      city: input.city ?? null,
      pincode: input.pincode ?? null,
      logoData: input.logoData ?? null,
      website: input.website ?? null,
      timeZone: input.timeZone ?? null,
      currency: input.currency ?? 'INR',
      dateFormat: input.dateFormat ?? null,
      financialYear: input.financialYear ?? null,
      documents: input.documents?.map((document) => ({
        name: document.name.trim(),
        fileName: document.fileName.trim(),
        mimeType: document.mimeType ?? null,
        fileData: document.fileData,
      })),
    });
  },
};
