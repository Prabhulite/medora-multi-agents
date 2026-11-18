import { AppDataSource } from '../../../config/data-source.js';
import { env } from '../../../config/env.js';
import { LaboratoryOrder, LaboratoryReportArchive, PatientAuditLog } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';

type LaboratoryArchiveSnapshot = {
  patient: { id: number; mrdNumber: string };
  order: { id: number; orderNumber: string; orderedAt: string; collectedAt: string | null; specimenLabel: string | null };
  test: { id: number; testCode: string; testName: string; category: string | null };
  result: { value: string | null; unit: string | null; referenceRange: string | null };
  release: { releasedAt: string };
};

export const fhirLaboratoryReportService = {
  async read(orderId: number, userId: number | null) {
    const order = await AppDataSource.getRepository(LaboratoryOrder).findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Laboratory order not found');
    if (order.status !== 'completed' || !order.completedAt) throw new ConflictError('Only released laboratory reports can be exported');
    const archive = await AppDataSource.getRepository(LaboratoryReportArchive).findOne({ where: { orderId } });
    if (!archive) throw new ConflictError('Released laboratory report archive is unavailable');
    const snapshot = archive.snapshot as unknown as LaboratoryArchiveSnapshot;
    const baseUrl = env.APP_URL.replace(/\/$/, '');
    const conclusion = [snapshot.result.value, snapshot.result.unit].filter((value): value is string => Boolean(value)).join(' ');
    const resource = {
      resourceType: 'DiagnosticReport',
      id: `laboratory-${order.id}`,
      identifier: [{ system: `${baseUrl}/identifiers/laboratory-order`, value: snapshot.order.orderNumber }],
      status: 'final',
      category: [{ text: 'Laboratory' }],
      code: { coding: [{ system: `${baseUrl}/codes/laboratory-tests`, code: snapshot.test.testCode, display: snapshot.test.testName }], text: snapshot.test.testName },
      subject: { reference: `Patient/${snapshot.patient.id}`, identifier: { system: `${baseUrl}/identifiers/mrd`, value: snapshot.patient.mrdNumber } },
      effectiveDateTime: snapshot.release.releasedAt,
      issued: archive.releasedAt.toISOString(),
      ...(conclusion ? { conclusion } : {}),
      ...(snapshot.result.referenceRange ? { extension: [{ url: `${baseUrl}/fhir/StructureDefinition/laboratory-reference-range`, valueString: snapshot.result.referenceRange }] } : {}),
    };
    await AppDataSource.getRepository(PatientAuditLog).save({
      patientId: order.patientId, action: 'fhir_laboratory_report_exported', changedById: userId,
      changeSummary: `FHIR R4 DiagnosticReport accessed: ${snapshot.order.orderNumber}`, beforeData: null, afterData: JSON.stringify({ orderId, archiveId: archive.id }),
    });
    return resource;
  },
};
