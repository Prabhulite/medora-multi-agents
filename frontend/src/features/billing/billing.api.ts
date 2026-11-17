import { api } from '../../lib/api';

export interface BillingInvoiceItem {
  id?: number;
  chargeId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface BillingInvoice {
  id: number;
  invoiceNumber: string;
  patientId: number;
  patientName?: string | null;
  patientMrdNumber?: string | null;
  status?: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  balanceAmount?: number | null;
  notes?: string | null;
  items?: BillingInvoiceItem[];
  payments?: BillingPayment[];
}

export interface BillingPayment { id: number; amount: number; method: string; referenceNumber: string | null; paidAt: string }
export interface BillingRefund { id: number; paymentId: number; amount: number; method: string; reason: string; referenceNumber: string | null; refundedAt: string; createdBy?: { fullName: string } | null }
export interface CashierReport { from: string; to: string; timezone: string; rows: Array<{ method: string; paymentCount: number; refundCount: number; received: string; refunded: string; net: string }>; totals: { received: string; refunded: string; net: string; paymentCount: number; refundCount: number } }
export interface RecordRefundPayload { invoiceId: number; paymentId: number; amount: number; method: 'cash' | 'card' | 'upi' | 'bank_transfer'; referenceNumber?: string | null; reason: string }
export interface InsuranceClaim { id: number; invoiceId: number; claimNumber: string; payerName: string; policyNumber: string; claimedAmount: string; approvedAmount: string | null; status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'settled'; notes: string | null; decisionNote: string | null; createdAt: string; submittedAt: string | null; decidedAt: string | null; settledAt: string | null }
export interface CreateClaimPayload { invoiceId: number; payerName: string; policyNumber: string; claimedAmount: number; notes?: string | null }
export interface PatientLedger { patient: { id: number; fullName: string; mrdNumber: string }; summary: { billed: string; collected: string; outstanding: string }; entries: Array<{ type: 'invoice' | 'payment' | 'refund'; id: number; invoiceId: number; invoiceNumber: string; occurredAt: string; description: string; debit: string; credit: string; balance: string }> }
export type ClaimAction = { action: 'submit' | 'resubmit' | 'settle' } | { action: 'approve'; approvedAmount: number; decisionNote?: string | null } | { action: 'reject'; decisionNote: string };

export interface CreateInvoicePayload {
  patientId: number;
  dueDate?: string | null;
  notes?: string | null;
  items: Array<{ chargeId?: number | null; description: string; quantity: number; unitPrice: number }>;
}
export interface BillingCharge { id: number; code: string; name: string; category: string; unitPrice: string; isActive: boolean }
export interface ChargePayload { code: string; name: string; category: string; unitPrice: number; isActive: boolean }

export interface RecordPaymentPayload {
  invoiceId: number;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'insurance' | 'other';
  reference?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(data: ApiEnvelope<T> | T): T {
  return data && typeof data === 'object' && 'data' in data ? (data as ApiEnvelope<T>).data : data;
}

function mapInvoice(row: any): BillingInvoice {
  return { ...row, patientName: row.patient?.fullName || [row.patient?.firstName, row.patient?.middleName, row.patient?.lastName].filter(Boolean).join(' ') || row.patientName || null, patientMrdNumber: row.patient?.mrdNumber || row.patientMrdNumber || null, invoiceDate: row.invoiceDate || row.createdAt || null, subtotal: Number(row.subtotal || 0), taxAmount: Number(row.tax ?? row.taxAmount ?? 0), discountAmount: Number(row.discount ?? row.discountAmount ?? 0), totalAmount: Number(row.total ?? row.totalAmount ?? 0), paidAmount: Number(row.paidAmount || 0), balanceAmount: Number(row.balanceAmount || 0), items: row.items?.map((item: any) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), total: Number(item.total) })), payments: row.payments?.map((payment: any) => ({ ...payment, amount: Number(payment.amount) })) };
}

export const billingApi = {
  async cashierReport(from: string, to: string): Promise<CashierReport> { return unwrap((await api.get<ApiEnvelope<CashierReport>>('/billing/reports/cashier', { params: { from, to } })).data); },
  async listCharges(): Promise<BillingCharge[]> { return unwrap((await api.get<ApiEnvelope<BillingCharge[]>>('/billing/charges')).data); },
  async createCharge(payload: ChargePayload): Promise<BillingCharge> { return unwrap((await api.post<ApiEnvelope<BillingCharge>>('/billing/charges', payload)).data); },
  async updateCharge(id: number, payload: Partial<ChargePayload>): Promise<BillingCharge> { return unwrap((await api.patch<ApiEnvelope<BillingCharge>>(`/billing/charges/${id}`, payload)).data); },
  async patientLedger(patientId: number): Promise<PatientLedger> { return unwrap((await api.get<ApiEnvelope<PatientLedger>>(`/billing/patients/${patientId}/ledger`)).data); },
  async listClaims(invoiceId: number): Promise<InsuranceClaim[]> { return unwrap((await api.get<ApiEnvelope<InsuranceClaim[]>>('/billing/claims', { params: { invoiceId } })).data); },
  async createClaim(payload: CreateClaimPayload): Promise<InsuranceClaim> { return unwrap((await api.post<ApiEnvelope<InsuranceClaim>>('/billing/claims', payload)).data); },
  async updateClaim(id: number, action: ClaimAction): Promise<InsuranceClaim> { return unwrap((await api.patch<ApiEnvelope<InsuranceClaim>>(`/billing/claims/${id}/action`, action)).data); },
  async listInvoices(patientId?: number): Promise<BillingInvoice[]> {
    const response = await api.get<ApiEnvelope<BillingInvoice[]> | BillingInvoice[]>('/billing/invoices', {
      params: patientId ? { patientId } : undefined,
    });
    return (unwrap(response.data) || []).map(mapInvoice);
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<BillingInvoice> {
    const response = await api.post<ApiEnvelope<BillingInvoice> | BillingInvoice>('/billing/invoices', payload);
    return mapInvoice(unwrap(response.data));
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<unknown> {
    const response = await api.post<ApiEnvelope<unknown> | unknown>(`/billing/invoices/${payload.invoiceId}/payments`, { amount: payload.amount, method: payload.method, referenceNumber: payload.reference });
    return unwrap(response.data);
  },
  async listRefunds(invoiceId: number): Promise<BillingRefund[]> {
    const response = await api.get<ApiEnvelope<BillingRefund[]> | BillingRefund[]>(`/billing/invoices/${invoiceId}/refunds`);
    return (unwrap(response.data) || []).map((row) => ({ ...row, amount: Number(row.amount) }));
  },
  async recordRefund(payload: RecordRefundPayload): Promise<BillingRefund> {
    const response = await api.post<ApiEnvelope<BillingRefund> | BillingRefund>(`/billing/invoices/${payload.invoiceId}/refunds`, payload);
    return unwrap(response.data);
  },
};
