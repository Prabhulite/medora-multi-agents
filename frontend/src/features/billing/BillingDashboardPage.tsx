import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { patientsApi } from '../patients/patients.api';
import type { Patient } from '../../types';
import { billingApi, type BillingCharge, type BillingInvoice, type CreateInvoicePayload, type RecordPaymentPayload } from './billing.api';
import './BillingDashboardPage.css';
import { RefundPanel } from './RefundPanel';
import { InsuranceClaimPanel } from './InsuranceClaimPanel';
import { PatientLedgerPanel } from './PatientLedgerPanel';
import { ChargeMasterPanel } from './ChargeMasterPanel';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function amount(value: number | null | undefined) {
  return currency.format(Number(value || 0));
}

function statusTone(status: string | undefined): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'paid') return 'success';
  if (status === 'partially_paid') return 'warning';
  if (status === 'cancelled') return 'danger';
  if (status === 'issued') return 'info';
  return 'neutral';
}

function dateLabel(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function BillingDashboardPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [refundInvoice, setRefundInvoice] = useState<BillingInvoice | null>(null);
  const [claimInvoice, setClaimInvoice] = useState<BillingInvoice | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showCharges, setShowCharges] = useState(false);

  const load = async (filter = patientId) => {
    setLoading(true);
    setError('');
    try {
      setInvoices(await billingApi.listInvoices(filter ? Number(filter) : undefined));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load invoices'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(''); }, []);

  const totals = useMemo(() => invoices.reduce((summary, invoice) => ({
    billed: summary.billed + Number(invoice.totalAmount ?? invoice.subtotal ?? 0),
    paid: summary.paid + Number(invoice.paidAmount ?? 0),
    outstanding: summary.outstanding + Number(invoice.balanceAmount ?? (Number(invoice.totalAmount ?? 0) - Number(invoice.paidAmount ?? 0))),
  }), { billed: 0, paid: 0, outstanding: 0 }), [invoices]);

  const columns = useMemo<TableColumn<BillingInvoice>[]>(() => [
    { key: 'invoice', header: 'Invoice', render: (row) => <div><div className="ui-table__cell-title">{row.invoiceNumber || `#${row.id}`}</div><div className="ui-table__cell-sub">{dateLabel(row.invoiceDate)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName || `Patient ${row.patientId}`}</div><div className="ui-table__cell-sub">{row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'total', header: 'Total', render: (row) => <strong>{amount(row.totalAmount ?? row.subtotal)}</strong> },
    { key: 'paid', header: 'Paid', render: (row) => amount(row.paidAmount) },
    { key: 'balance', header: 'Balance', render: (row) => <strong className={Number(row.balanceAmount || 0) > 0 ? 'billing-amount--due' : ''}>{amount(row.balanceAmount ?? (Number(row.totalAmount || 0) - Number(row.paidAmount || 0)))}</strong> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{(row.status || 'draft').replace('_', ' ')}</Badge> },
    { key: 'refunds', header: 'Refunds', render: (row) => (row.payments?.length || 0) > 0 ? <Button size="sm" variant="secondary" onClick={() => setRefundInvoice(row)}>View / refund</Button> : <span>—</span> },
    { key: 'claim', header: 'Insurance', render: (row) => <Button size="sm" variant="secondary" onClick={() => setClaimInvoice(row)}>Claim</Button> },
  ], []);

  const saveInvoice = async (payload: CreateInvoicePayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const created = await billingApi.createInvoice(payload);
      setInvoices((current) => [created, ...current]);
      setShowInvoiceForm(false); setNotice('Invoice created successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create invoice'));
    } finally { setSaving(false); }
  };

  const savePayment = async (payload: RecordPaymentPayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      await billingApi.recordPayment(payload);
      setShowPaymentForm(false); setNotice('Payment recorded successfully.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to record payment'));
    } finally { setSaving(false); }
  };

  return <div className="billing-page">
    <PageHeader title="Billing & Payments" subtitle="Track patient invoices, collections, and outstanding balances." actions={<div className="billing-actions">{hasPermission(user, 'billing.charges.manage') && <Button variant="secondary" size="sm" onClick={() => setShowCharges(true)}>Charge master</Button>}<Button variant="secondary" size="sm" onClick={() => setShowLedger(true)}>Patient ledger</Button><Button variant="secondary" size="sm" onClick={() => setShowPaymentForm(true)}>Record payment</Button><Button size="sm" onClick={() => setShowInvoiceForm(true)}>Create invoice</Button></div>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="billing-kpis" aria-label="Billing totals">
      <article><span>Total billed</span><strong>{amount(totals.billed)}</strong><small>{invoices.length} invoice{invoices.length === 1 ? '' : 's'} in view</small></article>
      <article className="billing-kpi--green"><span>Collected</span><strong>{amount(totals.paid)}</strong><small>Payments received</small></article>
      <article className="billing-kpi--amber"><span>Outstanding</span><strong>{amount(totals.outstanding)}</strong><small>Balance to collect</small></article>
    </div>
    <section className="billing-section">
      <div className="billing-section__heading"><div><h2>Invoices</h2><p>Search the billing ledger or filter it to one patient.</p></div><form className="billing-filter" onSubmit={(event) => { event.preventDefault(); void load(); }}><Input label="" aria-label="Patient ID" type="number" min="1" value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="Patient ID" /><Button type="submit" variant="secondary" size="sm">Apply</Button><Button type="button" variant="ghost" size="sm" onClick={() => { setPatientId(''); void load(''); }}>Clear</Button></form></div>
      <Table columns={columns} rows={invoices} rowKey={(row) => row.id} loading={loading} onRefresh={() => void load()} searchText={(row) => `${row.invoiceNumber} ${row.patientName || ''} ${row.patientMrdNumber || ''} ${row.status || ''}`} searchPlaceholder="Search invoices or patients" emptyMessage="No invoices found for this filter." />
    </section>
    {showInvoiceForm ? <InvoiceForm saving={saving} onClose={() => setShowInvoiceForm(false)} onSubmit={(payload) => void saveInvoice(payload)} /> : null}
    {showPaymentForm ? <PaymentForm invoices={invoices} saving={saving} onClose={() => setShowPaymentForm(false)} onSubmit={(payload) => void savePayment(payload)} /> : null}
    {refundInvoice ? <RefundPanel invoice={refundInvoice} onClose={() => setRefundInvoice(null)} onUpdated={async () => { await load(); }} /> : null}
    {claimInvoice ? <InsuranceClaimPanel invoice={claimInvoice} onClose={() => setClaimInvoice(null)} /> : null}
    {showLedger ? <PatientLedgerPanel onClose={() => setShowLedger(false)} /> : null}
    {showCharges ? <ChargeMasterPanel onClose={() => setShowCharges(false)} /> : null}
  </div>;
}

