import { Router } from 'express'; import { authenticate } from '../../../middleware/authenticate.js'; import { authorize } from '../../../middleware/authorize.js'; import { validate } from '../../../middleware/validate.js'; import { asyncHandler } from '../../../shared/utils/asyncHandler.js'; import { operationsController } from '../controllers/operations.controller.js'; import { dashboardQuerySchema } from '../validators/operations.validators.js';
import { z } from 'zod';
import { AppDataSource } from '../../../config/data-source.js';

const activityRange = z.object({ from: z.iso.date(), to: z.iso.date() }).refine(
  ({ from, to }) => from <= to && Date.parse(to) - Date.parse(from) <= 366 * 86400000,
  'Select an ordered date range of at most 366 days',
);

const router = Router();
router.use(authenticate);
router.get('/dashboard', authorize('operations.view'), validate(dashboardQuerySchema, 'query'), asyncHandler(operationsController.dashboard));
router.get('/dashboard.csv', authorize('operations.view'), validate(dashboardQuerySchema, 'query'), asyncHandler(operationsController.dashboardCsv));
router.get('/activity', authorize('operations.view'), asyncHandler(async (req, res) => {
  const { from, to } = activityRange.parse(req.query);
  const [consultations, pharmacy] = await Promise.all([
    AppDataSource.query(`SELECT DATE_FORMAT(e.created_at, '%Y-%m-%d') AS day,
      COALESCE(d.name, 'Unassigned') AS doctor, e.status, COUNT(*) AS total
      FROM clinical_encounters e LEFT JOIN doctor_master d ON d.id = e.doctor_id
      WHERE e.encounter_type = 'consultation' AND e.created_at >= ? AND e.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY day, e.doctor_id, d.name, e.status ORDER BY day DESC, doctor, e.status`, [from, to]),
    AppDataSource.query(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, type,
      COUNT(*) AS total, SUM(ABS(quantity)) AS units
      FROM stock_transactions WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY day, type ORDER BY day DESC, type`, [from, to]),
  ]);
  res.json({ success: true, data: { consultations, pharmacy } });
}));
export default router;
