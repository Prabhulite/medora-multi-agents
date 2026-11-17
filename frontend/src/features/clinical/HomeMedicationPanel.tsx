import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { homeMedicationApi, type HomeMedication, type HomeMedicationSource } from './homeMedication.api';

const sourceLabels: Record<HomeMedicationSource, string> = {
  patient: 'Patient reported',
  caregiver: 'Caregiver reported',
  records: 'Prior records',
  other: 'Other source',
};

export function HomeMedicationPanel({ patientId, canCreate }: { patientId: number; canCreate: boolean }) {
  const [rows, setRows] = useState<HomeMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('');
  const [source, setSource] = useState<HomeMedicationSource>('patient');
  const [sourceDetail, setSourceDetail] = useState('');
  const [ceasingId, setCeasingId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRows([]);
    setCeasingId(null);
    void homeMedicationApi.list(patientId)
      .then((result) => { if (active) setRows(result); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load home medications')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId]);

  const record = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = medicineName.trim();
    if (name.length < 2 || name.length > 160) { setError('Medicine name must be 2 to 160 characters.'); return; }
    setBusy(true);
    setError('');
    try {
      const row = await homeMedicationApi.create(patientId, {
        medicineName: name,
        ...(dosage.trim() && { dosage: dosage.trim() }),
        ...(frequency.trim() && { frequency: frequency.trim() }),
        ...(route.trim() && { route: route.trim() }),
        source,
        ...(sourceDetail.trim() && { sourceDetail: sourceDetail.trim() }),
      });
      setRows((current) => [row, ...current]);
      setMedicineName(''); setDosage(''); setFrequency(''); setRoute(''); setSourceDetail('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to record home medication')); }
    finally { setBusy(false); }
  };

  const cease = async (event: FormEvent<HTMLFormElement>, id: number) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5 || trimmedReason.length > 500) { setError('Cessation reason must be 5 to 500 characters.'); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await homeMedicationApi.cease(patientId, id, trimmedReason);
      setRows((current) => current.map((row) => row.id === id ? updated : row).sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent)));
      setCeasingId(null);
      setReason('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to cease home medication')); }
    finally { setBusy(false); }
  };

  return <section className="clinical-prescription-section" aria-label="Home medication history">
    <h4>Home medication history</h4>
    <Alert tone="warning">Unverified medication history from the patient or another reported source. This is not a prescription. Confirm medicines before clinical use.</Alert>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {loading ? <p>Loading home medications…</p> : rows.length ? rows.map((row) => <div key={row.id} className="pd-visit-row">
      <div>
        <div className="ui-table__cell-title">{row.medicineName} · {row.isCurrent ? 'Current' : 'Ceased'}</div>
        <div className="ui-table__cell-sub">
          {[row.dosage, row.frequency, row.route].filter(Boolean).join(' · ') || 'Dose and schedule not recorded'}
          {' · '}{sourceLabels[row.source]}{row.sourceDetail ? ` (${row.sourceDetail})` : ''}
          {' · Recorded '}{new Date(row.recordedAt).toLocaleString()}
          {!row.isCurrent && row.ceasedAt ? ` · Ceased ${new Date(row.ceasedAt).toLocaleString()}` : ''}
          {row.cessationReason ? ` · Reason: ${row.cessationReason}` : ''}
        </div>
      </div>
      {canCreate && row.isCurrent && ceasingId !== row.id ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setCeasingId(row.id); setReason(''); setError(''); }}>Cease</Button> : null}
      {canCreate && row.isCurrent && ceasingId === row.id ? <form onSubmit={(event) => void cease(event, row.id)}>
        <Input label="Reason for ceasing" value={reason} minLength={5} maxLength={500} required onChange={(event) => setReason(event.target.value)} />
        <Button size="sm" variant="danger" type="submit" loading={busy}>Confirm cease</Button>{' '}
        <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={() => { setCeasingId(null); setReason(''); }}>Cancel</Button>
      </form> : null}
    </div>) : <p className="pd-empty">No home medications recorded.</p>}
    {canCreate ? <form className="clinical-prescription-form" onSubmit={(event) => void record(event)}>
      <h4>Record home medication</h4>
      <Input label="Medicine name" value={medicineName} minLength={2} maxLength={160} required onChange={(event) => setMedicineName(event.target.value)} />
      <Input label="Dosage (optional)" value={dosage} onChange={(event) => setDosage(event.target.value)} />
      <Input label="Frequency (optional)" value={frequency} onChange={(event) => setFrequency(event.target.value)} />
      <Input label="Route (optional)" value={route} onChange={(event) => setRoute(event.target.value)} />
      <Select label="Information source" value={source} options={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setSource(event.target.value as HomeMedicationSource)} />
      <Input label="Source detail (optional)" value={sourceDetail} onChange={(event) => setSourceDetail(event.target.value)} />
      <Button size="sm" type="submit" loading={busy}>Record medication history</Button>
    </form> : null}
  </section>;
}
