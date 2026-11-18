import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { billingApi, type CashDeposit, type CashierCloseout } from './billing.api';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function CashierCloseoutPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(() => localDate(new Date()));
  const [rows, setRows] = useState<CashierCloseout[]>([]);
  const [deposits, setDeposits] = useState<CashDeposit[]>([]);
  const [depositCloseoutId, setDepositCloseoutId] = useState('');
  const [depositDate, setDepositDate] = useState(() => localDate(new Date()));
  const [depositAmount, setDepositAmount] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [reconcileDepositId, setReconcileDepositId] = useState<number | null>(null);
  const [statementDate, setStatementDate] = useState(() => localDate(new Date()));
  const [statementReference, setStatementReference] = useState('');
  const [expectedCash, setExpectedCash] = useState<string | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canClose = hasPermission(user, 'billing.closeout');
  const canDeposit = hasPermission(user, 'billing.deposit');
  const canVoidDeposit = hasPermission(user, 'billing.deposit.void');
  const canReconcile = hasPermission(user, 'billing.reconcile');
  const isToday = date === localDate(new Date());
  const alreadyClosed = rows.some((row) => row.cashierId === user?.id);
  const selectedCloseout = rows.find((row) => String(row.id) === depositCloseoutId);
  const selectedDeposit = deposits.find((row) => row.id === reconcileDepositId);
  const remaining = selectedCloseout ? Math.max(0, Math.round(Number(selectedCloseout.countedCash) * 100) - deposits.filter((row) => row.closeoutId === selectedCloseout.id && !row.voidedAt).reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0)) / 100 : 0;

  const load = async (selectedDate: string) => {
    setLoading(true); setError('');
    try {
      const [closeouts, recordedDeposits] = await Promise.all([billingApi.listCloseouts(selectedDate), billingApi.listDeposits(selectedDate)]);
      setRows(closeouts); setDeposits(recordedDeposits);
      setDepositCloseoutId((current) => closeouts.some((row) => String(row.id) === current) ? current : '');
      if (selectedDate === localDate(new Date()) && canClose) {
        const report = await billingApi.cashierReport(selectedDate, selectedDate);
        setExpectedCash(report.cashiers.find((row) => row.cashierId === user?.id)?.net ?? '0.00');
      } else setExpectedCash(null);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load cash closeouts')); setRows([]); setDeposits([]); setExpectedCash(null); }
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
  const submitDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedCloseout) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await billingApi.recordDeposit(selectedCloseout.id, depositDate, Number(depositAmount), bankReference.trim(), depositNote.trim() || null);
      setNotice('Bank deposit reference recorded.'); setDepositAmount(''); setBankReference(''); setDepositNote('');
      await load(date);
    } catch (err) { setError(getErrorMessage(err, 'Unable to record bank deposit')); }
    finally { setSaving(false); }
  };
  const voidDeposit = async (deposit: CashDeposit) => {
    const voidReason = window.prompt(`Void bank reference ${deposit.bankReference}? Give a reason (at least 10 characters).`);
    if (voidReason === null) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await billingApi.voidDeposit(deposit.id, voidReason.trim());
      if (reconcileDepositId === deposit.id) setReconcileDepositId(null);
      setNotice(`Bank deposit ${deposit.bankReference} voided. Its amount is available to record again.`);
      await load(date);
    } catch (err) { setError(getErrorMessage(err, 'Unable to void bank deposit')); }
    finally { setSaving(false); }
  };
  const beginReconcile = (deposit: CashDeposit) => {
    setReconcileDepositId(deposit.id); setStatementDate(localDate(new Date())); setStatementReference(''); setError(''); setNotice('');
  };
  const submitReconcile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedDeposit) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await billingApi.reconcileDeposit(selectedDeposit.id, statementDate, statementReference.trim());
      setNotice(`Bank statement match recorded for ${selectedDeposit.bankReference}.`);
      setReconcileDepositId(null); setStatementReference('');
      await load(date);
    } catch (err) { setError(getErrorMessage(err, 'Unable to match bank statement')); }
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
        <h3>Recorded bank deposits</h3>
        <div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Cashier</th><th>Deposit date</th><th>Amount</th><th>Bank reference</th><th>Recorded by</th><th>Status</th><th>Note</th><th>Action</th></tr></thead><tbody>{deposits.map((row) => <tr key={row.id}><td>{row.cashierName}</td><td>{row.depositDate}</td><td>{currency.format(Number(row.amount))}</td><td>{row.bankReference}</td><td>{row.recordedByName}</td><td>{row.voidedAt ? `Voided by ${row.voidedByName || 'unknown'}` : row.statementReference ? `Matched by ${row.matchedByName || 'unknown'}` : 'Recorded'}</td><td>{row.voidedAt ? row.voidReason : row.statementReference ? `${row.statementDate} · ${row.statementReference}` : row.note || '—'}</td><td>{!row.voidedAt && !row.statementReference ? <>{canVoidDeposit && <Button type="button" variant="secondary" onClick={() => void voidDeposit(row)} disabled={saving}>Void</Button>} {canReconcile && <Button type="button" variant="secondary" onClick={() => beginReconcile(row)} disabled={saving}>Match bank</Button>} {!canVoidDeposit && !canReconcile && '—'}</> : '—'}</td></tr>)}{!loading && deposits.length === 0 && <tr><td colSpan={8}>No deposits recorded for these closeouts.</td></tr>}</tbody></table></div>
        {canReconcile && selectedDeposit && !selectedDeposit.voidedAt && !selectedDeposit.statementReference && <form className="billing-form billing-closeout-form" onSubmit={(event) => void submitReconcile(event)}><h3>Match bank deposit</h3><p>Match <strong>{selectedDeposit.bankReference}</strong> for {currency.format(Number(selectedDeposit.amount))} to one bank statement entry. A matched deposit cannot be voided.</p><div className="billing-form__grid"><Input label="Bank statement date" type="date" required min={selectedDeposit.depositDate} max={localDate(new Date())} value={statementDate} onChange={(event) => setStatementDate(event.target.value)} /><Input label="Bank statement reference" required minLength={4} maxLength={120} value={statementReference} onChange={(event) => setStatementReference(event.target.value)} /></div><div className="billing-modal__footer"><Button type="button" variant="secondary" onClick={() => setReconcileDepositId(null)} disabled={saving}>Cancel</Button><Button type="submit" loading={saving} disabled={statementReference.trim().length < 4}>Record bank match</Button></div></form>}
        {canDeposit && rows.length > 0 && <form className="billing-form billing-closeout-form" onSubmit={(event) => void submitDeposit(event)}>
          <h3>Record a bank deposit</h3><p>Record a bank reference for cash already counted at closeout. Remaining for the selected closeout: <strong>{currency.format(remaining)}</strong>.</p>
          <div className="billing-form__grid"><Select label="Cash closeout" required value={depositCloseoutId} onChange={(event) => setDepositCloseoutId(event.target.value)} options={[{ value: '', label: 'Select a cashier closeout' }, ...rows.map((row) => ({ value: row.id, label: `${row.cashierName} · ${row.businessDate} · ${currency.format(Number(row.countedCash))}` }))]} /><Input label="Deposit date" type="date" required min={selectedCloseout?.businessDate} max={localDate(new Date())} value={depositDate} onChange={(event) => setDepositDate(event.target.value)} /><Input label="Amount deposited" type="number" required min="0.01" max={remaining || undefined} step="0.01" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} /><Input label="Bank reference" required minLength={4} maxLength={120} value={bankReference} onChange={(event) => setBankReference(event.target.value)} /></div>
          <Input label="Note (optional)" maxLength={500} value={depositNote} onChange={(event) => setDepositNote(event.target.value)} />
          <div className="billing-modal__footer"><Button type="submit" loading={saving} disabled={!selectedCloseout || remaining <= 0 || !depositAmount || Number(depositAmount) > remaining || bankReference.trim().length < 4}>Record deposit</Button></div>
        </form>}
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
