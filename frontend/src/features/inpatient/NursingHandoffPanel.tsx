import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { inpatientApi, type Admission, type NursingHandoff } from './inpatient.api';

export function NursingHandoffPanel({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const { user } = useAuth();
  const canUpdate = hasPermission(user, 'inpatient.update') && ['admitted', 'transferred'].includes(admission.status);
  const [rows, setRows] = useState<NursingHandoff[]>([]);
  const [form, setForm] = useState({ conditionSummary: '', pendingTasks: '', safetyConcerns: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    inpatientApi.listNursingHandoffs(admission.id).then((result) => { if (active) setRows(result); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load handoffs')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admission.id]);
  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await inpatientApi.createNursingHandoff(admission.id, { ...form, safetyConcerns: form.safetyConcerns || null });
      setRows(await inpatientApi.listNursingHandoffs(admission.id));
      setForm({ conditionSummary: '', pendingTasks: '', safetyConcerns: '' });
    } catch (err) { setError(getErrorMessage(err, 'Unable to record handoff')); }
    finally { setBusy(false); }
  };
  const acknowledge = async (handoffId: number) => {
    setBusy(true); setError('');
    try { await inpatientApi.acknowledgeNursingHandoff(admission.id, handoffId); setRows(await inpatientApi.listNursingHandoffs(admission.id)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to acknowledge handoff')); }
    finally { setBusy(false); }
  };
  const pending = rows.some((row) => !row.acknowledgedAt);
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="handoff-title" onClick={(event) => event.stopPropagation()}>
    <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">NURSING HANDOFF</span><h2 id="handoff-title">{admission.patientName}</h2><p>{admission.admissionNumber} · {admission.wardName} / bed {admission.bedNumber}</p></div><button type="button" onClick={onClose} aria-label="Close handoffs">×</button></div>
    {error && <Alert tone="error">{error}</Alert>}
    {canUpdate && !pending && !loading ? <form onSubmit={(event) => void create(event)}><div className="inpatient-form-grid">
      <label className="inpatient-textarea"><span>Current condition *</span><textarea required minLength={2} maxLength={5000} rows={3} value={form.conditionSummary} onChange={(event) => setForm({ ...form, conditionSummary: event.target.value })} /></label>
      <label className="inpatient-textarea"><span>Pending tasks *</span><textarea required minLength={2} maxLength={5000} rows={3} value={form.pendingTasks} onChange={(event) => setForm({ ...form, pendingTasks: event.target.value })} /></label>
      <label className="inpatient-textarea"><span>Safety concerns</span><textarea maxLength={5000} rows={2} value={form.safetyConcerns} onChange={(event) => setForm({ ...form, safetyConcerns: event.target.value })} /></label>
    </div><div className="inpatient-modal__footer"><Button type="submit" loading={busy}>Record handoff</Button></div></form> : pending ? <p className="inpatient-empty">A handoff is awaiting acknowledgement before the next one can be recorded.</p> : null}
    <div className="inpatient-observations"><h3>Handoff history</h3>{loading ? <p>Loading handoffs…</p> : rows.length ? rows.map((row) => <article key={row.id}><strong>{new Date(row.createdAt).toLocaleString()} · {row.outgoingBy.fullName}</strong><span>{row.acknowledgedAt ? `Acknowledged ${new Date(row.acknowledgedAt).toLocaleString()} by ${row.acknowledgedBy?.fullName || 'Staff'}` : 'Awaiting acknowledgement'}</span><p>Condition: {row.conditionSummary}</p><p>Pending tasks: {row.pendingTasks}</p>{row.safetyConcerns && <p>Safety concerns: {row.safetyConcerns}</p>}{canUpdate && !row.acknowledgedAt && row.outgoingBy.id !== user?.id ? <Button size="sm" disabled={busy} onClick={() => void acknowledge(row.id)}>Acknowledge handoff</Button> : null}</article>) : <p>No handoffs recorded.</p>}</div>
  </section></div>;
}
