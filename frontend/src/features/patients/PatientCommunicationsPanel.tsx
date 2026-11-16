import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { patientsApi } from './patients.api';

type Communication = Awaited<ReturnType<typeof patientsApi.communications>>[number];
const localNow = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };

export function PatientCommunicationsPanel({ patientId, canRecord }: { patientId: number; canRecord: boolean }) {
  const [rows, setRows] = useState<Communication[]>([]);
  const [channel, setChannel] = useState('phone');
  const [direction, setDirection] = useState('outbound');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [occurredAt, setOccurredAt] = useState(localNow);
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => { try { setRows(await patientsApi.communications(patientId)); } catch (err) { setError(getErrorMessage(err, 'Unable to load patient contact history')); } };
  useEffect(() => { void load(); }, [patientId]);
  const save = async () => {
    if (subject.trim().length < 2 || summary.trim().length < 2 || !occurredAt) { setError('Enter the contact time, subject, and summary.'); return; }
    setBusy(true); setError('');
    try {
      await patientsApi.recordCommunication(patientId, { channel, direction, subject, summary, occurredAt: new Date(occurredAt).toISOString(), followUpDueAt: followUpDueAt ? new Date(followUpDueAt).toISOString() : null });
      setSubject(''); setSummary(''); setOccurredAt(localNow()); setFollowUpDueAt(''); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to record patient contact')); }
    finally { setBusy(false); }
  };
  const complete = async (communicationId: number) => {
    const note = window.prompt('How was this follow-up completed?');
    if (!note?.trim()) return;
    setBusy(true); setError('');
    try { await patientsApi.completeFollowUp(patientId, communicationId, note.trim()); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to complete follow-up')); }
    finally { setBusy(false); }
  };

  return <section className="pd-card pd-card--wide">
    <div className="pd-card__head"><h3>Patient communications</h3></div>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {canRecord ? <div className="clinical-prescription-form">
      <Select label="Channel" value={channel} onChange={(event) => setChannel(event.target.value)} options={['phone', 'sms', 'email', 'in_person', 'other'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))} />
      <Select label="Direction" value={direction} onChange={(event) => setDirection(event.target.value)} options={[{ value: 'outbound', label: 'Outbound' }, { value: 'inbound', label: 'Inbound' }]} />
      <Input label="Contact time" type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
      <Input label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
      <label className="ui-field"><span className="ui-field__label">Summary</span><textarea className="ui-field__input clinical-encounter-textarea" value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      <Input label="Follow-up due (optional)" type="datetime-local" value={followUpDueAt} onChange={(event) => setFollowUpDueAt(event.target.value)} />
      <Button size="sm" loading={busy} onClick={() => void save()}>Record Contact</Button>
    </div> : null}
    <div className="pd-card__body pd-visits">
      {rows.length ? rows.map((row) => <div className="pd-visit-row" key={row.id}><div><div className="ui-table__cell-title">{row.subject}</div><div className="ui-table__cell-sub">{row.channel.replaceAll('_', ' ')} · {row.direction} · {row.summary}{row.followUpDueAt ? ` · Follow up: ${new Date(row.followUpDueAt).toLocaleString()}${row.followUpCompletedAt ? ` (completed ${new Date(row.followUpCompletedAt).toLocaleString()})` : ' (open)'}` : ''}{row.followUpCompletionNote ? ` · ${row.followUpCompletionNote}` : ''}</div></div><div><strong>{new Date(row.occurredAt).toLocaleString()}</strong>{canRecord && row.followUpDueAt && !row.followUpCompletedAt ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void complete(row.id)}>Complete follow-up</Button> : null}</div></div>) : <p className="pd-empty">No patient contacts recorded.</p>}
    </div>
  </section>;
}
