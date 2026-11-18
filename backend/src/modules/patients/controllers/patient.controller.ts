import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { patientService } from '../services/patient.service.js';
import { communicationService } from '../services/communication.service.js';

export const patientController = {
  async registrationSources(_req: Request, res: Response) {
    return sendSuccess(res, await patientService.registrationSources(), 'Registration sources fetched');
  },
  async followUps(req: Request, res: Response) {
    return sendSuccess(res, await communicationService.followUps(req.query.status === 'overdue' ? 'overdue' : 'open'), 'Patient follow-ups fetched');
  },
  async completeFollowUp(req: Request, res: Response) {
    return sendSuccess(res, await communicationService.completeFollowUp(Number(req.params.id), Number(req.params.communicationId), req.body.note, req.user?.id ?? null), 'Follow-up completed');
  },
  async communications(req: Request, res: Response) {
    return sendSuccess(res, await communicationService.list(Number(req.params.id)), 'Patient communications fetched');
  },
  async recordCommunication(req: Request, res: Response) {
    return sendCreated(res, await communicationService.create(Number(req.params.id), req.body, req.user?.id ?? null), 'Patient communication recorded');
  },
  async list(req: Request, res: Response) {
    const includeInactive = String(req.query.includeInactive || '') === 'true';
    return sendSuccess(res, await patientService.list(includeInactive), 'Patients fetched');
  },

  async search(req: Request, res: Response) {
    return sendSuccess(
      res,
      await patientService.search({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        mrdNumber: typeof req.query.mrdNumber === 'string' ? req.query.mrdNumber : undefined,
        mobileNumber:
          typeof req.query.mobileNumber === 'string' ? req.query.mobileNumber : undefined,
        visitNumber:
          typeof req.query.visitNumber === 'string' ? req.query.visitNumber : undefined,
        includeInactive: String(req.query.includeInactive || '') === 'true',
      }),
      'Patients searched',
    );
  },

  async getById(req: Request, res: Response) {
    return sendSuccess(
      res,
      await patientService.getById(Number(req.params.id)),
      'Patient fetched',
    );
  },

  async checkDuplicates(req: Request, res: Response) {
    return sendSuccess(
      res,
      await patientService.checkDuplicates(req.body),
      'Duplicate check completed',
    );
  },

  async create(req: Request, res: Response) {
    return sendCreated(
      res,
      await patientService.create(req.body, req.user?.id ?? null),
      'Patient registered',
    );
  },

  async update(req: Request, res: Response) {
    return sendSuccess(
      res,
      await patientService.update(Number(req.params.id), req.body, req.user?.id ?? null),
      'Patient updated',
    );
  },

  async remove(req: Request, res: Response) {
    await patientService.remove(Number(req.params.id), req.user?.id ?? null);
    return sendSuccess(res, null, 'Patient deactivated');
  },

  async merge(req: Request, res: Response) {
    return sendSuccess(
      res,
      await patientService.merge(req.body, req.user?.id ?? null),
      'Patients merged',
    );
  },

  async auditLogs(req: Request, res: Response) {
    return sendSuccess(
      res,
      await patientService.auditLogs(Number(req.params.id)),
      'Patient audit logs fetched',
    );
  },
};
