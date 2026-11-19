import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../shared/utils/response.js';
import { vaccinationService as service } from './vaccination.service.js';
import { catalogSchema, idSchema, recordSchema, reportSchema } from './vaccination.validators.js';

const router = Router();
router.use(authenticate);
router.get('/vaccines', authorize('vaccination.view'), asyncHandler(async (_req, res) => sendSuccess(res, await service.catalog())));
router.post('/vaccines', authorize('vaccination.manage'), validate(catalogSchema), asyncHandler(async (req, res) => sendCreated(res, await service.addVaccine(req.body))));
router.get('/records', authorize('vaccination.view'), asyncHandler(async (_req, res) => sendSuccess(res, await service.records())));
router.get('/patients/:id/records', authorize('vaccination.view'), validate(idSchema, 'params'), asyncHandler(async (req, res) => sendSuccess(res, await service.records(Number(req.params.id)))));
router.post('/records', authorize('vaccination.record'), validate(recordSchema), asyncHandler(async (req, res) => sendCreated(res, await service.addRecord(req.body, req.user!.id))));
router.get('/report', authorize('vaccination.view'), validate(reportSchema, 'query'), asyncHandler(async (req, res) => sendSuccess(res, await service.report(req.query))));
export default router;
