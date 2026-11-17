import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { inpatientApi, type HandoffReceiver, type NursingHandoffAssignment } from './inpatient.api';

export function NursingHandoffAssignmentPanel({ admissionId, handoffId, canReassign, onReassigned }: { admissionId: number; handoffId: number; canReassign: boolean; onReassigned: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<NursingHandoffAssignment[]>([]);
  const [search, setSearch] = useState('');
  const [receivers, setReceivers] = useState<HandoffReceiver[]>([]);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loadHistory = async () => {
    setBusy(true); setError('');
    try { setHistory(await inpatientApi.listNursingHandoffAssignments(admissionId, handoffId)); setOpen(true); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load assignment history')); }
    finally { setBusy(false); }
  };
  const searchStaff = async () => {
    if (search.trim().length < 2) { setError('Enter at least two characters to find staff.'); return; }
    setBusy(true); setError('');
    try { setReceivers(await inpatientApi.handoffReceivers(search.trim())); setRecipientId(null); }
    catch (err) { setError(getErrorMessage(err, 'Unable to find staff')); }
    finally { setBusy(false); }
  };
  const reassign = async () => {
    if (!recipientId || reason.trim().length < 5) { setError('Select a receiver and enter a reason of at least five characters.'); return; }
    setBusy(true); setError('');
    try {
      await inpatientApi.reassignNursingHandoff(admissionId, handoffId, recipientId, reason.trim());
      await onReassigned();
      setHistory(await inpatientApi.listNursingHandoffAssignments(admissionId, handoffId));
      setRecipientId(null); setReceivers([]); setSearch(''); setReason(''); setOpen(true);
    } catch (err) { setError(getErrorMessage(err, 'Unable to reassign handoff')); }
    finally { setBusy(false); }
  };
  return <div className="inpatient-handoff-assignment">
    <Button size="sm" variant="secondary" disabled={busy} onClick={() => { if (open) setOpen(false); else void loadHistory(); }}>{open ? 'Hide assignment history' : 'Assignment history'}</Button>
    {error && <Alert tone="error">{error}</Alert>}
    {open ? <div>
      {history.length ? history.map((event) => <p key={event.id}>{new Date(event.createdAt).toLocaleString()} · {event.fromRecipient?.fullName || 'Unassigned'} → {event.toRecipient?.fullName || 'Unassigned'} · {event.reason} · {event.changedBy?.fullName || 'Staff'}</p>) : <p>No reassignments recorded.</p>}
      {canReassign ? <div className="inpatient-handoff-assignment__form">
        <Input label="Find new receiving staff" value={search} onChange={(event) => { setSearch(event.target.value); setRecipientId(null); setReceivers([]); }} />
        <Button size="sm" variant="secondary" disabled={busy || search.trim().length < 2} onClick={() => void searchStaff()}>Search staff</Button>
        {receivers.length ? <Select label="New receiver" value={recipientId ?? ''} onChange={(event) => setRecipientId(Number(event.target.value))} options={[{ label: 'Select staff', value: '' }, ...receivers.map((staff) => ({ label: staff.fullName, value: staff.id }))]} /> : null}
        <Input label="Reassignment reason" minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button size="sm" disabled={busy || !recipientId || reason.trim().length < 5} onClick={() => void reassign()}>Reassign handoff</Button>
      </div> : null}
    </div> : null}
  </div>;
}
