import { AppDataSource } from '../../../config/data-source.js';
import { env } from '../../../config/env.js';
import { Patient, PatientAuditLog } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

export const fhirPatientService = {
  async read(patientId: number, userId: number | null) {
    const patient = await AppDataSource.getRepository(Patient).findOne({
      where: { id: patientId },
      relations: { contact: true, addresses: true },
    });
    if (!patient) throw new NotFoundError('Patient not found');

    const given = [patient.firstName, patient.middleName].filter((part): part is string => Boolean(part));
    const telecom = [
      ...(patient.contact?.mobileNumber ? [{ system: 'phone', value: patient.contact.mobileNumber, use: 'mobile' }] : []),
      ...(patient.contact?.email ? [{ system: 'email', value: patient.contact.email }] : []),
    ];
    const addresses = [...(patient.addresses ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)).map((address) => ({
      line: [address.addressLine1, address.addressLine2].filter((line): line is string => Boolean(line)),
      city: address.city,
      district: address.district,
      state: address.state,
      postalCode: address.pincode,
      country: address.country,
    }));
    const resource = {
      resourceType: 'Patient',
      id: String(patient.id),
      identifier: [{ system: `${env.APP_URL.replace(/\/$/, '')}/identifiers/mrd`, value: patient.mrdNumber }],
      active: patient.isActive && !patient.mergedIntoPatientId,
      name: [{ ...(patient.title ? { prefix: [patient.title] } : {}), ...(patient.lastName ? { family: patient.lastName } : {}), given }],
      ...(telecom.length ? { telecom } : {}),
      ...(['male', 'female', 'other'].includes(patient.gender) ? { gender: patient.gender } : {}),
      ...(patient.gender === 'transgender' ? { extension: [{
        url: 'http://hl7.org/fhir/StructureDefinition/patient-genderIdentity',
        valueCodeableConcept: { text: 'Transgender' },
      }] } : {}),
      ...(patient.dateOfBirth ? { birthDate: patient.dateOfBirth } : {}),
      ...(addresses.length ? { address: addresses } : {}),
      ...(patient.mergedIntoPatientId ? { link: [{ other: { reference: `Patient/${patient.mergedIntoPatientId}` }, type: 'replaced-by' }] } : {}),
    };
    await AppDataSource.getRepository(PatientAuditLog).save({
      patientId,
      action: 'fhir_exported',
      changedById: userId,
      changeSummary: 'FHIR R4 Patient resource accessed',
      beforeData: null,
      afterData: null,
    });
    return resource;
  },
  async searchByMrd(mrdNumber: string, userId: number | null) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { mrdNumber }, select: { id: true } });
    if (!patient) return { resourceType: 'Bundle', type: 'searchset', total: 0 };
    const resource = await this.read(patient.id, userId);
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{ fullUrl: `${env.APP_URL.replace(/\/$/, '')}/api/fhir/r4/Patient/${patient.id}`, resource }],
    };
  },
};
