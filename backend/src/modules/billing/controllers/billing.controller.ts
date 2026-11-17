import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { billingService } from '../services/billing.service.js';
import { insuranceClaimService } from '../services/insurance-claim.service.js';
import { patientLedgerService } from '../services/patient-ledger.service.js';
import { chargeMasterService } from '../services/charge-master.service.js';
import { cashierReportService } from '../services/cashier-report.service.js';

export const billingController = {
  async closeouts(req: Request, res: Response) { return sendSuccess(res, await billingService.closeouts(String(req.query.date)), 'Cashier closeouts fetched'); },
  async closeout(req: Request, res: Response) { return sendCreated(res, await billingService.closeout(req.body, req.user?.id ?? null), 'Cashier day closed'); },
  async receipt(req: Request, res: Response) { return sendSuccess(res, await billingService.receipt(Number(req.params.id)), 'Payment receipt fetched'); },
  async cashierReport(req: Request, res: Response) { return sendSuccess(res, await cashierReportService.get(String(req.query.from), String(req.query.to)), 'Cashier report fetched'); },
  async charges(_req: Request, res: Response) { return sendSuccess(res, await chargeMasterService.list(), 'Charges fetched'); },
  async createCharge(req: Request, res: Response) { return sendCreated(res, await chargeMasterService.create(req.body), 'Charge created'); },
  async updateCharge(req: Request, res: Response) { return sendSuccess(res, await chargeMasterService.update(Number(req.params.id), req.body), 'Charge updated'); },
  async ledger(req: Request, res: Response) { return sendSuccess(res, await patientLedgerService.get(Number(req.params.patientId)), 'Patient ledger fetched'); },
  async claims(req: Request, res: Response) { return sendSuccess(res, await insuranceClaimService.list(req.query.invoiceId ? Number(req.query.invoiceId) : undefined), 'Claims fetched'); },
  async createClaim(req: Request, res: Response) { return sendCreated(res, await insuranceClaimService.create(req.body, req.user?.id ?? null), 'Claim created'); },
  async claimAction(req: Request, res: Response) { return sendSuccess(res, await insuranceClaimService.action(Number(req.params.id), req.body, req.user?.id ?? null), 'Claim updated'); },
  async list(req: Request, res: Response) { return sendSuccess(res, await billingService.list({ patientId: req.query.patientId ? Number(req.query.patientId) : undefined, status: typeof req.query.status === 'string' ? req.query.status : undefined }), 'Invoices fetched'); },
  async create(req: Request, res: Response) { return sendCreated(res, await billingService.create(req.body, req.user?.id ?? null), 'Invoice created'); },
  async payment(req: Request, res: Response) { return sendSuccess(res, await billingService.addPayment(Number(req.params.id), req.body, req.user?.id ?? null), 'Payment recorded'); },
  async refunds(req: Request, res: Response) { return sendSuccess(res, await billingService.refunds(Number(req.params.id)), 'Refunds fetched'); },
  async refund(req: Request, res: Response) { return sendCreated(res, await billingService.addRefund(Number(req.params.id), req.body, req.user?.id ?? null), 'Refund recorded'); },
};
