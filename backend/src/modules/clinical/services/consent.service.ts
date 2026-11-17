import { AppDataSource } from '../../../config/data-source.js';
import { Patient, PatientAuditLog, PatientConsent } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { CreateConsentInput } from '../validators/clinical.validators.js';

function publicConsent(record: PatientConsent) {
  const { fileData: _fileData, ...fields } = record;
  return fields;
}

function validateSignedCopy(input: CreateConsentInput) {
  const prefix = `data:${input.mimeType};base64,`;
  if (!input.fileData.startsWith(prefix)) throw new ValidationError('Signed copy must match the selected PDF or image type');
  const encoded = input.fileData.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new ValidationError('Signed copy is invalid');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 1_000_000) throw new ValidationError('Signed copy must be under 1 MB');
  const isPdf = bytes.subarray(0, 5).toString() === '%PDF-';
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!({ 'application/pdf': isPdf, 'image/png': isPng, 'image/jpeg': isJpeg }[input.mimeType])) throw new ValidationError('Signed copy contents do not match its file type');
  const signedAt = new Date(input.signedAt);
  if (signedAt.getTime() > Date.now() + 5 * 60_000) throw new ValidationError('Signature time cannot be in the future');
  return signedAt;
}

export const consentService = {
  async list(patientId: number) {
    if (!await AppDataSource.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
    const records = await AppDataSource.getRepository(PatientConsent).find({ where: { patientId }, order: { createdAt: 'DESC' } });
    return records.map(publicConsent);
  },
  async create(patientId: number, input: CreateConsentInput, userId: number | null) {
    const signedAt = validateSignedCopy(input);
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :patientId', { patientId }).getOne();
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      const record = await manager.getRepository(PatientConsent).save(manager.getRepository(PatientConsent).create({ ...input, patientId, signedAt, treatingDoctorName: input.treatingDoctorName ?? null, doctorRegistrationNumber: input.doctorRegistrationNumber ?? null, admissionDate: input.admissionDate ?? null, status: 'active', recordedById: userId, revokedAt: null, revokedById: null, revocationReason: null }));
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'consent_recorded', changedById: userId, changeSummary: `Signed consent recorded: ${record.subject}`, beforeData: null, afterData: JSON.stringify({ id: record.id, consentType: record.consentType, subject: record.subject, signatoryName: record.signatoryName, signedAt: record.signedAt, fileName: record.fileName }) }));
      return publicConsent(record);
    });
  },
  async document(patientId: number, consentId: number) {
    const record = await AppDataSource.getRepository(PatientConsent).findOne({ where: { id: consentId, patientId } });
    if (!record) throw new NotFoundError('Consent record not found');
    return { fileName: record.fileName, mimeType: record.mimeType, fileData: record.fileData };
  },
  async revoke(patientId: number, consentId: number, reason: string, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const record = await manager.getRepository(PatientConsent).createQueryBuilder('consent').setLock('pessimistic_write').where('consent.id = :id AND consent.patient_id = :patientId', { id: consentId, patientId }).getOne();
      if (!record) throw new NotFoundError('Consent record not found');
      if (record.status === 'revoked') throw new ConflictError('Consent is already revoked');
      record.status = 'revoked'; record.revokedAt = new Date(); record.revokedById = userId; record.revocationReason = reason;
      await manager.getRepository(PatientConsent).save(record);
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'consent_revoked', changedById: userId, changeSummary: `Consent revoked: ${record.subject}`, beforeData: JSON.stringify({ id: record.id, status: 'active' }), afterData: JSON.stringify({ id: record.id, status: 'revoked', reason }) }));
      return publicConsent(record);
    });
  },
};
