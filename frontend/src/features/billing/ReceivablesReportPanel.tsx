import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { billingApi, type ReceivablesBucket, type ReceivablesReport } from './billing.api';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const amount = (value: string) => currency.format(Number(value));
const labels: Record<ReceivablesBucket, string> = { undated: 'No due date', current: 'Not yet due', '1_30': '1–30 days', '31_60': '31–60 days', '61_90': '61–90 days', '91_plus': 'Over 90 days' };

export function ReceivablesReportPanel({ onClose }: { onClose: () => void }) {
  const [bucket, setBucket] = useState<ReceivablesBucket | ''>('');
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<ReceivablesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setReport(await billingApi.receivablesReport(page, bucket || undefined)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load receivables report')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [page, bucket]);
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="billing-modal billing-modal--wide" role="dialog" aria-modal="true" aria-labelledby="receivables-title" onClick={(event) => event.stopPropagation()}>
      <div className="billing-modal__header"><div><span className="billing-eyebrow">ACCOUNTS RECEIVABLE</span><h2 id="receivables-title">Outstanding invoices</h2></div><button type="button" onClick={onClose} aria-label="Close receivables report">×</button></div>
      <div className="billing-form">
        <p>Current unpaid balances grouped by invoice due date. This is a live balance view, not a historical snapshot.</p>
        <div className="billing-filter"><Select label="Age" value={bucket} onChange={(event) => { setPage(1); setBucket(event.target.value as ReceivablesBucket | ''); }} options={[{ value: '', label: 'All outstanding' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} /><Button variant="secondary" size="sm" onClick={() => void load()} loading={loading}>Refresh</Button></div>
        {error && <Alert tone="error">{error}</Alert>}
        {report && <>
          <p><strong>Total outstanding: {amount(report.totalOutstanding)}</strong></p><small>As of {report.asOf} ({report.timezone}). {report.total} invoice{report.total === 1 ? '' : 's'} in this filter.</small>
          <div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Age</th><th>Invoices</th><th>Outstanding</th></tr></thead><tbody>{report.buckets.map((row) => <tr key={row.bucket}><td>{labels[row.bucket]}</td><td>{row.count}</td><td><strong>{amount(row.amount)}</strong></td></tr>)}</tbody></table></div>
          <h3>Invoice details</h3>
          <div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Invoice</th><th>Patient</th><th>Due date</th><th>Days overdue</th><th>Balance</th></tr></thead><tbody>{report.items.map((row) => <tr key={row.id}><td>{row.invoiceNumber}</td><td>{row.patientName}<small> · {row.patientMrdNumber}</small></td><td>{row.dueDate || 'Not set'}</td><td>{row.daysOverdue ?? '—'}</td><td><strong>{amount(row.balanceAmount)}</strong></td></tr>)}{report.items.length === 0 && <tr><td colSpan={5}>No unpaid invoices in this age group.</td></tr>}</tbody></table></div>
          {report.total > report.pageSize && <div className="billing-filter"><Button size="sm" variant="secondary" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {Math.ceil(report.total / report.pageSize)}</span><Button size="sm" variant="secondary" disabled={loading || page * report.pageSize >= report.total} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
        </>}
      </div>
    </section>
  </div>;
}
