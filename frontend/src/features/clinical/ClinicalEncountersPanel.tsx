import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { ClinicalEncounter } from '../../types';
import { HomeMedicationPanel } from './HomeMedicationPanel';
import { useAuth } from '../auth/AuthContext';
import { clinicalApi } from './clinical.api';
import { prescriptionsApi } from './prescriptions.api';
import { ConsentPanel } from './ConsentPanel';

function dateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ClinicalEncountersPanel({ patientId, onAllergiesChanged }: { patientId: number; onAllergiesChanged?: () => void }) {
  const { user } = useAuth();
  const canCreateClinical = hasPermission(user, 'clinical.create');
  const canSignClinical = hasPermission(user, 'clinical.update');
  const canManageDiagnosisCatalog = hasPermission(user, 'clinical.catalog.manage');
  const canViewPharmacy = hasPermission(user, 'pharmacy.view') || hasPermission(user, 'pharmacy.inventory.update');
  const canCreatePharmacy = hasPermission(user, 'pharmacy.create');
  const [rows, setRows] = useState<ClinicalEncounter[]>([]);
  const [addendumEncounterId, setAddendumEncounterId] = useState<number | null>(null);
  const [addendumReason, setAddendumReason] = useState('');
  const [addendumText, setAddendumText] = useState('');
  const [allergies, setAllergies] = useState<Array<{ id: number; allergen: string; reaction: string | null; severity: string | null }>>([]);
  const [medicalHistory, setMedicalHistory] = useState<Array<{ id: number; conditionName: string; diagnosedOn: string | null; notes: string | null }>>([]);
  const [conditionName, setConditionName] = useState('');
  const [diagnosedOn, setDiagnosedOn] = useState('');
  const [historyNotes, setHistoryNotes] = useState('');
  const [allergen, setAllergen] = useState('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState('unknown');
  const [prescriptions, setPrescriptions] = useState<Array<{ id: number; medicineName: string; dosage: string | null; frequency: string | null; durationDays: number | null; quantityPrescribed: number | null; route: string; instructions: string | null }>>([]);
  const [medications, setMedications] = useState<Array<{ id: number; brandName: string; genericName: string; medicineCode: string }>>([]);
  const [medicationId, setMedicationId] = useState('');
  const [complaints, setComplaints] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [diagnosisTermId, setDiagnosisTermId] = useState('');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [diagnosisTerms, setDiagnosisTerms] = useState<Array<{ id: number; system: string; code: string; name: string; version: string }>>([]);
  const [newDiagnosisSystem, setNewDiagnosisSystem] = useState<'local' | 'ICD-10' | 'ICD-11'>('local');
  const [newDiagnosisCode, setNewDiagnosisCode] = useState('');
  const [newDiagnosisName, setNewDiagnosisName] = useState('');
  const [newDiagnosisVersion, setNewDiagnosisVersion] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulse, setPulse] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [quantityPrescribed, setQuantityPrescribed] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [encounters, medicationRows, allergyRows, historyRows] = await Promise.all([clinicalApi.listByPatient(patientId), canViewPharmacy ? prescriptionsApi.listByPatient(patientId) : Promise.resolve([]), clinicalApi.listAllergies(patientId), clinicalApi.listMedicalHistory(patientId)]);
      setRows(encounters); setPrescriptions(medicationRows); setAllergies(allergyRows); setMedicalHistory(historyRows);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load clinical records')); }
  };

  const savePrescription = async () => {
    if (!medicineName.trim()) { setError('Enter a medicine name before saving.'); return; }
    setBusy(true); setError('');
    try {
      await prescriptionsApi.create({ patientId, medicineName, medicationId: medicationId ? Number(medicationId) : null, dosage, frequency, durationDays: durationDays ? Number(durationDays) : null, quantityPrescribed: quantityPrescribed ? Number(quantityPrescribed) : null, instructions });
      setMedicineName(''); setMedicationId(''); setDosage(''); setFrequency(''); setDurationDays(''); setQuantityPrescribed(''); setInstructions(''); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save prescription')); }
    finally { setBusy(false); }
  };

  const saveAllergy = async () => {
    if (allergen.trim().length < 2) { setError('Enter the allergen before saving.'); return; }
    setBusy(true); setError('');
    try { await clinicalApi.createAllergy(patientId, { allergen, reaction: reaction || null, severity }); setAllergen(''); setReaction(''); setSeverity('unknown'); await load(); onAllergiesChanged?.(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to record allergy')); }
    finally { setBusy(false); }
  };

  const removeAllergy = async (allergyId: number) => {
    if (!window.confirm('Remove this allergy record? Check the patient chart before continuing.')) return;
    setBusy(true); setError('');
    try { await clinicalApi.removeAllergy(patientId, allergyId); await load(); onAllergiesChanged?.(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to remove allergy')); }
    finally { setBusy(false); }
  };

  const saveMedicalHistory = async () => {
    if (conditionName.trim().length < 2) { setError('Enter a condition before saving.'); return; }
    setBusy(true); setError('');
    try { await clinicalApi.createMedicalHistory(patientId, { conditionName, diagnosedOn: diagnosedOn || null, notes: historyNotes || null }); setConditionName(''); setDiagnosedOn(''); setHistoryNotes(''); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to record medical history')); }
    finally { setBusy(false); }
  };

  const removeMedicalHistory = async (recordId: number) => {
    if (!window.confirm('Remove this medical history record?')) return;
    setBusy(true); setError('');
    try { await clinicalApi.removeMedicalHistory(patientId, recordId); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to remove medical history')); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, [patientId]);
  useEffect(() => {
    if (!canCreateClinical && !canManageDiagnosisCatalog) return;
    const timer = window.setTimeout(() => {
      clinicalApi.listDiagnoses(diagnosisSearch).then(setDiagnosisTerms).catch((err) => setError(getErrorMessage(err, 'Unable to load diagnosis terms')));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [canCreateClinical, canManageDiagnosisCatalog, diagnosisSearch]);
  useEffect(() => { if (canCreatePharmacy) prescriptionsApi.listMedications().then(setMedications).catch(() => undefined); }, [canCreatePharmacy]);

  const save = async () => {
    if (!complaints.trim() && !assessment.trim() && !plan.trim()) {
      setError('Enter a complaint, assessment, or care plan before saving.');
      return;
    }
    setBusy(true); setError('');
    try {
      await clinicalApi.create({
        patientId, complaints, assessment, plan, diagnosisName: diagnosisTermId ? null : diagnosisName,
        diagnosisTermId: diagnosisTermId ? Number(diagnosisTermId) : null,
        vitals: { temperature, pulse, bloodPressure, spo2, weight },
      });
      setComplaints(''); setAssessment(''); setPlan(''); setDiagnosisName(''); setDiagnosisTermId('');
      setTemperature(''); setPulse(''); setBloodPressure(''); setSpo2(''); setWeight('');
      await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save clinical encounter')); }
    finally { setBusy(false); }
  };

  const addDiagnosisTerm = async () => {
    if (!newDiagnosisCode.trim() || newDiagnosisName.trim().length < 2) { setError('Enter a diagnosis code and name.'); return; }
    setBusy(true); setError('');
    try {
      await clinicalApi.createDiagnosis({ system: newDiagnosisSystem, code: newDiagnosisCode, name: newDiagnosisName, version: newDiagnosisVersion });
      setNewDiagnosisCode(''); setNewDiagnosisName(''); setNewDiagnosisVersion('');
      setDiagnosisTerms(await clinicalApi.listDiagnoses(diagnosisSearch));
    } catch (err) { setError(getErrorMessage(err, 'Unable to create diagnosis term')); }
    finally { setBusy(false); }
  };

  const deactivateDiagnosisTerm = async (id: number) => {
    if (!window.confirm('Deactivate this diagnosis term for future encounters? Existing records will remain unchanged.')) return;
    setBusy(true); setError('');
    try {
      await clinicalApi.deactivateDiagnosis(id);
      if (diagnosisTermId === String(id)) setDiagnosisTermId('');
      setDiagnosisTerms(await clinicalApi.listDiagnoses(diagnosisSearch));
    } catch (err) { setError(getErrorMessage(err, 'Unable to deactivate diagnosis term')); }
    finally { setBusy(false); }
  };

  const signEncounter = async (id: number) => {
    if (!window.confirm('Sign and finalize this clinical encounter?')) return;
    setBusy(true); setError('');
    try { await clinicalApi.signEncounter(id); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to sign encounter')); }
    finally { setBusy(false); }
  };

  const saveAddendum = async (id: number) => {
    if (addendumReason.trim().length < 2 || addendumText.trim().length < 2) { setError('Enter the reason and addendum text.'); return; }
    setBusy(true); setError('');
    try { await clinicalApi.addEncounterAddendum(id, { reason: addendumReason, addendum: addendumText }); setAddendumEncounterId(null); setAddendumReason(''); setAddendumText(''); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to record addendum')); }
    finally { setBusy(false); }
  };

  return (
    <section className="pd-card pd-card--wide">
      <div className="pd-card__head"><h3>Clinical Encounters</h3><Badge tone="info">EMR</Badge></div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ConsentPanel patientId={patientId} canCreate={canCreateClinical} />
      <HomeMedicationPanel patientId={patientId} canCreate={canCreateClinical} />
      <div className="clinical-prescription-section">
        <h4>Medical history</h4>
        {medicalHistory.length ? medicalHistory.map((item) => <div key={item.id} className="pd-visit-row"><div><div className="ui-table__cell-title">{item.conditionName}</div><div className="ui-table__cell-sub">{[item.diagnosedOn ? `Diagnosed: ${item.diagnosedOn}` : null, item.notes].filter(Boolean).join(' · ') || 'Date and notes not recorded'}</div></div>{canCreateClinical ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void removeMedicalHistory(item.id)}>Remove</Button> : null}</div>) : <p className="pd-empty">No medical history recorded.</p>}
        {canCreateClinical ? <div className="clinical-prescription-form">
          <Input label="Condition" value={conditionName} onChange={(event) => setConditionName(event.target.value)} placeholder="e.g. Diabetes" />
          <Input label="Diagnosed on" type="date" value={diagnosedOn} onChange={(event) => setDiagnosedOn(event.target.value)} />
          <Input label="History notes" value={historyNotes} onChange={(event) => setHistoryNotes(event.target.value)} />
          <Button size="sm" loading={busy} onClick={() => void saveMedicalHistory()}>Record Condition</Button>
        </div> : null}
      </div>
      <div className="clinical-prescription-section">
        <h4>Recorded allergies</h4>
        {allergies.length ? allergies.map((item) => <div key={item.id} className="pd-visit-row"><div><div className="ui-table__cell-title">{item.allergen} {item.severity && item.severity !== 'unknown' ? `(${item.severity})` : ''}</div><div className="ui-table__cell-sub">{item.reaction || 'Reaction not recorded'}</div></div>{canCreateClinical ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void removeAllergy(item.id)}>Remove</Button> : null}</div>) : <p className="pd-empty">No allergies recorded. Confirm allergy status with the patient before prescribing.</p>}
        {canCreateClinical ? <div className="clinical-prescription-form">
          <Input label="Allergen" value={allergen} onChange={(event) => setAllergen(event.target.value)} placeholder="Medicine or substance" />
          <Input label="Reaction" value={reaction} onChange={(event) => setReaction(event.target.value)} placeholder="e.g. rash" />
          <Select label="Severity" value={severity} onChange={(event) => setSeverity(event.target.value)} options={['unknown', 'mild', 'moderate', 'severe'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
          <Button size="sm" loading={busy} onClick={() => void saveAllergy()}>Record Allergy</Button>
        </div> : null}
      </div>
      {canCreateClinical ? <div className="clinical-encounter-form">
        <Input label="Search diagnosis catalog" value={diagnosisSearch} onChange={(event) => { setDiagnosisSearch(event.target.value); setDiagnosisTermId(''); }} placeholder="Code or diagnosis name" />
        <Select label="Catalog diagnosis" value={diagnosisTermId} onChange={(event) => setDiagnosisTermId(event.target.value)} options={[{ value: '', label: 'Use free-text diagnosis' }, ...diagnosisTerms.map((term) => ({ value: term.id, label: `${term.system} ${term.code} - ${term.name}${term.version ? ` (${term.version})` : ''}` }))]} />
        {!diagnosisTermId ? <Input label="Free-text diagnosis" value={diagnosisName} onChange={(event) => setDiagnosisName(event.target.value)} placeholder="e.g. Acute fever" /> : null}
        <Input label="Temperature (°C)" value={temperature} onChange={(event) => setTemperature(event.target.value)} inputMode="decimal" />
        <Input label="Pulse (bpm)" value={pulse} onChange={(event) => setPulse(event.target.value)} inputMode="numeric" />
        <Input label="Blood pressure" value={bloodPressure} onChange={(event) => setBloodPressure(event.target.value)} placeholder="120/80" />
        <Input label="SpO₂ (%)" value={spo2} onChange={(event) => setSpo2(event.target.value)} inputMode="decimal" />
        <Input label="Weight (kg)" value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" />
        <label className="ui-field"><span className="ui-field__label">Presenting complaints</span><textarea className="ui-field__input clinical-encounter-textarea" value={complaints} onChange={(event) => setComplaints(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-field__label">Assessment</span><textarea className="ui-field__input clinical-encounter-textarea" value={assessment} onChange={(event) => setAssessment(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-field__label">Plan / treatment</span><textarea className="ui-field__input clinical-encounter-textarea" value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
        <Button size="sm" loading={busy} onClick={() => void save()}>Save Encounter</Button>
      </div> : null}
      {canManageDiagnosisCatalog ? <div className="clinical-prescription-section">
        <h4>Diagnosis catalog maintenance</h4>
        <p className="pd-empty">Enter only codes and labels verified against your licensed terminology source. Existing encounters retain their recorded values.</p>
        <div className="clinical-prescription-form">
          <Select label="Code system" value={newDiagnosisSystem} onChange={(event) => setNewDiagnosisSystem(event.target.value as 'local' | 'ICD-10' | 'ICD-11')} options={[{ value: 'local', label: 'Local' }, { value: 'ICD-10', label: 'ICD-10' }, { value: 'ICD-11', label: 'ICD-11' }]} />
          <Input label="Code" value={newDiagnosisCode} onChange={(event) => setNewDiagnosisCode(event.target.value)} />
          <Input label="Name" value={newDiagnosisName} onChange={(event) => setNewDiagnosisName(event.target.value)} />
          <Input label="Version" value={newDiagnosisVersion} onChange={(event) => setNewDiagnosisVersion(event.target.value)} placeholder="Optional source release" />
          <Button size="sm" loading={busy} onClick={() => void addDiagnosisTerm()}>Add Diagnosis Term</Button>
        </div>
        {diagnosisTerms.map((term) => <div key={term.id} className="pd-visit-row"><div><div className="ui-table__cell-title">{term.system} {term.code} - {term.name}</div><div className="ui-table__cell-sub">{term.version || 'No source version recorded'}</div></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => void deactivateDiagnosisTerm(term.id)}>Deactivate</Button></div>)}
      </div> : null}
      <div className="pd-card__body pd-visits">
        {rows.length ? rows.map((row) => (
          <div key={row.id}>
            <div className="pd-visit-row">
              <div><div className="ui-table__cell-title">{row.diagnosisName || 'Clinical consultation'} · {row.status}</div>{row.diagnosisSystem && row.diagnosisCode ? <div className="ui-table__cell-sub">{row.diagnosisSystem} {row.diagnosisCode}{row.diagnosisVersion ? ` · ${row.diagnosisVersion}` : ''}</div> : null}<div className="ui-table__cell-sub">{row.complaints || row.assessment || 'No narrative recorded'}</div><div className="ui-table__cell-sub">{row.signedAt ? `Signed ${dateTime(row.signedAt)}${row.signedBy?.fullName ? ` by ${row.signedBy.fullName}` : ''}` : 'Draft encounter'}</div></div>
              <div><strong>{dateTime(row.createdAt)}</strong>{canSignClinical && row.status === 'draft' ? <Button size="sm" disabled={busy} onClick={() => void signEncounter(row.id)}>Sign</Button> : null}{canSignClinical && row.status !== 'draft' ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => setAddendumEncounterId(addendumEncounterId === row.id ? null : row.id)}>Add addendum</Button> : null}</div>
            </div>
            {row.addenda?.map((item) => <div key={item.id} className="pd-visit-row"><div><div className="ui-table__cell-title">Addendum: {item.reason}</div><div className="ui-table__cell-sub">{item.addendum}</div></div><strong>{dateTime(item.createdAt)}{item.createdBy?.fullName ? ` · ${item.createdBy.fullName}` : ''}</strong></div>)}
            {addendumEncounterId === row.id ? <div className="clinical-prescription-form"><Input label="Reason for addendum" value={addendumReason} onChange={(event) => setAddendumReason(event.target.value)} /><label className="ui-field"><span className="ui-field__label">Addendum text</span><textarea className="ui-field__input clinical-encounter-textarea" value={addendumText} onChange={(event) => setAddendumText(event.target.value)} /></label><Button size="sm" loading={busy} onClick={() => void saveAddendum(row.id)}>Save addendum</Button></div> : null}
          </div>
        )) : <p className="pd-empty">No clinical encounters recorded yet.</p>}
      </div>
      {canViewPharmacy || canCreatePharmacy ? <div className="clinical-prescription-section">
        <h4>Prescriptions</h4>
        {canCreatePharmacy ? <div className="clinical-prescription-form">
          <Select label="Catalog medication" value={medicationId} onChange={(event) => { const id = event.target.value; setMedicationId(id); if (id) setMedicineName(medications.find((row) => String(row.id) === id)?.brandName || ''); }} options={[{ value: '', label: 'Free-text medicine' }, ...medications.map((row) => ({ value: row.id, label: `${row.brandName} · ${row.medicineCode}` }))]} />
          <Input label="Medicine" value={medicineName} onChange={(event) => setMedicineName(event.target.value)} disabled={!!medicationId} placeholder="e.g. Paracetamol 500 mg" />
          <Input label="Dosage" value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="1 tablet" />
          <Input label="Frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)} placeholder="After food, twice daily" />
          <Input label="Duration (days)" type="number" min="1" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
          <Input label="Quantity prescribed" type="number" min="1" max="1000000" value={quantityPrescribed} onChange={(event) => setQuantityPrescribed(event.target.value)} />
          <Input label="Instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
          <Button size="sm" loading={busy} onClick={() => void savePrescription()}>Add Prescription</Button>
        </div> : null}
        {prescriptions.length ? prescriptions.map((item) => <div key={item.id} className="pd-visit-row"><div><div className="ui-table__cell-title">{item.medicineName}</div><div className="ui-table__cell-sub">{[item.dosage, item.frequency, item.route, item.durationDays ? `${item.durationDays} days` : null, item.quantityPrescribed ? `${item.quantityPrescribed} units` : null].filter(Boolean).join(' · ')}</div></div><strong>{item.instructions || 'Active'}</strong></div>) : <p className="pd-empty">No prescriptions recorded yet.</p>}
      </div> : null}
    </section>
  );
}
