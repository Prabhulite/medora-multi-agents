import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import { billingApi, type PaymentReceipt } from './billing.api';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function PaymentReceiptPanel({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    billingApi.paymentReceipt(paymentId).then((value) => { if (active) setReceipt(value); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load payment receipt')); });
    return () => { active = false; };
  }, [paymentId]);

  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="billing-modal payment-receipt" role="dialog" aria-modal="true" aria-labelledby="payment-receipt-title" onClick={(event) => event.stopPropagation()}>
      <div className="billing-modal__header"><div><span className="billing-eyebrow">PAYMENT RECORD</span><h2 id="payment-receipt-title">Payment receipt</h2></div><button type="button" aria-label="Close receipt" onClick={onClose}>×</button></div>
      {error && <div className="billing-form"><Alert tone="error">{error}</Alert></div>}
      {!error && !receipt && <p className="payment-receipt__loading">Loading receipt…</p>}
      {receipt && <div className="payment-receipt__body">
        <div className="payment-receipt__heading"><strong>Payment #{receipt.paymentId}</strong><span>{dateTime(receipt.paidAt)}</span></div>
        <dl className="payment-receipt__details"><div><dt>Patient</dt><dd>{receipt.patientName}</dd></div><div><dt>MRD</dt><dd>{receipt.patientMrdNumber}</dd></div><div><dt>Invoice</dt><dd>{receipt.invoiceNumber}</dd></div><div><dt>Method</dt><dd>{receipt.method.replaceAll('_', ' ')}</dd></div>{receipt.referenceNumber && <div><dt>Reference</dt><dd>{receipt.referenceNumber}</dd></div>}</dl>
        <div className="payment-receipt__amount"><span>Received</span><strong>{currency.format(Number(receipt.amount))}</strong></div>
        {receipt.refunds.length > 0 && <><h3>Refunds against this payment</h3><ul className="payment-receipt__refunds">{receipt.refunds.map((refund) => <li key={refund.id}><span>#{refund.id} · {dateTime(refund.refundedAt)}</span><strong>{currency.format(Number(refund.amount))}</strong></li>)}</ul><div className="payment-receipt__amount"><span>Total refunded</span><strong>{currency.format(Number(receipt.totalRefunded))}</strong></div><div className="payment-receipt__amount payment-receipt__amount--net"><span>Net retained</span><strong>{currency.format(Number(receipt.netPaid))}</strong></div></>}
        <p className="payment-receipt__note">This receipt reflects the current refund status. Keep the payment ID for reconciliation.</p>
        <div className="billing-modal__footer payment-receipt__actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={() => window.print()}>Print receipt</Button></div>
      </div>}
    </section>
  </div>;
}
