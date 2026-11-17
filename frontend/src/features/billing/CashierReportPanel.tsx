import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getErrorMessage } from '../../lib/api';
import { billingApi, type CashierReport } from './billing.api';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayMoney = (value: string) => currency.format(Number(value));

export function CashierReportPanel({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState(() => dateInput(new Date()));
  const [to, setTo] = useState(() => dateInput(new Date()));
  const [report, setReport] = useState<CashierReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async (start: string, end: string) => {
    setLoading(true); setError('');
    try { setReport(await billingApi.cashierReport(start, end)); }
    catch (err) { setReport(null); setError(getErrorMessage(err, 'Unable to load cashier report')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(from, to); }, []);
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="billing-modal billing-modal--wide" role="dialog" aria-modal="true" aria-labelledby="cashier-report-title" onClick={(event) => event.stopPropagation()}>
      <div className="billing-modal__header"><div><span className="billing-eyebrow">COLLECTIONS</span><h2 id="cashier-report-title">Cashier report</h2></div><button type="button" onClick={onClose} aria-label="Close cashier report">×</button></div>
      <div className="billing-form">
        <form className="billing-filter" onSubmit={(event) => { event.preventDefault(); void load(from, to); }}><Input label="From" type="date" required value={from} onChange={(event) => setFrom(event.target.value)} /><Input label="To" type="date" required value={to} onChange={(event) => setTo(event.target.value)} /><Button type="submit" loading={loading}>Run report</Button></form>
        <small>Dates follow the hospital database session time. Maximum range: 90 days.</small>
        {error && <Alert tone="error">{error}</Alert>}
        {report && <><div className="billing-ledger-summary"><span>Received<strong>{displayMoney(report.totals.received)}</strong></span><span>Refunded<strong>{displayMoney(report.totals.refunded)}</strong></span><span>Net collections<strong>{displayMoney(report.totals.net)}</strong></span></div>
          <div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Method</th><th>Payments</th><th>Received</th><th>Refunds</th><th>Refunded</th><th>Net</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.method}><td>{row.method.replaceAll('_', ' ')}</td><td>{row.paymentCount}</td><td>{displayMoney(row.received)}</td><td>{row.refundCount}</td><td>{displayMoney(row.refunded)}</td><td><strong>{displayMoney(row.net)}</strong></td></tr>)}{report.rows.length === 0 && <tr><td colSpan={6}>No payments or refunds in this period.</td></tr>}</tbody></table></div></>}
      </div>
    </section>
  </div>;
}
