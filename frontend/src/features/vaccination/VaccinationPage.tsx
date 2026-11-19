import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../../lib/permissions';
import { getErrorMessage } from '../../lib/api';
import { PatientSearchField } from '../../components/ui/PatientSearchField';
import { vaccinationApi, type Immunization, type Vaccine } from './vaccination.api';
import './VaccinationPage.css';

export function VaccinationPage() {
  const { user } = useAuth();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [records, setRecords] = useState<Immunization[]>([]);
  const [report, setReport] = useState<Immunization[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [vaccineId, setVaccineId] = useState('');
  const [doseNumber, setDoseNumber] = useState('1');
  const [administeredOn, setAdministeredOn] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueOn, setNextDueOn] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterVaccine, setFilterVaccine] = useState('');

  async function refresh() {
    const [catalog, entries] = await Promise.all([vaccinationApi.catalog(), vaccinationApi.records()]);
    setVaccines(catalog); setRecords(entries);
  }
  useEffect(() => { void refresh().catch((e) => setError(getErrorMessage(e, 'Could not load vaccination data'))); }, []);
  async function saveVaccine(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await vaccinationApi.addVaccine({ code, name }); setCode(''); setName(''); await refresh(); setNotice('Vaccine added to catalog.'); }
    catch (e) { setError(getErrorMessage(e, 'Could not add vaccine')); } finally { setBusy(false); }
  }
  async function saveRecord(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (!patientId) throw new Error('Select a patient');
      await vaccinationApi.addRecord({ patientId, vaccineId: Number(vaccineId), doseNumber: Number(doseNumber), administeredOn, nextDueOn: nextDueOn || undefined, lotNumber: lotNumber || undefined, remarks: remarks || undefined });
      setNextDueOn(''); setLotNumber(''); setRemarks(''); await refresh(); setNotice('Immunization recorded.');
    } catch (e) { setError(getErrorMessage(e, 'Could not save record')); } finally { setBusy(false); }
  }
  async function loadReport(event: FormEvent) {
    event.preventDefault(); setError('');
    try { setReport(await vaccinationApi.report({ from: from || undefined, to: to || undefined, vaccineId: filterVaccine ? Number(filterVaccine) : undefined })); }
    catch (e) { setError(getErrorMessage(e, 'Could not load report')); }
  }
  const rows = report ?? records;
  return <main className="vaccination-page">
    <header><h1>Vaccination</h1><p>Record administered doses and staff entered follow up dates.</p></header>
    {error && <p role="alert" className="vaccination-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {hasPermission(user, 'vaccination.record') && <section><h2>Record immunization</h2><form onSubmit={saveRecord} className="vaccination-form">
      <label>Patient<PatientSearchField onSelect={(patient) => setPatientId(patient.id)} /></label>
      {patientId && <span>Selected patient ID: {patientId}</span>}
      <label>Vaccine<select required value={vaccineId} onChange={(e) => setVaccineId(e.target.value)}><option value="">Select vaccine</option>{vaccines.filter((v) => v.isActive).map((v) => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}</select></label>
      <label>Dose number<input required type="number" min="1" max="100" value={doseNumber} onChange={(e) => setDoseNumber(e.target.value)} /></label>
      <label>Administered on<input required type="date" max={new Date().toISOString().slice(0, 10)} value={administeredOn} onChange={(e) => setAdministeredOn(e.target.value)} /></label>
      <label>Next due on, if advised<input type="date" min={administeredOn} value={nextDueOn} onChange={(e) => setNextDueOn(e.target.value)} /></label>
      <label>Lot number<input maxLength={120} value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} /></label>
      <label>Remarks<input maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>
      <button disabled={busy || !patientId}>Save dose</button>
    </form></section>}
    <section><h2>Vaccine catalog</h2>{hasPermission(user, 'vaccination.manage') && <form onSubmit={saveVaccine} className="vaccination-form"><label>Code<input required maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} /></label><label>Name<input required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} /></label><button disabled={busy}>Add vaccine</button></form>}<ul>{vaccines.map((v) => <li key={v.id}>{v.name} ({v.code}){!v.isActive && ' — inactive'}</li>)}</ul>{vaccines.length === 0 && <p>No vaccines in catalog.</p>}</section>
    <section><h2>Immunization list and report</h2><form onSubmit={loadReport} className="vaccination-form"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><label>Vaccine<select value={filterVaccine} onChange={(e) => setFilterVaccine(e.target.value)}><option value="">All vaccines</option>{vaccines.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><button>Run report</button>{report && <button type="button" onClick={() => setReport(null)}>Clear filters</button>}</form>
      <div className="vaccination-table-wrap"><table><thead><tr><th>Patient</th><th>MRD</th><th>Vaccine</th><th>Dose</th><th>Administered</th><th>Next due</th><th>Lot</th><th>Remarks</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.firstName} {r.lastName}</td><td>{r.mrdNumber}</td><td>{r.vaccineName}</td><td>{r.doseNumber}</td><td>{r.administeredOn}</td><td>{r.nextDueOn || '—'}</td><td>{r.lotNumber || '—'}</td><td>{r.remarks || '—'}</td></tr>)}</tbody></table>{rows.length === 0 && <p>No immunization records found.</p>}</div>
    </section>
  </main>;
}
