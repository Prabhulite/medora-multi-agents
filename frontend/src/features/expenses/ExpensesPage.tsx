import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { expensesApi, type ExpenseData, type RecentActivity } from './expenses.api';
import './ExpensesPage.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const categories = ['Supplies', 'Equipment', 'Software', 'Rent', 'Utilities', 'Marketing', 'Other'];

export function ExpensesPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'expenses.manage');
  const [data, setData] = useState<ExpenseData | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', amount: '', date: today(), notes: '' });

  const load = async () => {
    setLoading(true); setError('');
    try { const [expenses, recent] = await Promise.all([expensesApi.list(), expensesApi.activities()]); setData(expenses); setActivities(recent); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load expenses')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await expensesApi.create({ ...form, amount: Number(form.amount), type: 'expense' });
      setOpen(false); setForm({ title: '', category: '', amount: '', date: today(), notes: '' });
      await load(); setNotice('Expense added.');
    } catch (err) { setError(getErrorMessage(err, 'Unable to add expense')); }
    finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    setBusy(true); setError(''); setNotice('');
    try { await expensesApi.remove(id); await load(); setNotice('Expense deleted.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to delete expense')); }
    finally { setBusy(false); }
  };

  return <div className="expenses-page">
    <PageHeader title="Activities & Expenses" subtitle="Track recent activity and spending." actions={canManage ? <Button onClick={() => setOpen(true)}>Add expense</Button> : undefined} />
    {error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <div className="expenses-layout"><main>
      <div className="expenses-summary"><div><span>Total spend</span><strong>{money.format(data?.summary.totalSpend ?? 0)}</strong></div><div><span>Average per expense</span><strong>{money.format(data?.summary.averageSpend ?? 0)}</strong></div><div><span>Categories</span><strong>{data?.summary.categoriesCount ?? 0}</strong></div></div>
      <section className="expenses-card"><h2>Expense records</h2>{loading ? <p>Loading expenses…</p> : !data?.items.length ? <p>No expenses recorded yet.</p> : <div className="expenses-table-wrap"><table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Action</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.entryId}><td>{item.date}</td><td><strong>{item.title}</strong>{item.notes && <small>{item.notes}</small>}</td><td>{item.category}</td><td>{money.format(item.amount)}</td><td>{canManage && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(item.entryId)}>Delete</Button>}</td></tr>)}</tbody></table></div>}</section>
    </main><aside className="expenses-card"><h2>Recent activity</h2>{loading ? <p>Loading activities…</p> : activities.length ? <ol>{activities.map((activity) => <li key={activity.activityId}><span>{activity.message}</span><time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString()}</time></li>)}</ol> : <p>No recent activity.</p>}</aside></div>
    {open && <div className="expenses-backdrop" onClick={() => setOpen(false)}><section className="expenses-dialog" role="dialog" aria-modal="true" aria-labelledby="expense-form-title" onClick={(event) => event.stopPropagation()}><h2 id="expense-form-title">Add expense</h2><form onSubmit={(event) => void create(event)}><label>Title<input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Category<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Amount (₹)<input type="number" required min="0.01" max="9999999999.99" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Date<input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Notes<textarea maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="expenses-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save expense'}</Button></div></form></section></div>}
  </div>;
}

export default ExpensesPage;
