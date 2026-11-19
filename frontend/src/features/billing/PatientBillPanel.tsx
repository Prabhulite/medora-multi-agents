import { Button } from '../../components/ui/Button';
import type { BillingInvoice } from './billing.api';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function PatientBillPanel({ invoice, onClose }: { invoice: BillingInvoice; onClose: () => void }) {
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="billing-modal billing-patient-bill" role="dialog" aria-modal="true" aria-labelledby="patient-bill-title" onClick={(event) => event.stopPropagation()}>
      <div className="billing-form">
        <header><h2 id="patient-bill-title">Patient bill</h2><p>Invoice {invoice.invoiceNumber} · {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : ''}</p></header>
        <div><strong>{invoice.patientName}</strong><br />MRD {invoice.patientMrdNumber}</div>
        <table className="billing-patient-bill__items"><thead><tr><th>Service / item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
          {invoice.items?.map((item, index) => <tr key={item.id ?? index}><td>{item.description}</td><td>{item.quantity}</td><td>{money.format(item.unitPrice)}</td><td>{money.format(item.total ?? item.quantity * item.unitPrice)}</td></tr>)}
        </tbody></table>
        <div className="billing-patient-bill__totals"><div><span>Total</span><strong>{money.format(Number(invoice.totalAmount ?? 0))}</strong></div><div><span>Received</span><strong>{money.format(Number(invoice.paidAmount ?? 0))}</strong></div><div><span>Balance</span><strong>{money.format(Number(invoice.balanceAmount ?? 0))}</strong></div></div>
        {invoice.notes && <p>Notes: {invoice.notes}</p>}
        <div className="billing-modal__footer billing-patient-bill__actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={() => window.print()}>Print bill</Button></div>
      </div>
    </section>
  </div>;
}
