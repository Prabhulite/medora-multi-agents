import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import type { RegistrationSource, RegistrationSourceEvent } from '../../types';
import { patientsApi } from './patients.api';
import './RegistrationSourcesPage.css';

export function RegistrationSourcesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RegistrationSource[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historySource, setHistorySource] = useState<RegistrationSource | null>(null);
  const [historyRows, setHistoryRows] = useState<RegistrationSourceEvent[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await patientsApi.registrationSources()); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load registration sources')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^[a-z][a-z0-9_]{1,79}$/.test(code.trim()) || name.trim().length < 2) {
      setError('Enter a lowercase code and a name of at least two characters.');
      return;
    }
    setBusy(true);
    try { await patientsApi.createRegistrationSource({ code: code.trim(), name: name.trim() }); setCode(''); setName(''); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to create registration source')); }
    finally { setBusy(false); }
  };

  const saveName = async (row: RegistrationSource) => {
    if (editName.trim().length < 2) { setError('Enter a name of at least two characters.'); return; }
    setBusy(true); setError('');
    try { await patientsApi.updateRegistrationSource(row.id, { name: editName.trim() }); setEditingId(null); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to update registration source')); }
    finally { setBusy(false); }
  };

  const toggle = async (row: RegistrationSource) => {
    setBusy(true); setError('');
    try { await patientsApi.updateRegistrationSource(row.id, { isActive: !row.isActive }); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to change registration source status')); }
    finally { setBusy(false); }
  };

  const showHistory = async (row: RegistrationSource) => {
    setHistorySource(row); setHistoryRows([]); setHistoryError(''); setHistoryLoading(true);
    try { setHistoryRows(await patientsApi.registrationSourceHistory(row.id)); }
    catch (err) { setHistoryError(getErrorMessage(err, 'Unable to load source history')); }
    finally { setHistoryLoading(false); }
  };

  const columns: TableColumn<RegistrationSource>[] = [
    { key: 'code', header: 'Code', render: (row) => <strong>{row.code}</strong> },
    { key: 'name', header: 'Display name', render: (row) => editingId === row.id ? <Input label="Display name" value={editName} maxLength={120} onChange={(event) => setEditName(event.target.value)} /> : row.name },
    { key: 'status', header: 'Status', render: (row) => row.isActive ? 'Active' : 'Retired' },
    { key: 'actions', header: 'Actions', render: (row) => <div className="registration-sources-actions">
      {editingId === row.id ? <><Button size="sm" disabled={busy} onClick={() => void saveName(row)}>Save</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditingId(null)}>Cancel</Button></>
        : <><Button size="sm" variant="secondary" disabled={busy} onClick={() => { setEditingId(row.id); setEditName(row.name); }}>Rename</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => void toggle(row)}>{row.isActive ? 'Retire' : 'Reactivate'}</Button><Button size="sm" variant="secondary" onClick={() => void showHistory(row)}>History</Button></>}
    </div> },
  ];

  return <div className="registration-sources-page">
    <PageHeader title="Registration Sources" subtitle="Manage how patients first reached the hospital." actions={<Button size="sm" variant="secondary" onClick={() => navigate('/patients')}>Back to patients</Button>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    <form className="registration-sources-form" onSubmit={(event) => void create(event)}>
      <Input label="Source code" value={code} maxLength={80} onChange={(event) => setCode(event.target.value)} placeholder="e.g. corporate_referral" />
      <Input label="Display name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="e.g. Corporate referral" />
      <Button type="submit" size="sm" disabled={busy}>Add source</Button>
    </form>
    <p className="registration-sources-note">Codes stay fixed. Retiring a source removes it from new registrations while keeping its name on existing patient charts.</p>
    <Table columns={columns} rows={rows} rowKey={(row) => row.id} loading={loading} onRefresh={() => void load()} searchText={(row) => `${row.code} ${row.name}`} emptyMessage="No registration sources yet." />
    <Modal open={Boolean(historySource)} title={`History: ${historySource?.name || ''}`} onClose={() => setHistorySource(null)}>
      {historyLoading ? <p>Loading history...</p> : historyError ? <Alert tone="error">{historyError}</Alert> : historyRows.length ? <ol className="registration-sources-history">
        {historyRows.map((event) => <li key={event.id}>
          <strong>{event.action.replace(/^./, (letter) => letter.toUpperCase())}</strong>
          <span>{event.beforeName && event.beforeName !== event.afterName ? `${event.beforeName} → ${event.afterName}` : event.afterName}</span>
          <small>{event.actorName || 'Unknown staff'} · {new Date(event.createdAt).toLocaleString()}</small>
        </li>)}
      </ol> : <p>No catalog changes have been recorded for this source yet.</p>}
    </Modal>
  </div>;
}
