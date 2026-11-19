import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { prescriptionService } from '../services/prescription.service.js';

export const prescriptionController = {
  async listMedications(_req: Request, res: Response) { return sendSuccess(res, await prescriptionService.listMedications(), 'Medications fetched'); },
  async pendingDispense(_req: Request, res: Response) { return sendSuccess(res, await prescriptionService.pendingDispense(), 'Pending prescriptions fetched'); },
  async listByPatient(req: Request, res: Response) { return sendSuccess(res, await prescriptionService.listByPatient(Number(req.params.patientId)), 'Prescriptions fetched'); },
  async create(req: Request, res: Response) { return sendCreated(res, await prescriptionService.create(req.body, req.user?.id ?? null), 'Prescription saved'); },
};
