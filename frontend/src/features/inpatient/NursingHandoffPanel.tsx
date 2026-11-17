import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { inpatientApi, type Admission, type HandoffReceiver, type NursingHandoff } from './inpatient.api';
import { NursingHandoffAssignmentPanel } from './NursingHandoffAssignmentPanel';

export function NursingHandoffPanel({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const { user } = useAuth();
  const canUpdate = hasPermission(user, 'inpatient.update') && ['admitted', 'transferred'].includes(admission.status);
  const canReassign = ['inpatient.view', 'inpatient.update', 'inpatient.handoff.reassign'].every((permission) => hasPermission(user, permission)) && ['admitted', 'transferred'].includes(admission.status);
  const [rows, setRows] = useState<NursingHandoff[]>([]);
  const [form, setForm] = useState({ conditionSummary: '', pendingTasks: '', safetyConcerns: '' });
  const [receiverSearch, setReceiverSearch] = useState('');
  const [receivers, setReceivers] = useState<HandoffReceiver[]>([]);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    inpatientApi.listNursingHandoffs(admission.id).then((result) => { if (active) setRows(result); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load handoffs')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admission.id]);
  const searchReceivers = async () => {
    if (receiverSearch.trim().length < 2) { setError('Enter at least two characters to find receiving staff.'); return; }
    setBusy(true); setError('');
    try { setReceivers(await inpatientApi.handoffReceivers(receiverSearch.trim())); setRecipientId(null); }
    catch (err) { setError(getErrorMessage(err, 'Unable to find receiving staff')); }
    finally { setBusy(false); }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!recipientId) { setError('Select receiving staff.'); return; }
      await inpatientApi.createNursingHandoff(admission.id, { ...form, recipientId, safetyConcerns: form.safetyConcerns || null });
      setRows(await inpatientApi.listNursingHandoffs(admission.id));
      setForm({ conditionSummary: '', pendingTasks: '', safetyConcerns: '' });
      setRecipientId(null); setReceiverSearch(''); setReceivers([]);
    } catch (err) { setError(getErrorMessage(err, 'Unable to record handoff')); }
    finally { setBusy(false); }
  };
  const acknowledge = async (handoffId: number) => {
    setBusy(true); setError('');
    try { await inpatientApi.acknowledgeNursingHandoff(admission.id, handoffId); setRows(await inpatientApi.listNursingHandoffs(admission.id)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to acknowledge handoff')); }
    finally { setBusy(false); }
  };
  const pending = rows.some((row) => !row.acknowledgedAt && !row.closedOnDischargeAt);
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="handoff-title" onClick={(event) => event.stopPropagation()}>
    <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">NURSING HANDOFF</span><h2 id="handoff-title">{admission.patientName}</h2><p>{admission.admissionNumber} · {admission.wardName} / bed {admission.bedNumber}</p></div><button type="button" onClick={onClose} aria-label="Close handoffs">×</button></div>
    {error && <Alert tone="error">{error}</Alert>}
    {canUpdate && !pending && !loading ? <form onSubmit={(event) => void create(event)}><div className="inpatient-form-grid">
      <div><Input label="Find receiving staff by name or employee ID" value={receiverSearch} onChange={(event) => { setReceiverSearch(event.target.value); setRecipientId(null); setReceivers([]); }} /><Button type="button" size="sm" variant="secondary" disabled={busy || receiverSearch.trim().length < 2} onClick={() => void searchReceivers()}>Search staff</Button></div>
      {receivers.length ? <Select label="Receiving staff *" value={recipientId ?? ''} required onChange={(event) => setRecipientId(Number(event.target.value))} options={[{ label: 'Select receiving staff', value: '' }, ...receivers.map((staff) => ({ label: `${staff.fullName}${staff.employeeId ? ` · ${staff.employeeId}` : ''}`, value: staff.id }))]} /> : null}
      <label className="inpatient-textarea"><span>Current condition *</span><textarea required minLength={2} maxLength={5000} rows={3} value={form.conditionSummary} onChange={(event) => setForm({ ...form, conditionSummary: event.target.value })} /></label>
      <label className="inpatient-textarea"><span>Pending tasks *</span><textarea required minLength={2} maxLength={5000} rows={3} value={form.pendingTasks} onChange={(event) => setForm({ ...form, pendingTasks: event.target.value })} /></label>
      <label className="inpatient-textarea"><span>Safety concerns</span><textarea maxLength={5000} rows={2} value={form.safetyConcerns} onChange={(event) => setForm({ ...form, safetyConcerns: event.target.value })} /></label>
    </div><div className="inpatient-modal__footer"><Button type="submit" loading={busy}>Record handoff</Button></div></form> : pending ? <p className="inpatient-empty">A handoff is awaiting acknowledgement before the next one can be recorded.</p> : null}
    <div className="inpatient-observations"><h3>Handoff history</h3>{loading ? <p>Loading handoffs…</p> : rows.length ? rows.map((row) => <article key={row.id}><strong>{new Date(row.createdAt).toLocaleString()} · {row.outgoingBy.fullName}</strong><span>{row.closedOnDischargeAt ? `Closed on discharge ${new Date(row.closedOnDischargeAt).toLocaleString()} by ${row.closedOnDischargeBy?.fullName || 'Staff'}` : row.acknowledgedAt ? `Acknowledged ${new Date(row.acknowledgedAt).toLocaleString()} by ${row.acknowledgedBy?.fullName || 'Staff'}` : `Awaiting ${row.recipient?.fullName || 'receiving staff'}`}</span><p>Condition: {row.conditionSummary}</p><p>Pending tasks: {row.pendingTasks}</p>{row.safetyConcerns && <p>Safety concerns: {row.safetyConcerns}</p>}{canUpdate && !row.acknowledgedAt && !row.closedOnDischargeAt && row.outgoingBy.id !== user?.id && (!row.recipientId || row.recipientId === user?.id) ? <Button size="sm" disabled={busy} onClick={() => void acknowledge(row.id)}>Acknowledge handoff</Button> : null}<NursingHandoffAssignmentPanel admissionId={admission.id} handoffId={row.id} canReassign={canReassign && !row.acknowledgedAt && !row.closedOnDischargeAt} onReassigned={async () => setRows(await inpatientApi.listNursingHandoffs(admission.id))} /></article>) : <p>No handoffs recorded.</p>}</div>
  </section></div>;
}
