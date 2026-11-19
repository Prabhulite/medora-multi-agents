import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { AppDataSource } from '../../config/data-source.js';

const schema = z.object({
  appointmentEnabled: z.boolean(),
  appointmentHours: z.number().int().min(1).max(168),
  prescriptionEnabled: z.boolean(),
  prescriptionDays: z.number().int().min(1).max(30),
}).strict();

export const automationRoutes = Router();
automationRoutes.use(authenticate);
automationRoutes.get('/settings', asyncHandler(async (req, res) => {
  const rows = await AppDataSource.query('SELECT appointment_enabled AS appointmentEnabled, appointment_hours AS appointmentHours, prescription_enabled AS prescriptionEnabled, prescription_days AS prescriptionDays FROM automation_settings WHERE recipient_id = ?', [req.user!.id]);
  const row = rows[0];
  res.json({ success: true, data: row ? { appointmentEnabled: Boolean(row.appointmentEnabled), appointmentHours: row.appointmentHours, prescriptionEnabled: Boolean(row.prescriptionEnabled), prescriptionDays: row.prescriptionDays } : { appointmentEnabled: false, appointmentHours: 24, prescriptionEnabled: false, prescriptionDays: 3 } });
}));
automationRoutes.put('/settings', asyncHandler(async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: 'Invalid automation settings' }); return; }
  const value = parsed.data;
  await AppDataSource.query('INSERT INTO automation_settings (recipient_id, appointment_enabled, appointment_hours, prescription_enabled, prescription_days) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE appointment_enabled = VALUES(appointment_enabled), appointment_hours = VALUES(appointment_hours), prescription_enabled = VALUES(prescription_enabled), prescription_days = VALUES(prescription_days)', [req.user!.id, value.appointmentEnabled, value.appointmentHours, value.prescriptionEnabled, value.prescriptionDays]);
  res.json({ success: true, data: value });
}));
