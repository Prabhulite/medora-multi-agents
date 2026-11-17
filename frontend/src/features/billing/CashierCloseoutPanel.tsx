import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { billingApi, type CashierCloseout } from './billing.api';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function CashierCloseoutPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(() => localDate(new Date()));
  const [rows, setRows] = useState<CashierCloseout[]>([]);
  const [expectedCash, setExpectedCash] = useState<string | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canClose = hasPermission(user, 'billing.closeout');
  const isToday = date === localDate(new Date());
  const alreadyClosed = rows.some((row) => row.cashierId === user?.id);

  const load = async (selectedDate: string) => {
    setLoading(true); setError('');
    try {
      const closeouts = await billingApi.listCloseouts(selectedDate);
      setRows(closeouts);
      if (selectedDate === localDate(new Date()) && canClose) {
        const report = await billingApi.cashierReport(selectedDate, selectedDate);
        setExpectedCash(report.cashiers.find((row) => row.cashierId === user?.id)?.net ?? '0.00');
      } else setExpectedCash(null);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load cash closeouts')); setRows([]); setExpectedCash(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(date); }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const result = await billingApi.createCloseout(Number(countedCash), reason.trim() || null);
      setNotice(`Cash closed for ${result.businessDate}. Variance: ${currency.format(Number(result.variance))}.`);
      setCountedCash(''); setReason('');
      setDate(result.businessDate);
      await load(result.businessDate);
    } catch (err) { setError(getErrorMessage(err, 'Unable to close cash')); }
    finally { setSaving(false); }
  };

  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="billing-modal billing-modal--wide" role="dialog" aria-modal="true" aria-labelledby="cash-closeout-title" onClick={(event) => event.stopPropagation()}>
      <div className="billing-modal__header"><div><span className="billing-eyebrow">CASH CONTROL</span><h2 id="cash-closeout-title">Cash closeouts</h2></div><button type="button" onClick={onClose} aria-label="Close cash closeouts">×</button></div>
      <div className="billing-form">
        <form className="billing-filter" onSubmit={(event) => { event.preventDefault(); void load(date); }}><Input label="Business date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /><Button type="submit" variant="secondary" loading={loading}>View</Button></form>
        {error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
        <small>Business dates follow the database session time. Closed amounts are a saved snapshot.</small>
        <div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Cashier</th><th>Received</th><th>Refunded</th><th>Expected</th><th>Counted</th><th>Variance</th><th>Closed</th><th>Reason</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.cashierName}</td><td>{currency.format(Number(row.cashReceived))}</td><td>{currency.format(Number(row.cashRefunded))}</td><td>{currency.format(Number(row.expectedCash))}</td><td>{currency.format(Number(row.countedCash))}</td><td>{currency.format(Number(row.variance))}</td><td>{new Date(row.closedAt).toLocaleString()}</td><td>{row.reason || '—'}</td></tr>)}{!loading && rows.length === 0 && <tr><td colSpan={8}>No closeouts for this date.</td></tr>}</tbody></table></div>
        {canClose && isToday && !alreadyClosed && <form className="billing-form billing-closeout-form" onSubmit={(event) => void submit(event)}>
          <h3>Close your cash for today</h3>
          <p>Expected from current cash transactions: <strong>{expectedCash === null ? 'Loading…' : currency.format(Number(expectedCash))}</strong>. The server recalculates this when you submit.</p>
          <div className="billing-form__grid"><Input label="Counted cash" type="number" min="0" max="999999999999.99" step="0.01" required value={countedCash} onChange={(event) => setCountedCash(event.target.value)} /><Input label="Variance reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required when counted cash differs" /></div>
          <p className="billing-closeout-warning">After closing, you cannot record more cash payments or cash refunds today. Check your count before submitting.</p>
          <div className="billing-modal__footer"><Button type="submit" loading={saving} disabled={expectedCash === null}>Close cash</Button></div>
        </form>}
      </div>
    </section>
  </div>;
}
