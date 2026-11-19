import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../config/data-source.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../shared/utils/response.js';

const router = Router();
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const listSchema = z.object({ beforeId: z.coerce.number().int().positive().optional(), afterId: z.coerce.number().int().nonnegative().optional() });
const bodySchema = z.object({ body: z.string().trim().min(1).max(4000) });
router.use(authenticate);

router.get('/staff', asyncHandler(async (req, res) => {
  const rows = await AppDataSource.query('SELECT id, full_name AS fullName, designation FROM users WHERE is_active = 1 AND id <> ? ORDER BY full_name, id LIMIT 500', [req.user!.id]);
  return sendSuccess(res, rows);
}));

router.get('/:id/messages', validate(idSchema, 'params'), validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const peerId = Number(req.params.id);
  if (peerId === req.user!.id) throw new ValidationError('Choose another staff member');
  const peer = await AppDataSource.query('SELECT id FROM users WHERE id = ? AND is_active = 1', [peerId]);
  if (!peer.length) throw new NotFoundError('Staff member not found');
  const beforeId = req.query.beforeId ? Number(req.query.beforeId) : null;
  const afterId = req.query.afterId ? Number(req.query.afterId) : null;
  if (beforeId !== null && afterId !== null) throw new ValidationError('Use beforeId or afterId');
  const cursor = beforeId ?? afterId;
  const rows = await AppDataSource.query(`SELECT m.id, m.sender_id AS senderId, m.recipient_id AS recipientId, m.body, m.created_at AS createdAt FROM staff_chat_messages m WHERE ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)) ${cursor === null ? '' : `AND m.id ${beforeId !== null ? '<' : '>'} ?`} ORDER BY m.id ${afterId !== null ? 'ASC' : 'DESC'} LIMIT 50`, cursor === null ? [req.user!.id, peerId, peerId, req.user!.id] : [req.user!.id, peerId, peerId, req.user!.id, cursor]);
  return sendSuccess(res, { items: afterId !== null ? rows : rows.reverse(), hasMore: beforeId === null && afterId === null ? rows.length === 50 : beforeId !== null && rows.length === 50 });
}));

router.post('/:id/messages', validate(idSchema, 'params'), validate(bodySchema), asyncHandler(async (req, res) => {
  const peerId = Number(req.params.id);
  if (peerId === req.user!.id) throw new ValidationError('Choose another staff member');
  const result = await AppDataSource.query('INSERT INTO staff_chat_messages (sender_id, recipient_id, body) SELECT ?, id, ? FROM users WHERE id = ? AND is_active = 1', [req.user!.id, req.body.body, peerId]);
  if (!result.affectedRows) throw new NotFoundError('Staff member not found');
  const rows = await AppDataSource.query('SELECT id, sender_id AS senderId, recipient_id AS recipientId, body, created_at AS createdAt FROM staff_chat_messages WHERE id = ?', [result.insertId]);
  return sendSuccess(res, rows[0], 'Message sent', 201);
}));

export default router;