function InvoiceForm({ saving, onClose, onSubmit }: { saving: boolean; onClose: () => void; onSubmit: (payload: CreateInvoicePayload) => void }) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ chargeId: '', description: '', quantity: '1', unitPrice: '' }]);
  const [charges, setCharges] = useState<BillingCharge[]>([]);
  const [lookupError, setLookupError] = useState('');
  useEffect(() => { billingApi.listCharges().then(setCharges).catch((err) => setLookupError(getErrorMessage(err, 'Unable to load charges'))); }, []);
  useEffect(() => {
    if (patientQuery.trim().length < 2 || patientId) { setPatientResults([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { patientsApi.search({ q: patientQuery.trim() }).then((rows) => { if (active) setPatientResults(rows.slice(0, 20)); }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [patientQuery, patientId]);
  const updateItem = (index: number, key: keyof typeof items[number], value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const selectCharge = (index: number, chargeId: string) => {
    const charge = charges.find((row) => String(row.id) === chargeId);
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, chargeId, description: charge?.name || '', unitPrice: charge?.unitPrice || '' } : item));
  };
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!patientId) return; onSubmit({ patientId: Number(patientId), dueDate: dueDate || null, notes: notes || null, items: items.map((item) => ({ chargeId: item.chargeId ? Number(item.chargeId) : null, description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }); };
  return <ModalShell title="Create invoice" eyebrow="NEW BILLING RECORD" onClose={onClose}>{lookupError && <Alert tone="error">{lookupError}</Alert>}<form onSubmit={submit} className="billing-form"><div className="billing-form__grid"><div><Input label="Search patient by name or MRD" value={patientQuery} onChange={(event) => { setPatientQuery(event.target.value); setPatientId(''); }} placeholder="Type at least 2 characters" />{patientResults.length > 0 && <Select label="Matching patients" value={patientId} onChange={(event) => { const patient = patientResults.find((row) => String(row.id) === event.target.value); setPatientId(event.target.value); if (patient) setPatientQuery(`${patient.fullName} (${patient.mrdNumber})`); }} options={[{ value: '', label: 'Select a patient' }, ...patientResults.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{patientId && <small>Selected patient ID: {patientId}</small>}</div><Input label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div><h3>Charges</h3>{items.map((item, index) => <div className="billing-form__grid" key={index}><Select label={`Catalog charge ${index + 1}`} value={item.chargeId} onChange={(event) => selectCharge(index, event.target.value)} options={[{ value: '', label: 'Custom charge' }, ...charges.filter((charge) => charge.isActive).map((charge) => ({ value: charge.id, label: `${charge.code} · ${charge.name} · ${amount(Number(charge.unitPrice))}` }))]} /><Input label={`Service or charge ${index + 1}`} required readOnly={!!item.chargeId} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} placeholder="e.g. OPD consultation" /><Input label="Quantity" type="number" min="0.01" step="0.01" required value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /><Input label="Unit price" type="number" min="0" step="0.01" required readOnly={!!item.chargeId} value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} placeholder="0.00" />{items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove charge</Button>}</div>)}<Button type="button" variant="secondary" size="sm" onClick={() => setItems((current) => [...current, { chargeId: '', description: '', quantity: '1', unitPrice: '' }])}>Add charge</Button><p><strong>Invoice total: {amount(total)}</strong></p><label className="billing-textarea"><span>Notes</span><textarea rows={3} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional billing note" /></label><div className="billing-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={!patientId}>Create invoice</Button></div></form></ModalShell>;
}

function PaymentForm({ invoices, saving, onClose, onSubmit }: { invoices: BillingInvoice[]; saving: boolean; onClose: () => void; onSubmit: (payload: RecordPaymentPayload) => void }) {
  const [form, setForm] = useState({ invoiceId: invoices[0]?.id ? String(invoices[0].id) : '', amount: '', method: 'cash' as RecordPaymentPayload['method'], reference: '' });
  const selected = invoices.find((invoice) => String(invoice.id) === form.invoiceId);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit({ invoiceId: Number(form.invoiceId), amount: Number(form.amount), method: form.method, reference: form.reference || null }); };
  return <ModalShell title="Record payment" eyebrow="COLLECTION ENTRY" onClose={onClose}><form onSubmit={submit} className="billing-form"><div className="billing-form__grid"><Select label="Invoice" required value={form.invoiceId} onChange={(event) => update('invoiceId', event.target.value)} options={[{ value: '', label: invoices.length ? 'Select an invoice' : 'No invoices loaded' }, ...invoices.map((invoice) => ({ value: String(invoice.id), label: `${invoice.invoiceNumber || `#${invoice.id}`} · ${amount(invoice.balanceAmount)}` }))]} /><Input label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => update('amount', event.target.value)} placeholder={selected ? `Due ${amount(selected.balanceAmount)}` : '0.00'} /><Select label="Payment method" value={form.method} onChange={(event) => update('method', event.target.value)} options={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'insurance', label: 'Insurance' }]} /><Input label="Reference" value={form.reference} onChange={(event) => update('reference', event.target.value)} placeholder="Receipt or transaction reference" /></div><FormFooter saving={saving} onClose={onClose} submitLabel="Record payment" disabled={!invoices.length} /></form></ModalShell>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}><section className="billing-modal" role="dialog" aria-modal="true" aria-labelledby="billing-modal-title" onClick={(event) => event.stopPropagation()}><div className="billing-modal__header"><div><span className="billing-eyebrow">{eyebrow}</span><h2 id="billing-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="billing-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default BillingDashboardPage;
