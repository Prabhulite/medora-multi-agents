import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { glucoseApi, type GlucoseContext, type GlucoseReading } from './glucose.api';
import './GlucoseMonitoringPanel.css';

const labels: Record<GlucoseContext, string> = { fasting: 'Fasting', random: 'Random', post_meal: 'Post meal' };
function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
export function GlucoseMonitoringPanel({ patientId, canCreate = true }: { patientId: number; canCreate?: boolean }) {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [value, setValue] = useState('');
  const [context, setContext] = useState<GlucoseContext>('random');
  const [measuredAt, setMeasuredAt] = useState(localDateTime);
  const [notes, setNotes] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setReadings(await glucoseApi.list(patientId)); }
    catch { setError('Could not load glucose readings.'); }
    finally { setLoading(false); }
  }, [patientId]);
  useEffect(() => { void load(); }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 10 || numericValue > 1000 || Math.round(numericValue * 10) !== numericValue * 10) {
      setError('Enter a glucose value from 10 to 1000 mg/dL, to one decimal place.'); return;
    }
    const timestamp = new Date(measuredAt);
    if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now() + 60_000) { setError('Enter a valid measurement time that is not in the future.'); return; }
    setSaving(true); setError('');
    try {
      await glucoseApi.create(patientId, { valueMgDl: numericValue, context, measuredAt: timestamp.toISOString(), notes: notes.trim() || null });
      setValue(''); setNotes(''); setMeasuredAt(localDateTime()); await load();
    } catch { setError('Could not save glucose reading.'); }
    finally { setSaving(false); }
  }
  return <section className="glucose-panel" aria-label="Blood glucose monitoring">
    <h2>Blood glucose monitoring</h2>
    {canCreate && <form onSubmit={submit}>
      <label>Glucose (mg/dL) <input type="number" min="10" max="1000" step="0.1" required value={value} onChange={event => setValue(event.target.value)} /></label>{' '}
      <label>Context <select value={context} onChange={event => setContext(event.target.value as GlucoseContext)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{' '}
      <label>Measured at <input type="datetime-local" required value={measuredAt} onChange={event => setMeasuredAt(event.target.value)} /></label>{' '}
      <label>Notes <input maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} /></label>{' '}
      <button disabled={saving} type="submit">{saving ? 'Saving…' : 'Add reading'}</button>
    </form>}
    {error && <p role="alert">{error}</p>}
    {loading ? <p>Loading readings…</p> : readings.length === 0 ? <p>No glucose readings recorded.</p> : <table>
      <thead><tr><th scope="col">Measured at</th><th scope="col">Glucose</th><th scope="col">Context</th><th scope="col">Notes</th><th scope="col">Recorded by</th></tr></thead>
      <tbody>{readings.map(reading => <tr key={reading.id}><td>{new Date(reading.measuredAt).toLocaleString()}</td><td>{reading.valueMgDl} mg/dL</td><td>{labels[reading.context]}</td><td>{reading.notes || '—'}</td><td>{reading.authorName}</td></tr>)}</tbody>
    </table>}
  </section>;
}
