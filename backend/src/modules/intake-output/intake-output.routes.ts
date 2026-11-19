import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../../config/data-source.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { sendCreated, sendSuccess } from '../../shared/utils/response.js'
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js'

const router = Router()
router.use(authenticate)
const params = z.object({ admissionId: z.coerce.number().int().positive() })
const entry = z.object({
  kind: z.enum(['intake', 'output']),
  category: z.string().trim().min(2).max(60),
  amountMl: z.number().positive().max(100000),
  observedAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(500).nullable().optional(),
})

async function findAdmission(id: number) {
  const [row] = await AppDataSource.query('SELECT id, status, admitted_at AS admittedAt FROM admissions WHERE id = ?', [id]) as Array<{ id: number; status: string; admittedAt: Date }>
  if (!row) throw new NotFoundError('Admission not found')
  return row
}

router.get('/admissions/:admissionId/intake-output', authorize('inpatient.view'), validate(params, 'params'), asyncHandler(async (req, res) => {
  const admissionId = Number(req.params.admissionId)
  await findAdmission(admissionId)
  const rows = await AppDataSource.query(`SELECT io.id, io.admission_id AS admissionId, io.kind, io.category,
    io.amount_ml AS amountMl, io.observed_at AS observedAt, io.notes, io.created_at AS createdAt,
    u.full_name AS recordedBy FROM admission_intake_output io
    LEFT JOIN users u ON u.id = io.recorded_by_id
    WHERE io.admission_id = ? ORDER BY io.observed_at DESC, io.id DESC LIMIT 500`, [admissionId])
  return sendSuccess(res, rows, 'Intake and output records fetched')
}))

router.post('/admissions/:admissionId/intake-output', authorize('inpatient.update'), validate(params, 'params'), validate(entry), asyncHandler(async (req, res) => {
  const admissionId = Number(req.params.admissionId)
  const admission = await findAdmission(admissionId)
  if (!['admitted', 'transferred'].includes(admission.status)) throw new ValidationError('Intake and output can only be recorded during an active admission')
  const observedAt = new Date(req.body.observedAt)
  if (observedAt.getTime() > Date.now() + 5 * 60_000) throw new ValidationError('Observation time cannot be in the future')
  if (observedAt.getTime() < new Date(admission.admittedAt).getTime()) throw new ValidationError('Observation time must be after admission')
  const result = await AppDataSource.query('INSERT INTO admission_intake_output (admission_id, kind, category, amount_ml, observed_at, notes, recorded_by_id) VALUES (?,?,?,?,?,?,?)', [admissionId, req.body.kind, req.body.category, req.body.amountMl, observedAt, req.body.notes ?? null, req.user?.id ?? null]) as { insertId: number }
  const [saved] = await AppDataSource.query('SELECT id, admission_id AS admissionId, kind, category, amount_ml AS amountMl, observed_at AS observedAt, notes, created_at AS createdAt FROM admission_intake_output WHERE id = ?', [result.insertId])
  return sendCreated(res, saved, 'Intake or output recorded')
}))

export default router
