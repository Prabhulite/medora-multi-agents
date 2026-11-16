import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { ambulanceService } from '../services/ambulance.service.js';
import type { TripListQuery } from '../validators/ambulance.validators.js';

export const ambulanceController = {
  async vehicles(_req: Request, res: Response) { return sendSuccess(res, await ambulanceService.vehicles(), 'Ambulances fetched'); },
  async createVehicle(req: Request, res: Response) { return sendCreated(res, await ambulanceService.createVehicle(req.body), 'Ambulance created'); },
  async updateVehicle(req: Request, res: Response) { return sendSuccess(res, await ambulanceService.updateVehicle(Number(req.params.id), req.body), 'Ambulance updated'); },
  async drivers(_req: Request, res: Response) { return sendSuccess(res, await ambulanceService.drivers(), 'Drivers fetched'); },
  async staffCandidates(_req: Request, res: Response) { return sendSuccess(res, await ambulanceService.staffCandidates(), 'Staff fetched'); },
  async registerDriver(req: Request, res: Response) { return sendCreated(res, await ambulanceService.registerDriver(req.body), 'Driver registered'); },
  async updateDriver(req: Request, res: Response) { return sendSuccess(res, await ambulanceService.updateDriver(Number(req.params.id), req.body), 'Driver updated'); },
  async trips(req: Request, res: Response) { return sendSuccess(res, await ambulanceService.trips(req.query as unknown as TripListQuery), 'Trips fetched'); },
  async dispatch(req: Request, res: Response) { return sendCreated(res, await ambulanceService.dispatch(req.body, req.user?.id ?? null), 'Ambulance dispatched'); },
  async status(req: Request, res: Response) { return sendSuccess(res, await ambulanceService.status(Number(req.params.id), req.body, req.user?.id ?? null), 'Trip updated'); },
};
