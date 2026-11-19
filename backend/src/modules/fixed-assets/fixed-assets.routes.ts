import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../shared/utils/response.js';
import { fixedAssetsService as service } from './fixed-assets.service.js';
import { assetIdSchema, assetSchema, maintenanceSchema, updateAssetSchema } from './fixed-assets.validators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize('fixed_assets.view'), asyncHandler(async (_req, res) => sendSuccess(res, await service.list())));
router.get('/:id', authorize('fixed_assets.view'), validate(assetIdSchema, 'params'), asyncHandler(async (req, res) => sendSuccess(res, await service.get(Number(req.params.id)))));
router.post('/', authorize('fixed_assets.manage'), validate(assetSchema), asyncHandler(async (req, res) => sendCreated(res, await service.create(req.body, req.user!.id))));
router.patch('/:id', authorize('fixed_assets.manage'), validate(assetIdSchema, 'params'), validate(updateAssetSchema), asyncHandler(async (req, res) => sendSuccess(res, await service.update(Number(req.params.id), req.body))));
router.post('/:id/maintenance', authorize('fixed_assets.manage'), validate(assetIdSchema, 'params'), validate(maintenanceSchema), asyncHandler(async (req, res) => sendCreated(res, await service.addMaintenance(Number(req.params.id), req.body, req.user!.id))));
export default router;
