import { Router, type Request } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../shared/utils/response.js';
import { supportTicketService } from './support-ticket.service.js';
import { createTicketSchema, listTicketSchema, respondTicketSchema, ticketIdSchema, updateTicketSchema } from './support-ticket.validators.js';

const router = Router();
router.use(authenticate);
const actor = (req: Request) => req.user!;
router.get('/', validate(listTicketSchema, 'query'), asyncHandler(async (req, res) => sendSuccess(res, await supportTicketService.list(actor(req), req.query as never), 'Tickets fetched')));
router.post('/', validate(createTicketSchema), asyncHandler(async (req, res) => sendCreated(res, await supportTicketService.create(actor(req), req.body), 'Ticket created')));
router.get('/:id', validate(ticketIdSchema, 'params'), asyncHandler(async (req, res) => sendSuccess(res, await supportTicketService.detail(actor(req), Number(req.params.id)), 'Ticket fetched')));
router.patch('/:id/status', authorize('support-tickets.manage'), validate(ticketIdSchema, 'params'), validate(updateTicketSchema), asyncHandler(async (req, res) => sendSuccess(res, await supportTicketService.update(actor(req), Number(req.params.id), req.body), 'Ticket updated')));
router.post('/:id/responses', authorize('support-tickets.manage'), validate(ticketIdSchema, 'params'), validate(respondTicketSchema), asyncHandler(async (req, res) => sendCreated(res, await supportTicketService.respond(actor(req), Number(req.params.id), req.body), 'Response recorded')));
export default router;
