import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getErrorMessage } from '../../lib/api';
import { billingApi, type BillingCharge } from './billing.api';

export function ChargeMasterPanel({ onClose }: { onClose: () => void }) {
  const [charges, setCharges] = useState<BillingCharge[]>([]);
  const [form, setForm] = useState({ code: '', name: '', category: '', unitPrice: '' });
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; billingApi.listCharges().then((rows) => { if (active) setCharges(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load charges')); }); return () => { active = false; }; }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { code: form.code, name: form.name, category: form.category, unitPrice: Number(form.unitPrice), isActive: editing ? charges.find((charge) => charge.id === editing)?.isActive ?? true : true };
      if (editing) await billingApi.updateCharge(editing, payload); else await billingApi.createCharge(payload);
      setCharges(await billingApi.listCharges()); setEditing(null); setForm({ code: '', name: '', category: '', unitPrice: '' });
    } catch (err) { setError(getErrorMessage(err, 'Unable to save charge')); }
    finally { setBusy(false); }
  };
  const toggle = async (charge: BillingCharge) => { setBusy(true); setError(''); try { await billingApi.updateCharge(charge.id, { isActive: !charge.isActive }); setCharges(await billingApi.listCharges()); } catch (err) { setError(getErrorMessage(err, 'Unable to update charge')); } finally { setBusy(false); } };
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}><section className="billing-modal billing-modal--wide" role="dialog" aria-modal="true" aria-labelledby="charge-master-title" onClick={(event) => event.stopPropagation()}><div className="billing-modal__header"><div><span className="billing-eyebrow">BILLING CATALOG</span><h2 id="charge-master-title">Charge master</h2><p>Set prices for reusable invoice charges.</p></div><button type="button" onClick={onClose} aria-label="Close charge master">×</button></div>{error && <Alert tone="error">{error}</Alert>}
    <form className="billing-form" onSubmit={(event) => void save(event)}><div className="billing-form__grid"><Input label="Code" required minLength={2} maxLength={40} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><Input label="Service name" required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Input label="Category" required minLength={2} maxLength={60} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /><Input label="Unit price" required type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} /></div><div className="billing-modal__footer">{editing && <Button type="button" variant="secondary" onClick={() => { setEditing(null); setForm({ code: '', name: '', category: '', unitPrice: '' }); }}>Cancel edit</Button>}<Button type="submit" loading={busy}>{editing ? 'Save charge' : 'Add charge'}</Button></div></form>
    <div className="billing-form"><div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Code</th><th>Service</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>{charges.map((charge) => <tr key={charge.id}><td>{charge.code}</td><td>{charge.name}</td><td>{charge.category}</td><td>{Number(charge.unitPrice).toFixed(2)}</td><td>{charge.isActive ? 'Active' : 'Inactive'}</td><td><div className="billing-actions"><Button size="sm" variant="secondary" onClick={() => { setEditing(charge.id); setForm({ code: charge.code, name: charge.name, category: charge.category, unitPrice: charge.unitPrice }); }}>Edit</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => void toggle(charge)}>{charge.isActive ? 'Deactivate' : 'Activate'}</Button></div></td></tr>)}</tbody></table>{!charges.length && <p>No charges configured.</p>}</div></div>
  </section></div>;
}
