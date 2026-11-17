import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import type { ClinicalEncounter, UpdateClinicalEncounterPayload } from '../../types';
import { clinicalApi } from './clinical.api';
import './DraftEncounterEditor.css';

const vitalFields = [
  ['temperature', 'Temperature (°C)'], ['pulse', 'Pulse (bpm)'], ['bloodPressure', 'Blood pressure'],
  ['spo2', 'SpO₂ (%)'], ['weight', 'Weight (kg)'],
] as const;

export function DraftEncounterEditor({ encounter, onClose, onSaved, onReload }: { encounter: ClinicalEncounter; onClose: () => void; onSaved: () => Promise<void>; onReload: () => Promise<void> }) {
  const [complaints, setComplaints] = useState(encounter.complaints ?? '');
  const [examination, setExamination] = useState(encounter.examination ?? '');
  const [assessment, setAssessment] = useState(encounter.assessment ?? '');
  const [plan, setPlan] = useState(encounter.plan ?? '');
  const [vitals, setVitals] = useState<Record<string, string>>(() => Object.fromEntries(vitalFields.map(([key]) => [key, String(encounter.vitals?.[key] ?? '')])));
  const [editDiagnosis, setEditDiagnosis] = useState(false);
  const [diagnosisMode, setDiagnosisMode] = useState<'free' | 'catalog'>('free');
  const [diagnosisName, setDiagnosisName] = useState(encounter.diagnosisName ?? '');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [diagnosisTermId, setDiagnosisTermId] = useState('');
  const [terms, setTerms] = useState<Array<{ id: number; code: string; name: string; system: string; version: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!editDiagnosis || diagnosisMode !== 'catalog') return;
    let active = true;
    const timer = window.setTimeout(() => { clinicalApi.listDiagnoses(diagnosisSearch).then((rows) => { if (active) setTerms(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load diagnosis terms')); }); }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [editDiagnosis, diagnosisMode, diagnosisSearch]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setStale(false);
    try {
      const payload: UpdateClinicalEncounterPayload = {
        expectedRevision: encounter.revision,
        complaints: complaints.trim() || null,
        examination: examination.trim() || null,
        assessment: assessment.trim() || null,
        plan: plan.trim() || null,
      };
      if (vitalFields.some(([key]) => String(encounter.vitals?.[key] ?? '') !== (vitals[key]?.trim() ?? ''))) {
        payload.vitals = { ...encounter.vitals, ...Object.fromEntries(vitalFields.map(([key]) => [key, vitals[key]?.trim() || null])) };
      }
      if (editDiagnosis) {
        if (diagnosisMode === 'catalog') {
          if (!diagnosisTermId) { setError('Select a diagnosis term.'); return; }
          payload.diagnosisTermId = Number(diagnosisTermId);
        } else { payload.diagnosisTermId = null; payload.diagnosisName = diagnosisName.trim() || null; }
      }
      await clinicalApi.updateDraft(encounter.id, payload);
      await onSaved();
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to update draft');
      setError(message);
      setStale(/revision|finalized|draft|conflict/i.test(message));
    } finally { setBusy(false); }
  };

  return <div className="draft-editor-backdrop" role="presentation" onClick={onClose}>
    <section className="draft-editor" role="dialog" aria-modal="true" aria-labelledby="draft-editor-title" onClick={(event) => event.stopPropagation()}>
      <div className="draft-editor__header"><div><small>ENCOUNTER #{encounter.id} · REVISION {encounter.revision}</small><h2 id="draft-editor-title">Edit clinical draft</h2></div><button type="button" aria-label="Close draft editor" onClick={onClose}>×</button></div>
      <form className="draft-editor__body" onSubmit={(event) => void submit(event)}>
        {error && <Alert tone="error">{error}</Alert>}
        {stale && <Button type="button" variant="secondary" onClick={() => void onReload()}>Reload current draft</Button>}
        <p>Changes are saved as a new draft revision. Signed encounters use addenda.</p>
        <label className="ui-field"><span className="ui-field__label">Presenting complaints</span><textarea className="ui-field__input draft-editor__textarea" maxLength={5000} value={complaints} onChange={(event) => setComplaints(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-field__label">Examination</span><textarea className="ui-field__input draft-editor__textarea" maxLength={5000} value={examination} onChange={(event) => setExamination(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-field__label">Assessment</span><textarea className="ui-field__input draft-editor__textarea" maxLength={5000} value={assessment} onChange={(event) => setAssessment(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-field__label">Plan / treatment</span><textarea className="ui-field__input draft-editor__textarea" maxLength={5000} value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
        <h3>Vitals</h3><div className="draft-editor__grid">{vitalFields.map(([key, label]) => <Input key={key} label={label} maxLength={80} value={vitals[key] ?? ''} onChange={(event) => setVitals((current) => ({ ...current, [key]: event.target.value }))} />)}</div>
        <div className="draft-editor__diagnosis"><label><input type="checkbox" checked={editDiagnosis} onChange={(event) => setEditDiagnosis(event.target.checked)} /> Change diagnosis</label>{!editDiagnosis && <small>Current: {encounter.diagnosisName || 'None'}{encounter.diagnosisCode ? ` (${encounter.diagnosisSystem} ${encounter.diagnosisCode})` : ''}</small>}</div>
        {editDiagnosis && <><Select label="Diagnosis source" value={diagnosisMode} onChange={(event) => setDiagnosisMode(event.target.value as 'free' | 'catalog')} options={[{ value: 'free', label: 'Free text or clear' }, { value: 'catalog', label: 'Verified catalog term' }]} />{diagnosisMode === 'free' ? <Input label="Diagnosis name" maxLength={160} value={diagnosisName} onChange={(event) => setDiagnosisName(event.target.value)} /> : <><Input label="Search diagnosis catalog" value={diagnosisSearch} onChange={(event) => setDiagnosisSearch(event.target.value)} /><Select label="Catalog term" required value={diagnosisTermId} onChange={(event) => setDiagnosisTermId(event.target.value)} options={[{ value: '', label: 'Select a term' }, ...terms.map((term) => ({ value: term.id, label: `${term.system} ${term.code} · ${term.name}` }))]} /></>}</>}
        <div className="draft-editor__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save draft revision</Button></div>
      </form>
    </section>
  </div>;
}
