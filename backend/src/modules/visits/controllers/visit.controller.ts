import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { visitService } from '../services/visit.service.js';

export const visitController = {
  async list(req: Request, res: Response) {
    return sendSuccess(
      res,
      await visitService.list({
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
        toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
        doctorId: req.query.doctorId ? Number(req.query.doctorId) : undefined,
        patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as 'inside' | 'done' | 'all')
            : undefined,
      }),
      'Check-in list fetched',
    );
  },

  async patientAppointments(req: Request, res: Response) {
    return sendSuccess(
      res,
      await visitService.patientAppointments(Number(req.params.patientId)),
      'Patient appointments fetched',
    );
  },

  async checkin(req: Request, res: Response) {
    return sendCreated(
      res,
      await visitService.checkin(req.body, req.user?.id ?? null),
      'Patient checked in',
    );
  },

  async checkout(req: Request, res: Response) {
    return sendSuccess(
      res,
      await visitService.checkout(Number(req.params.id), req.user?.id ?? null),
      'Patient checked out',
    );
  },
};
