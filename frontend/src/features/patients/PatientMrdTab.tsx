import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { getErrorMessage } from '../../lib/api';
import type { Patient, PatientAuditLog } from '../../types';
import { patientsApi } from './patients.api';

export function PatientMrdTab({ patient }: { patient: Patient }) {
  const [logs, setLogs] = useState<PatientAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    patientsApi.auditLogs(patient.id).then((rows) => { if (active) setLogs(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load record history')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patient.id]);
  return <section className="pd-card pd-card--wide">
    <div className="pd-card__head"><h3>MRD record history</h3></div>
    <div className="pd-card__body"><div className="pd-detail-row"><span>MRD number</span><strong>{patient.mrdNumber}</strong></div><div className="pd-detail-row"><span>Registered</span><strong>{new Date(patient.registrationAt).toLocaleString()}</strong></div></div>
    {error ? <Alert tone="error">{error}</Alert> : loading ? <p className="pd-empty">Loading audit trail…</p> : logs.length ? <div className="pd-card__body pd-visits">
      {logs.map((row) => <div className="pd-visit-row" key={row.id}><div><div className="ui-table__cell-title">{row.changeSummary || row.action.replaceAll('_', ' ')}</div><div className="ui-table__cell-sub">{row.changedByName || 'System'} · {row.action.replaceAll('_', ' ')}</div></div><strong>{new Date(row.createdAt).toLocaleString()}</strong></div>)}
    </div> : <p className="pd-empty">No audit entries recorded for this patient.</p>}
  </section>;
}
