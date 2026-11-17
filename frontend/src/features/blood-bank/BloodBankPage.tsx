import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { bloodBankApi, type BloodUnit, type BloodUnitEvent, type IssuePatient, type ReceiveUnit, type UnitStatus } from './blood-bank.api';
import './BloodBankPage.css';

type Action = 'receive' | 'release' | 'issue' | 'discard';
const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emptyUnit: ReceiveUnit = { unitNumber: '', component: '', bloodGroup: 'O+', collectedOn: '', expiresOn: '', storageLocation: '' };

export function BloodBankPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'blood_bank.manage');
  const canIssue = hasPermission(user, 'blood_bank.issue');
  const [units, setUnits] = useState<BloodUnit[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestSeq = useRef(0);
  const [status, setStatus] = useState<UnitStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [target, setTarget] = useState<{ action: Action; unit?: BloodUnit } | null>(null);
  const [form, setForm] = useState<ReceiveUnit>(emptyUnit);
  const [reference, setReference] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [matches, setMatches] = useState<IssuePatient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [history, setHistory] = useState<{ unit: BloodUnit; events: BloodUnitEvent[] } | null>(null);

  const load = async () => {
    const sequence = ++requestSeq.current;
    setLoading(true);
    try { const result = await bloodBankApi.units(status || undefined, search.trim() || undefined); if (sequence === requestSeq.current) { setUnits(result.items); setNextCursor(result.nextCursor); setError(''); } }
    catch (err) { if (sequence === requestSeq.current) setError(getErrorMessage(err, 'Unable to load blood units')); }
    finally { if (sequence === requestSeq.current) setLoading(false); }
  };
  useEffect(() => { void load(); }, [status, search]);
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const sequence = requestSeq.current;
    setLoadingMore(true);
    try { const result = await bloodBankApi.units(status || undefined, search.trim() || undefined, nextCursor); if (sequence === requestSeq.current) { setUnits((current) => [...current, ...result.items]); setNextCursor(result.nextCursor); setError(''); } }
    catch (err) { if (sequence === requestSeq.current) setError(getErrorMessage(err, 'Unable to load older units')); }
    finally { setLoadingMore(false); }
  };
  useEffect(() => {
    if (target?.action !== 'issue' || patientQuery.trim().length < 2) { setMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void bloodBankApi.patients(patientQuery.trim()).then((rows) => { if (active) setMatches(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [patientQuery, target?.action]);

  const open = (action: Action, unit?: BloodUnit) => { setTarget({ action, unit }); setForm(emptyUnit); setReference(''); setPatientQuery(''); setPatientId(''); setMatches([]); setError(''); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!target) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (target.action === 'receive') await bloodBankApi.receive(form);
      else if (target.action === 'release' && target.unit) await bloodBankApi.release(target.unit.id, reference);
      else if (target.action === 'issue' && target.unit) {
        if (!patientId) throw new Error('Select a patient from the search results');
        await bloodBankApi.issue(target.unit.id, Number(patientId), reference);
      } else if (target.action === 'discard' && target.unit) await bloodBankApi.discard(target.unit.id, reference);
      setNotice(`Unit ${target.action === 'receive' ? 'received into quarantine' : `${target.action}d`}.`);
      setTarget(null); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to update unit')); }
    finally { setBusy(false); }
  };
  const showHistory = async (unit: BloodUnit) => {
    try { setHistory({ unit, events: await bloodBankApi.events(unit.id) }); setError(''); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load unit history')); }
  };
  const columns: TableColumn<BloodUnit>[] = [
    { key: 'unit', header: 'Unit', render: (row) => <div><strong>{row.unitNumber}</strong><small>{row.component} · {row.bloodGroup}</small></div> },
    { key: 'dates', header: 'Dates', render: (row) => <div><span>Collected {row.collectedOn}</span><small>Expires {row.expiresOn}</small></div> },
    { key: 'location', header: 'Location', render: (row) => row.storageLocation },
    { key: 'status', header: 'Status', render: (row) => <div><Badge tone={row.expired ? 'warning' : row.status === 'available' ? 'success' : row.status === 'issued' ? 'info' : 'neutral'}>{row.status}</Badge>{row.expired && <small>Expired</small>}</div> },
    { key: 'actions', header: 'Actions', render: (row) => <div className="blood-bank-actions"><Button size="sm" variant="ghost" onClick={() => void showHistory(row)}>History</Button>{canManage && row.status === 'quarantined' && !row.expired && <Button size="sm" variant="secondary" onClick={() => open('release', row)}>Release</Button>}{canIssue && row.status === 'available' && !row.expired && <Button size="sm" onClick={() => open('issue', row)}>Issue</Button>}{canManage && ['quarantined', 'available'].includes(row.status) && <Button size="sm" variant="ghost" onClick={() => open('discard', row)}>Discard</Button>}</div> },
  ];
  return <div className="blood-bank-page">
    <PageHeader title="Blood Bank" subtitle="Track blood component units and their release and issue history." actions={canManage ? <Button onClick={() => open('receive')}>Receive unit</Button> : undefined} />
    <Alert tone="warning">Inventory records do not establish transfusion compatibility. Follow the hospital's blood bank and crossmatch procedures.</Alert>
    {error && !target && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <div className="blood-bank-filters"><Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as UnitStatus | '')} options={[{ value: '', label: 'All statuses' }, ...(['quarantined', 'available', 'issued', 'discarded'] as UnitStatus[]).map((value) => ({ value, label: value }))]} /><Input label="Unit number" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="Search unit number" /></div>
    <Table columns={columns} rows={units} rowKey={(row) => row.id} loading={loading} onRefresh={() => void load()} emptyMessage="No blood units found." />
    <div className="blood-bank-paging"><p className="blood-bank-note">{units.length} units loaded for the selected filter.</p>{nextCursor && <Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Load older units</Button>}</div>
    {target && <div className="blood-bank-backdrop" role="presentation" onClick={() => setTarget(null)}><section className="blood-bank-dialog" role="dialog" aria-modal="true" aria-labelledby="blood-action-title" onClick={(event) => event.stopPropagation()}><h2 id="blood-action-title">{target.action === 'receive' ? 'Receive unit' : `${target.action[0].toUpperCase()}${target.action.slice(1)} ${target.unit?.unitNumber}`}</h2>{error && <Alert tone="error">{error}</Alert>}<form onSubmit={(event) => void submit(event)}>
      {target.action === 'receive' ? <div className="blood-bank-form-grid"><Input label="Unit number" required value={form.unitNumber} onChange={(event) => setForm({ ...form, unitNumber: event.target.value })} /><Input label="Component" required value={form.component} onChange={(event) => setForm({ ...form, component: event.target.value })} /><Select label="Blood group" value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} options={groups.map((value) => ({ value, label: value }))} /><Input label="Storage location" required value={form.storageLocation} onChange={(event) => setForm({ ...form, storageLocation: event.target.value })} /><Input label="Collected on" type="date" required value={form.collectedOn} onChange={(event) => setForm({ ...form, collectedOn: event.target.value })} /><Input label="Expires on" type="date" required value={form.expiresOn} onChange={(event) => setForm({ ...form, expiresOn: event.target.value })} /></div> : <>
        {target.action === 'release' && <Alert tone="warning">Confirm required screening has been completed and cleared before release.</Alert>}
        {target.action === 'issue' && <><Alert tone="warning">Verify identity, crossmatch, and compatibility under hospital procedure before issue. This action does not record transfusion.</Alert><Input label="Find patient by name or MRD" value={patientQuery} onChange={(event) => { setPatientQuery(event.target.value); setPatientId(''); }} /><Select label="Patient" required value={patientId} onChange={(event) => setPatientId(event.target.value)} options={[{ value: '', label: 'Select patient' }, ...matches.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} /></>}
        <Input label={target.action === 'release' ? 'Screening reference' : target.action === 'issue' ? 'Crossmatch reference' : 'Discard reason'} required minLength={target.action === 'discard' ? 5 : 2} maxLength={target.action === 'discard' ? 200 : 120} value={reference} onChange={(event) => setReference(event.target.value)} />
      </>}
      <div className="blood-bank-actions blood-bank-form-actions"><Button type="button" variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" loading={busy}>Confirm {target.action}</Button></div>
    </form></section></div>}
    {history && <div className="blood-bank-backdrop" role="presentation" onClick={() => setHistory(null)}><section className="blood-bank-dialog" role="dialog" aria-modal="true" aria-labelledby="blood-history-title" onClick={(event) => event.stopPropagation()}><h2 id="blood-history-title">History: {history.unit.unitNumber}</h2><ol className="blood-bank-events">{history.events.map((entry) => <li key={entry.id}><strong>{entry.toStatus}</strong> · {new Date(entry.createdAt).toLocaleString()} · Staff #{entry.actorId}{entry.reference && <small>{entry.reference}</small>}</li>)}</ol><Button variant="secondary" onClick={() => setHistory(null)}>Close</Button></section></div>}
  </div>;
}

export default BloodBankPage;
