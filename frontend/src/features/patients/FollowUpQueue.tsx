import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { patientsApi } from './patients.api';

type FollowUp = Awaited<ReturnType<typeof patientsApi.followUps>>[number];

export function FollowUpQueue() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const canComplete = hasPermission(user, 'patients.update');
  const load = async () => { try { setRows(await patientsApi.followUps('open')); setError(''); } catch (err) { setError(getErrorMessage(err, 'Unable to load follow-ups')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const complete = async (row: FollowUp) => {
    const note = window.prompt(`How was the follow-up for ${row.patientName} completed?`);
    if (!note?.trim()) return;
    setBusy(true); setError('');
    try { await patientsApi.completeFollowUp(row.patientId, row.id, note.trim()); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to complete follow-up')); }
    finally { setBusy(false); }
  };
  return <article className="operations-panel"><header><div><small>Front office</small><h2>Patient follow-ups</h2></div><b>{rows.length} loaded</b></header>
    {error ? <div className="operations-error" role="alert">{error}</div> : loading ? <Loader size="sm" variant="block" label="Loading follow-ups…" /> : rows.length ? <ul className="operations-queue" aria-label="Patient follow-up queue">
      {rows.slice(0, 10).map((row) => <li className="operations-queue__item" key={row.id}><div><strong><Link to={`/patients/${row.patientId}`}>{row.patientName} · {row.patientMrdNumber}</Link></strong><span>{row.subject} · {row.channel} · {row.overdue ? 'Overdue' : 'Open'} · Due {new Date(row.followUpDueAt).toLocaleString()}</span></div>{canComplete ? <button type="button" className="operations-refresh" disabled={busy} onClick={() => void complete(row)}>Complete</button> : null}</li>)}
    </ul> : <div className="operations-empty">No open follow-ups.</div>}
  </article>;
}
