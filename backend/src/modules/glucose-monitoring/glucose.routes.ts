import { Router } from 'express';
import { AppDataSource } from '../../config/data-source.js';
import { GlucoseReading } from '../../database/entities/GlucoseReading.js';
import { Patient } from '../../database/entities/Patient.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../shared/utils/response.js';
import { createGlucoseReading, patientParams } from './glucose.validators.js';

const router = Router();
router.use(authenticate);
async function requirePatient(patientId: number) {
  const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
  if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
}
router.get('/patients/:patientId/readings', authorize('clinical.view'), validate(patientParams, 'params'), asyncHandler(async (req, res) => {
  const patientId = Number(req.params.patientId);
  await requirePatient(patientId);
  const readings = await AppDataSource.getRepository(GlucoseReading).find({ where: { patientId }, relations: { recordedBy: true }, order: { measuredAt: 'DESC', id: 'DESC' }, take: 500 });
  return sendSuccess(res, readings.map(({ recordedBy, ...reading }) => ({ ...reading, valueMgDl: Number(reading.valueMgDl), authorName: recordedBy.fullName })), 'Glucose readings fetched');
}));
router.post('/patients/:patientId/readings', authorize('clinical.create'), validate(patientParams, 'params'), validate(createGlucoseReading), asyncHandler(async (req, res) => {
  const patientId = Number(req.params.patientId);
  const reading = await AppDataSource.transaction(async manager => {
    const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :patientId', { patientId }).getOne();
    if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
    return manager.getRepository(GlucoseReading).save(manager.getRepository(GlucoseReading).create({ patientId, valueMgDl: req.body.valueMgDl, context: req.body.context, measuredAt: new Date(req.body.measuredAt), notes: req.body.notes ?? null, recordedByUserId: req.user!.id }));
  });
  return sendCreated(res, { ...reading, valueMgDl: Number(reading.valueMgDl), authorName: req.user!.fullName }, 'Glucose reading recorded');
}));
export default router;
