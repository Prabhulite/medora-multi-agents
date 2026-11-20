import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../../config/data-source.js';
import { Patient, PatientDocument } from '../../../database/entities/index.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

const router = Router();
const params = z.object({ patientId: z.coerce.number().int().positive(), documentId: z.coerce.number().int().positive().optional() });
const upload = z.object({
  name: z.string().trim().min(2).max(160),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  fileData: z.string().regex(/^data:(application\/pdf|image\/jpeg|image\/png);base64,[A-Za-z0-9+/]+={0,2}$/).max(1_500_000),
}).refine((value) => value.fileData.startsWith(`data:${value.mimeType};base64,`), { message: 'File type does not match the uploaded data' });

async function ensurePatient(patientId: number) {
  if (!await AppDataSource.getRepository(Patient).exist({ where: { id: patientId } })) throw new NotFoundError('Patient not found');
}

router.use(authenticate);
router.get('/:patientId/documents', authorize('patients.view'), validate(params, 'params'), asyncHandler(async (req, res) => {
  const patientId = Number(req.params.patientId);
  await ensurePatient(patientId);
  const rows = await AppDataSource.getRepository(PatientDocument).find({ where: { patientId }, order: { createdAt: 'DESC' }, select: { id: true, patientId: true, name: true, fileName: true, mimeType: true, createdAt: true } });
  return sendSuccess(res, rows);
}));
router.get('/:patientId/documents/:documentId', authorize('patients.view'), validate(params, 'params'), asyncHandler(async (req, res) => {
  const row = await AppDataSource.getRepository(PatientDocument).findOneBy({ id: Number(req.params.documentId), patientId: Number(req.params.patientId) });
  if (!row) throw new NotFoundError('Document not found');
  return sendSuccess(res, { id: row.id, fileName: row.fileName, mimeType: row.mimeType, fileData: row.fileData });
}));
router.post('/:patientId/documents', authorizeAny('patients.update', 'clinical.create'), validate(params, 'params'), validate(upload), asyncHandler(async (req, res) => {
  const patientId = Number(req.params.patientId);
  await ensurePatient(patientId);
  const body = upload.parse(req.body);
  const repo = AppDataSource.getRepository(PatientDocument);
  const row = await repo.save(repo.create({ patientId, name: body.name, fileName: body.fileName, mimeType: body.mimeType, fileData: body.fileData }));
  return sendCreated(res, { id: row.id, patientId, name: row.name, fileName: row.fileName, mimeType: row.mimeType, createdAt: row.createdAt });
}));
router.delete('/:patientId/documents/:documentId', authorizeAny('patients.update', 'clinical.create'), validate(params, 'params'), asyncHandler(async (req, res) => {
  const result = await AppDataSource.getRepository(PatientDocument).delete({ id: Number(req.params.documentId), patientId: Number(req.params.patientId) });
  if (!result.affected) throw new NotFoundError('Document not found');
  return sendSuccess(res, { deleted: true });
}));
export default router;
