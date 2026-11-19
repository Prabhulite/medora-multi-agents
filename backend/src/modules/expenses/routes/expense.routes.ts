import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { expenseController } from '../controllers/expense.controller.js';
import { createExpenseSchema, expenseIdSchema } from '../validators/expense.validators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize('expenses.view'), asyncHandler(expenseController.list));
router.get('/activities', authorize('expenses.view'), asyncHandler(expenseController.activities));
router.post('/', authorize('expenses.manage'), validate(createExpenseSchema), asyncHandler(expenseController.create));
router.delete('/:id', authorize('expenses.manage'), validate(expenseIdSchema, 'params'), asyncHandler(expenseController.remove));
export default router;
