import { useEffect, useState, type ChangeEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { clinicalApi } from './clinical.api';

type ConsentRow = Awaited<ReturnType<typeof clinicalApi.listConsents>>[number];
type SignedFile = { fileName: string; mimeType: string; fileData: string };

export function ConsentPanel({ patientId, canCreate }: { patientId: number; canCreate: boolean }) {
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [consentType, setConsentType] = useState('procedure');
  const [subject, setSubject] = useState('');
  const [risksExplained, setRisksExplained] = useState('');
  const [treatingDoctorName, setTreatingDoctorName] = useState('');
  const [doctorRegistrationNumber, setDoctorRegistrationNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [language, setLanguage] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryRole, setSignatoryRole] = useState('patient');
  const [signedAt, setSignedAt] = useState('');
  const [file, setFile] = useState<SignedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => { try { setRows(await clinicalApi.listConsents(patientId)); } catch (err) { setError(getErrorMessage(err, 'Unable to load consent records')); } };
  useEffect(() => { void load(); }, [patientId]);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]; setFile(null); setError('');
    if (!selected) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(selected.type) || selected.size > 1_000_000) { setError('Choose a PDF, PNG, or JPEG under 1 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setFile({ fileName: selected.name, mimeType: selected.type, fileData: reader.result }); };
    reader.readAsDataURL(selected);
  };

  const save = async () => {
    if (!file || !signedAt) { setError('Add the signed copy and signature date/time.'); return; }
    setBusy(true); setError('');
    try {
      await clinicalApi.createConsent(patientId, { consentType, subject, risksExplained, treatingDoctorName: treatingDoctorName || null, doctorRegistrationNumber: doctorRegistrationNumber || null, admissionDate: admissionDate || null, language, signatoryName, signatoryRole, signedAt: new Date(signedAt).toISOString(), ...file });
      setSubject(''); setRisksExplained(''); setTreatingDoctorName(''); setDoctorRegistrationNumber(''); setAdmissionDate(''); setSignatoryName(''); setSignedAt(''); setFile(null); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to record consent')); }
    finally { setBusy(false); }
  };

  const openCopy = async (id: number) => {
    setError('');
    try { const copy = await clinicalApi.consentDocument(patientId, id); const link = document.createElement('a'); link.href = copy.fileData; link.download = copy.fileName; link.click(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to open signed copy')); }
  };

  const revoke = async (id: number) => {
    const reason = window.prompt('Reason for revoking this consent:');
    if (!reason?.trim()) return;
    setBusy(true); setError('');
    try { await clinicalApi.revokeConsent(patientId, id, reason.trim()); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to revoke consent')); }
    finally { setBusy(false); }
  };

  return <div className="clinical-prescription-section">
    <h4>Signed consent records</h4>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {rows.length ? rows.map((row) => <div key={row.id} className="pd-visit-row">
      <div><div className="ui-table__cell-title">{row.subject} · {row.status}</div><div className="ui-table__cell-sub">{row.consentType} · Signed by {row.signatoryName} ({row.signatoryRole}) · {new Date(row.signedAt).toLocaleString()} · {row.language}{row.revocationReason ? ` · Revoked: ${row.revocationReason}` : ''}</div></div>
      <Button size="sm" variant="secondary" onClick={() => void openCopy(row.id)}>Signed copy</Button>
      {canCreate && row.status === 'active' ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void revoke(row.id)}>Revoke</Button> : null}
    </div>) : <p className="pd-empty">No signed consent records.</p>}
    {canCreate ? <div className="clinical-prescription-form">
      <Select label="Consent type" value={consentType} onChange={(event) => setConsentType(event.target.value)} options={['general', 'procedure', 'investigation', 'transfusion', 'anaesthesia', 'other'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
      <Input label="Procedure or purpose" value={subject} onChange={(event) => setSubject(event.target.value)} />
      <Input label="Risks explained" value={risksExplained} onChange={(event) => setRisksExplained(event.target.value)} />
      {consentType !== 'general' ? <>
        <Input label="Treating doctor" value={treatingDoctorName} onChange={(event) => setTreatingDoctorName(event.target.value)} />
        <Input label="Doctor registration number" value={doctorRegistrationNumber} onChange={(event) => setDoctorRegistrationNumber(event.target.value)} />
      </> : null}
      <Input label="Admission date (if applicable)" type="date" value={admissionDate} onChange={(event) => setAdmissionDate(event.target.value)} />
      <Input label="Language used" value={language} onChange={(event) => setLanguage(event.target.value)} />
      <Input label="Signatory name" value={signatoryName} onChange={(event) => setSignatoryName(event.target.value)} />
      <Select label="Signatory role" value={signatoryRole} onChange={(event) => setSignatoryRole(event.target.value)} options={['patient', 'guardian', 'representative'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
      <Input label="Signed at" type="datetime-local" value={signedAt} onChange={(event) => setSignedAt(event.target.value)} />
      <label className="ui-field"><span className="ui-field__label">Signed PDF or image (under 1 MB)</span><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={onFile} /></label>
      <Button size="sm" loading={busy} onClick={() => void save()}>Record Signed Consent</Button>
    </div> : null}
  </div>;
}
