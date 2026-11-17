import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { clinicalService } from '../services/clinical.service.js';
import { allergyService } from '../services/allergy.service.js';
import { medicalHistoryService } from '../services/medical-history.service.js';
import { consentService } from '../services/consent.service.js';
import { timelineService } from '../services/timeline.service.js';
import { diagnosisService } from '../services/diagnosis.service.js';
import { homeMedicationService } from '../services/home-medication.service.js';

export const clinicalController = {
  async listHomeMedications(req: Request, res: Response) { return sendSuccess(res, await homeMedicationService.list(Number(req.params.patientId)), 'Home medication history fetched'); },
  async createHomeMedication(req: Request, res: Response) { return sendCreated(res, await homeMedicationService.create(Number(req.params.patientId), req.body, req.user!.id), 'Home medication history recorded'); },
  async ceaseHomeMedication(req: Request, res: Response) { return sendSuccess(res, await homeMedicationService.cease(Number(req.params.patientId), Number(req.params.id), req.body.reason, req.user!.id), 'Home medication marked not current'); },
  async listDiagnoses(req: Request, res: Response) {
    return sendSuccess(res, await diagnosisService.list(String(req.query.search ?? '')), 'Diagnosis terms fetched');
  },
  async createDiagnosis(req: Request, res: Response) {
    return sendCreated(res, await diagnosisService.create(req.body), 'Diagnosis term created');
  },
  async deactivateDiagnosis(req: Request, res: Response) {
    return sendSuccess(res, await diagnosisService.deactivate(Number(req.params.id)), 'Diagnosis term deactivated');
  },
  async signEncounter(req: Request, res: Response) {
    return sendSuccess(res, await clinicalService.sign(Number(req.params.id), req.user?.id ?? null), 'Clinical encounter signed');
  },
  async addEncounterAddendum(req: Request, res: Response) {
    return sendCreated(res, await clinicalService.addAddendum(Number(req.params.id), req.body, req.user?.id ?? null), 'Clinical addendum recorded');
  },
  async timeline(req: Request, res: Response) {
    return sendSuccess(res, await timelineService.list(Number(req.params.patientId)), 'Patient timeline fetched');
  },
  async listConsents(req: Request, res: Response) {
    return sendSuccess(res, await consentService.list(Number(req.params.patientId)), 'Patient consents fetched');
  },
  async createConsent(req: Request, res: Response) {
    return sendCreated(res, await consentService.create(Number(req.params.patientId), req.body, req.user?.id ?? null), 'Signed consent recorded');
  },
  async consentDocument(req: Request, res: Response) {
    return sendSuccess(res, await consentService.document(Number(req.params.patientId), Number(req.params.consentId)), 'Signed consent copy fetched');
  },
  async revokeConsent(req: Request, res: Response) {
    return sendSuccess(res, await consentService.revoke(Number(req.params.patientId), Number(req.params.consentId), req.body.reason, req.user?.id ?? null), 'Consent revoked');
  },
  async listMedicalHistory(req: Request, res: Response) {
    return sendSuccess(res, await medicalHistoryService.list(Number(req.params.patientId)), 'Medical history fetched');
  },
  async createMedicalHistory(req: Request, res: Response) {
    return sendCreated(res, await medicalHistoryService.create(Number(req.params.patientId), req.body, req.user?.id ?? null), 'Medical history recorded');
  },
  async removeMedicalHistory(req: Request, res: Response) {
    return sendSuccess(res, await medicalHistoryService.remove(Number(req.params.patientId), Number(req.params.recordId), req.user?.id ?? null), 'Medical history removed');
  },
  async listAllergies(req: Request, res: Response) {
    return sendSuccess(res, await allergyService.list(Number(req.params.patientId)), 'Patient allergies fetched');
  },
  async createAllergy(req: Request, res: Response) {
    return sendCreated(res, await allergyService.create(Number(req.params.patientId), req.body, req.user?.id ?? null), 'Patient allergy recorded');
  },
  async removeAllergy(req: Request, res: Response) {
    return sendSuccess(res, await allergyService.remove(Number(req.params.patientId), Number(req.params.allergyId), req.user?.id ?? null), 'Patient allergy removed');
  },
  async listByPatient(req: Request, res: Response) {
    return sendSuccess(res, await clinicalService.listByPatient(Number(req.params.patientId)), 'Clinical encounters fetched');
  },
  async create(req: Request, res: Response) {
    return sendCreated(res, await clinicalService.create(req.body, req.user?.id ?? null), 'Clinical encounter saved');
  },
};
