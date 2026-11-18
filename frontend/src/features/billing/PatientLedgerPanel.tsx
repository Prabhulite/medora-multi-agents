import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { patientsApi } from '../patients/patients.api';
import type { Patient } from '../../types';
import { billingApi, type PatientLedger } from './billing.api';

const money = (value: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value));

export function PatientLedgerPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [ledger, setLedger] = useState<PatientLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (query.trim().length < 2 || patientId) { setResults([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { patientsApi.search({ q: query.trim() }).then((rows) => { if (active) setResults(rows.slice(0, 20)); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, patientId]);
  const selectPatient = async (id: string) => {
    setPatientId(id); setLedger(null); setError('');
    if (!id) return;
    const patient = results.find((row) => String(row.id) === id);
    if (patient) setQuery(`${patient.fullName} (${patient.mrdNumber})`);
    setLoading(true);
    try { setLedger(await billingApi.patientLedger(Number(id))); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load ledger')); }
    finally { setLoading(false); }
  };
  return <div className="billing-modal-backdrop" role="presentation" onClick={onClose}><section className="billing-modal billing-modal--wide" role="dialog" aria-modal="true" aria-labelledby="patient-ledger-title" onClick={(event) => event.stopPropagation()}><div className="billing-modal__header"><div><span className="billing-eyebrow">PATIENT ACCOUNT</span><h2 id="patient-ledger-title">Patient ledger</h2><p>Invoices, receipts, refunds, and running balance</p></div><button type="button" onClick={onClose} aria-label="Close patient ledger">×</button></div>
    <div className="billing-form"><Input label="Search patient by name or MRD" value={query} onChange={(event) => { setQuery(event.target.value); setPatientId(''); setLedger(null); }} placeholder="Type at least 2 characters" />{results.length > 0 && <Select label="Matching patients" value={patientId} onChange={(event) => void selectPatient(event.target.value)} options={[{ value: '', label: 'Select a patient' }, ...results.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{error && <Alert tone="error">{error}</Alert>}{loading && <Loader size="sm" variant="block" label="Loading ledger…" />}{ledger && <><div><strong>{ledger.patient.fullName}</strong> · {ledger.patient.mrdNumber}</div><div className="billing-ledger-summary"><span>Billed <strong>{money(ledger.summary.billed)}</strong></span><span>Collected <strong>{money(ledger.summary.collected)}</strong></span><span>Outstanding <strong>{money(ledger.summary.outstanding)}</strong></span></div><div className="billing-ledger-scroll"><table className="billing-ledger-table"><thead><tr><th>Date</th><th>Invoice</th><th>Transaction</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>{ledger.entries.map((entry) => <tr key={`${entry.type}-${entry.id}`}><td>{new Date(entry.occurredAt).toLocaleString()}</td><td>{entry.invoiceNumber}</td><td>{entry.description}</td><td>{entry.debit === '0.00' ? '' : money(entry.debit)}</td><td>{entry.credit === '0.00' ? '' : money(entry.credit)}</td><td>{money(entry.balance)}</td></tr>)}</tbody></table>{!ledger.entries.length && <p>No billing transactions for this patient.</p>}</div><Button variant="secondary" onClick={() => void selectPatient(patientId)}>Refresh ledger</Button></>}</div>
  </section></div>;
}
