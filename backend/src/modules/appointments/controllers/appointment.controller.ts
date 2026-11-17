import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { appointmentService } from '../services/appointment.service.js';
import type { AppointmentStatus } from '../../../database/entities/index.js';

export const appointmentController = {
  async list(req: Request, res: Response) {
    return sendSuccess(
      res,
      await appointmentService.list({
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
        toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
        doctorId: req.query.doctorId ? Number(req.query.doctorId) : undefined,
        patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as AppointmentStatus)
            : undefined,
      }),
      'Appointments fetched',
    );
  },

  async getById(req: Request, res: Response) {
    return sendSuccess(
      res,
      await appointmentService.getById(Number(req.params.id)),
      'Appointment fetched',
    );
  },

  async availableDoctors(req: Request, res: Response) {
    return sendSuccess(
      res,
      await appointmentService.availableDoctors(
        String(req.query.date),
        req.query.departmentId ? Number(req.query.departmentId) : undefined,
      ),
      'Available doctors fetched',
    );
  },

  async slots(req: Request, res: Response) {
    return sendSuccess(
      res,
      await appointmentService.getSlots(
        Number(req.query.doctorId),
        String(req.query.date),
        req.query.excludeAppointmentId ? Number(req.query.excludeAppointmentId) : undefined,
      ),
      'Appointment slots fetched',
    );
  },

  async create(req: Request, res: Response) {
    return sendCreated(
      res,
      await appointmentService.create(req.body, req.user?.id ?? null),
      'Appointment booked',
    );
  },

  async updateStatus(req: Request, res: Response) {
    return sendSuccess(
      res,
      await appointmentService.updateStatus(Number(req.params.id), req.body, req.user?.id ?? null),
      'Appointment status updated',
    );
  },
};
