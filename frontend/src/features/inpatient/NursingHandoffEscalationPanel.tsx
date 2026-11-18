import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { inpatientApi, type HandoffReceiver, type NursingHandoffEscalation } from './inpatient.api';

export function NursingHandoffEscalationPanel({ admissionId, handoffId, canEscalate, assignedRecipientId, outgoingById }: { admissionId: number; handoffId: number; canEscalate: boolean; assignedRecipientId: number | null; outgoingById: number }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<NursingHandoffEscalation[]>([]);
  const [search, setSearch] = useState('');
  const [receivers, setReceivers] = useState<HandoffReceiver[]>([]);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError('');
    try { setHistory(await inpatientApi.listNursingHandoffEscalations(admissionId, handoffId)); setOpen(true); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load escalation history')); }
    finally { setBusy(false); }
  };
  const searchStaff = async () => {
    if (search.trim().length < 2) { setError('Enter at least two characters to find staff.'); return; }
    setBusy(true); setError('');
    try { setReceivers((await inpatientApi.handoffReceivers(search.trim())).filter((staff) => staff.id !== assignedRecipientId && staff.id !== outgoingById)); setRecipientId(null); }
    catch (err) { setError(getErrorMessage(err, 'Unable to find staff')); }
    finally { setBusy(false); }
  };
  const escalate = async () => {
    if (!recipientId || reason.trim().length < 5) { setError('Select staff and enter a reason of at least five characters.'); return; }
    setBusy(true); setError('');
    try {
      await inpatientApi.escalateNursingHandoff(admissionId, handoffId, recipientId, reason.trim());
      setHistory(await inpatientApi.listNursingHandoffEscalations(admissionId, handoffId));
      setRecipientId(null); setReceivers([]); setSearch(''); setReason('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to escalate handoff')); }
    finally { setBusy(false); }
  };
  return <div className="inpatient-handoff-assignment">
    <Button size="sm" variant="secondary" disabled={busy} onClick={() => { if (open) setOpen(false); else void load(); }}>{open ? 'Hide escalation history' : canEscalate ? 'Escalate / history' : 'Escalation history'}</Button>
    {error && <Alert tone="error">{error}</Alert>}
    {open ? <div>
      {history.length ? history.map((event) => <p key={event.id}>{new Date(event.createdAt).toLocaleString()} · {event.recipient?.fullName || 'Former staff'} · {event.reason} · raised by {event.raisedBy?.fullName || 'Staff'}</p>) : <p>No escalations recorded.</p>}
      {canEscalate ? <div className="inpatient-handoff-assignment__form">
        <p>Escalation alerts another staff member; the assigned receiver remains responsible for acknowledgement.</p>
        <Input label="Find escalation recipient" value={search} onChange={(event) => { setSearch(event.target.value); setRecipientId(null); setReceivers([]); }} />
        <Button size="sm" variant="secondary" disabled={busy || search.trim().length < 2} onClick={() => void searchStaff()}>Search staff</Button>
        {receivers.length ? <Select label="Escalation recipient" value={recipientId ?? ''} onChange={(event) => setRecipientId(Number(event.target.value))} options={[{ label: 'Select staff', value: '' }, ...receivers.map((staff) => ({ label: staff.fullName, value: staff.id }))]} /> : null}
        <Input label="Escalation reason" minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button size="sm" disabled={busy || !recipientId || reason.trim().length < 5} onClick={() => void escalate()}>Escalate overdue handoff</Button>
      </div> : null}
    </div> : null}
  </div>;
}
