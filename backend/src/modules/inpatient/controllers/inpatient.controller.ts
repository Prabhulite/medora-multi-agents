import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { inpatientService } from '../services/inpatient.service.js';

export const inpatientController = {
  async carePlans(req: Request, res: Response) { return sendSuccess(res, await inpatientService.carePlans(Number(req.params.id)), 'Care plans fetched'); },
  async addCarePlan(req: Request, res: Response) { return sendCreated(res, await inpatientService.addCarePlan(Number(req.params.id), req.body, req.user?.id ?? null), 'Care plan created'); },
  async closeCarePlan(req: Request, res: Response) { return sendSuccess(res, await inpatientService.closeCarePlan(Number(req.params.id), Number(req.params.planId), req.body, req.user?.id ?? null), 'Care plan closed'); },
  async medicationOrders(req: Request, res: Response) { return sendSuccess(res, await inpatientService.medicationOrders(Number(req.params.id)), 'Medication orders fetched'); },
  async dischargeMedicationReview(req: Request, res: Response) { return sendSuccess(res, await inpatientService.dischargeMedicationReview(Number(req.params.id)), 'Discharge medication review fetched'); },
  async admissionMedicationReview(req: Request, res: Response) { return sendSuccess(res, await inpatientService.admissionMedicationReview(Number(req.params.id)), 'Admission medication review fetched'); },
  async recordAdmissionMedicationReview(req: Request, res: Response) { return sendCreated(res, await inpatientService.recordAdmissionMedicationReview(Number(req.params.id), req.body, req.user?.id ?? null), 'Admission medication review recorded'); },
  async medicationAdministrations(req: Request, res: Response) { return sendSuccess(res, await inpatientService.medicationAdministrations(Number(req.params.id)), 'Medication administrations fetched'); },
  async addMedicationAdministration(req: Request, res: Response) { return sendCreated(res, await inpatientService.addMedicationAdministration(Number(req.params.id), req.body, req.user?.id ?? null), 'Medication administration recorded'); },
  async transfers(req: Request, res: Response) { return sendSuccess(res, await inpatientService.transfers(Number(req.params.id)), 'Transfers fetched'); },
  async transfer(req: Request, res: Response) { return sendCreated(res, await inpatientService.transfer(Number(req.params.id), req.body, req.user?.id ?? null), 'Bed transferred'); },
  async observations(req: Request, res: Response) { return sendSuccess(res, await inpatientService.observations(Number(req.params.id)), 'Observations fetched'); },
  async addObservation(req: Request, res: Response) { return sendCreated(res, await inpatientService.addObservation(Number(req.params.id), req.body, req.user?.id ?? null), 'Observation recorded'); },
  async wards(_req: Request, res: Response) { return sendSuccess(res, await inpatientService.wards(), 'Wards fetched'); },
  async beds(_req: Request, res: Response) { return sendSuccess(res, await inpatientService.beds(), 'Beds fetched'); },
  async admissions(req: Request, res: Response) { return sendSuccess(res, await inpatientService.admissions({ status: typeof req.query.status === 'string' ? req.query.status : undefined, patientId: req.query.patientId ? Number(req.query.patientId) : undefined }), 'Admissions fetched'); },
  async admit(req: Request, res: Response) { return sendCreated(res, await inpatientService.admit(req.body, req.user?.id ?? null), 'Patient admitted'); },
  async discharge(req: Request, res: Response) { return sendSuccess(res, await inpatientService.discharge(Number(req.params.id), req.body, req.user?.id ?? null), 'Patient discharged'); },
};
