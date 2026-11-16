import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { billingApi, type BillingInvoice, type BillingRefund, type RecordRefundPayload } from './billing.api';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function RefundPanel({ invoice, onClose, onUpdated }: { invoice: BillingInvoice; onClose: () => void; onUpdated: () => Promise<void> }) {
  const [refunds, setRefunds] = useState<BillingRefund[]>([]);
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<RecordRefundPayload['method']>('cash');
  const [reason, setReason] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { billingApi.listRefunds(invoice.id).then(setRefunds).catch((err) => setError(getErrorMessage(err, 'Unable to load refunds'))); }, [invoice.id]);
  const payment = invoice.payments?.find((row) => String(row.id) === paymentId);
  const alreadyRefunded = refunds.filter((row) => String(row.paymentId) === paymentId).reduce((sum, row) => sum + row.amount, 0);
  const refundable = Math.max(0, Math.round(((payment?.amount || 0) - alreadyRefunded) * 100) / 100);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await billingApi.recordRefund({ invoiceId: invoice.id, paymentId: Number(paymentId), amount: Number(amount), method, reason, referenceNumber: referenceNumber || null });
      setRefunds(await billingApi.listRefunds(invoice.id));
      setPaymentId(''); setAmount(''); setReason(''); setReferenceNumber('');
      await onUpdated();
    } catch (err) { setError(getErrorMessage(err, 'Unable to record refund')); }
    finally { setSaving(false); }
  };
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}><section className="billing-modal" role="dialog" aria-modal="true" aria-labelledby="refund-title" onClick={(event) => event.stopPropagation()}><div className="billing-modal__header"><div><span className="billing-eyebrow">REFUND RECORD</span><h2 id="refund-title">{invoice.invoiceNumber}</h2><p>{invoice.patientName}</p></div><button type="button" onClick={onClose} aria-label="Close refunds">×</button></div>{error && <Alert tone="error">{error}</Alert>}<form className="billing-form" onSubmit={(event) => void submit(event)}><div className="billing-form__grid"><Select label="Original payment" required value={paymentId} onChange={(event) => { setPaymentId(event.target.value); setAmount(''); }} options={[{ value: '', label: 'Select payment' }, ...(invoice.payments || []).map((row) => ({ value: row.id, label: `${currency.format(row.amount)} · ${row.method} · ${new Date(row.paidAt).toLocaleDateString()}` }))]} /><Input label="Refund amount" type="number" min="0.01" max={refundable || undefined} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={paymentId ? `Up to ${currency.format(refundable)}` : '0.00'} /><Select label="Refund method" value={method} onChange={(event) => setMethod(event.target.value as RecordRefundPayload['method'])} options={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank transfer' }]} /><Input label="Reference" maxLength={120} value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} /><Input label="Reason" required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="billing-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="submit" loading={saving} disabled={!paymentId || refundable <= 0}>Record refund</Button></div></form><div className="billing-section"><h3>Refund history</h3>{refunds.length ? refunds.map((row) => <p key={row.id}>{currency.format(row.amount)} · {row.reason} · {new Date(row.refundedAt).toLocaleString()}</p>) : <p>No refunds recorded.</p>}</div></section></div>;
}
