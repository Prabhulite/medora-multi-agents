import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { billingApi, type BillingInvoice } from '../billing/billing.api';
import { PatientBillPanel } from '../billing/PatientBillPanel';
import '../billing/BillingDashboardPage.css';
import './PatientActionModal.css';

export function PatientPaymentModal({ patientId, patientName, onClose }: { patientId: number; patientName: string; onClose: () => void }) {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<BillingInvoice | null>(null);
  const load = async () => { const rows = await billingApi.listInvoices(patientId); setInvoices(rows); return rows; };
  useEffect(() => { void load().catch((err) => setError(getErrorMessage(err, 'Unable to load patient invoices'))); }, [patientId]);
  const selected = invoices.find((row) => String(row.id) === invoiceId);
  const balance = Number(selected?.balanceAmount ?? 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!selected || !Number.isFinite(value) || value <= 0 || value > balance) { setError('Select an unpaid invoice and enter an amount no greater than its balance.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await billingApi.recordPayment({ invoiceId: selected.id, amount: value, method, reference: reference.trim() || null });
      setPaymentRecorded(true);
      setNotice('Payment recorded. You can print the updated bill.');
      setAmount('');
      try { const rows = await load(); setPrintInvoice(rows.find((row) => row.id === selected.id) ?? null); }
      catch { setNotice('Payment recorded. Refresh the billing page to see the updated bill.'); }
    }
    catch (err) { setError(getErrorMessage(err, 'Unable to record payment')); }
    finally { setBusy(false); }
  };
  return <div className="patient-action-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="patient-action-modal" role="dialog" aria-modal="true" aria-label="Patient payment"><header><div><h2>Process Payment</h2><p>{patientName}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header><form className="patient-action-modal__body" onSubmit={(event) => void submit(event)}>
    {error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <Select label="Unpaid invoice *" value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); setPaymentRecorded(false); const row = invoices.find((item) => String(item.id) === event.target.value); setAmount(row ? String(Number(row.balanceAmount)) : ''); }} options={[{ value: '', label: 'Select invoice' }, ...invoices.filter((row) => Number(row.balanceAmount) > 0).map((row) => ({ value: String(row.id), label: `${row.invoiceNumber} · balance ₹${Number(row.balanceAmount).toFixed(2)}` }))]} />
    <Input label="Amount received *" type="number" min="0.01" step="0.01" max={balance || undefined} required value={amount} onChange={(event) => setAmount(event.target.value)} />
    <Select label="Payment method *" value={method} onChange={(event) => setMethod(event.target.value as typeof method)} options={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank transfer' }]} />
    <Input label="Reference (optional)" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} />
    <footer><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="submit" disabled={!selected || busy || paymentRecorded} loading={busy}>Record payment</Button></footer>
  </form></section>{printInvoice && <PatientBillPanel invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}</div>;
}
