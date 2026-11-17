import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { doctorAccountApi, type AccountCandidate, type DoctorAccountLink } from './doctor-account.api';
import './DoctorAccountPage.css';

export function DoctorAccountPage() {
  const { id } = useParams();
  const doctorId = Number(id);
  const [record, setRecord] = useState<DoctorAccountLink | null>(null);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<AccountCandidate[]>([]);
  const [userId, setUserId] = useState('');
  const [doctorCode, setDoctorCode] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { let active = true; void doctorAccountApi.get(doctorId).then((data) => { if (active) setRecord(data); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load doctor account link')); }); return () => { active = false; }; }, [doctorId]);
  useEffect(() => {
    if (record?.account || search.trim().length < 2) { setCandidates([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void doctorAccountApi.candidates(search.trim()).then((rows) => { if (active) setCandidates(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to search staff')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, record?.account?.id]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!record) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = record.account
        ? await doctorAccountApi.unlink(doctorId, { doctorCode, reason })
        : await doctorAccountApi.link(doctorId, { userId: Number(userId), doctorCode, reason });
      setRecord(updated); setDoctorCode(''); setReason(''); setUserId(''); setSearch(''); setCandidates([]);
      setNotice(updated.account ? 'Staff account linked.' : 'Staff account unlinked.');
    } catch (err) { setError(getErrorMessage(err, 'Unable to update doctor account link')); }
    finally { setSaving(false); }
  };
  return <div className="doctor-account-page">
    <PageHeader title="Doctor account link" subtitle="Connect a verified doctor record to one staff login." actions={<Link to={`/doctors/${doctorId}/edit`}>Back to doctor</Link>} />
    {error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    {!record ? <p>Loading doctor record...</p> : <>
      <section className="doctor-account-card"><h2>Doctor record</h2><p><strong>{record.doctor.name}</strong> · {record.doctor.doctorCode}</p><p>Medical registration: {record.doctor.medicalRegistrationNumber}</p><p>Status: {record.doctor.isActive ? 'Active' : 'Inactive'}</p></section>
      <section className="doctor-account-card"><h2>Staff login</h2>{record.account ? <p><strong>{record.account.fullName}</strong> · {record.account.username} · {record.account.employeeId || 'No employee ID'} · {record.account.designation || 'No designation'}</p> : <p>No staff login linked.</p>}
        <Alert tone="warning">Verify the staff member's identity and medical registration against hospital records before linking. This connection controls who receives clinician notifications.</Alert>
        <form onSubmit={(event) => void submit(event)}>
          {!record.account && <><Input label="Search staff name, username, or employee ID" value={search} onChange={(event) => { setSearch(event.target.value); setUserId(''); }} /><Select label="Staff account" required value={userId} onChange={(event) => setUserId(event.target.value)} options={[{ value: '', label: 'Select verified staff account' }, ...candidates.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.username} · ${row.employeeId || 'No ID'} · ${row.designation || 'No designation'}` }))]} /></>}
          <Input label={`Type doctor code (${record.doctor.doctorCode})`} required value={doctorCode} onChange={(event) => setDoctorCode(event.target.value)} />
          <Input label={record.account ? 'Reason for unlinking' : 'Verification reason'} required minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button type="submit" loading={saving} disabled={!record.account && !userId}>{record.account ? 'Unlink account' : 'Link account'}</Button>
        </form>
      </section>
      <section className="doctor-account-card"><h2>Link history</h2>{record.events.length === 0 ? <p>No changes recorded.</p> : <ol>{record.events.map((event) => <li key={event.id}><strong>{event.toUserId ? `Linked staff #${event.toUserId}` : `Unlinked staff #${event.fromUserId}`}</strong> · {new Date(event.createdAt).toLocaleString()} · Changed by staff #{event.actorId}<br />{event.reason}</li>)}</ol>}</section>
    </>}
  </div>;
}
export default DoctorAccountPage;
