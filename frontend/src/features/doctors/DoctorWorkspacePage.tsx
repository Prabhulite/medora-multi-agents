import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { doctorWorkspaceApi, type DoctorWorkspace } from './doctor-workspace.api';
import './DoctorWorkspacePage.css';

function patientMeta(patient: { mrdNumber: string; ageYears: number | null; gender: string }) { return [patient.mrdNumber, patient.ageYears === null ? null : `${patient.ageYears} yrs`, patient.gender].filter(Boolean).join(' · '); }

export function DoctorWorkspacePage() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<DoctorWorkspace | null>(null); const [error, setError] = useState('');
  const canOpenChart = hasPermission(user, 'patients.view');
  useEffect(() => { doctorWorkspaceApi.getMine().then(setWorkspace).catch((err) => setError(getErrorMessage(err, 'Unable to load your practice workspace'))); }, []);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!workspace) return <PageLoader label="Loading your practice…" />;
  const openChart = (id: number, visitId?: number) => navigate(visitId ? `/patients/${id}?visitId=${visitId}` : `/patients/${id}`);
  const openPrescription = (id: number, visitId?: number) => navigate(`/patients/${id}?tab=Rx${visitId ? `&visitId=${visitId}` : ''}`);
  return <div className="doctor-workspace">
    <PageHeader title="My Practice" subtitle={`${workspace.doctor.name}${workspace.doctor.specialization ? ` · ${workspace.doctor.specialization}` : ''}`} />
    {!canOpenChart ? <Alert tone="warning">Your account can see this schedule, but needs patient-record access before charts can be opened.</Alert> : null}
    <section className="doctor-workspace__grid">
      <WorkspaceCard title="Today’s schedule" count={workspace.todayAppointments.length} empty="No appointments scheduled for today." rows={workspace.todayAppointments.map((row) => ({ key: row.id, title: row.patient.name, detail: `${row.appointmentTime || 'Time pending'} · ${patientMeta(row.patient)}`, status: row.status, patientId: row.patient.id }))} onOpen={openChart} enabled={canOpenChart} />
      <WorkspaceCard title="Upcoming appointments" count={workspace.upcomingAppointments.length} empty="No upcoming appointments." rows={workspace.upcomingAppointments.map((row) => ({ key: row.id, title: row.patient.name, detail: `${row.appointmentDate} ${row.appointmentTime || ''} · ${patientMeta(row.patient)}`, status: row.status, patientId: row.patient.id }))} onOpen={openChart} enabled={canOpenChart} />
      <WorkspaceCard title="Recent patients" count={workspace.recentPatients.length} empty="No recent OP visits." rows={workspace.recentPatients.map((row) => ({ key: row.id, title: row.patient.name, detail: `${row.visitNumber} · ${patientMeta(row.patient)}`, status: row.status, patientId: row.patient.id, visitId: row.id }))} onOpen={openChart} onPrescribe={openPrescription} enabled={canOpenChart} />
    </section>
  </div>;
}

function WorkspaceCard({ title, count, empty, rows, onOpen, onPrescribe, enabled }: { title: string; count: number; empty: string; rows: Array<{ key: number; title: string; detail: string; status: string; patientId: number; visitId?: number }>; onOpen: (id: number, visitId?: number) => void; onPrescribe?: (id: number, visitId?: number) => void; enabled: boolean }) {
  return <section className="doctor-workspace__card"><div className="doctor-workspace__head"><h2>{title}</h2><Badge tone="info">{count}</Badge></div>{rows.length ? <div className="doctor-workspace__rows">{rows.map((row) => <div className="doctor-workspace__row" key={row.key}><div><strong>{row.title}</strong><span>{row.detail}</span></div><div><Badge tone="neutral">{row.status.replaceAll('_', ' ')}</Badge><Button size="sm" variant="ghost" disabled={!enabled} onClick={() => onOpen(row.patientId, row.visitId)}>Open chart</Button>{onPrescribe ? <Button size="sm" disabled={!enabled} onClick={() => onPrescribe(row.patientId, row.visitId)}>Prescribe</Button> : null}</div></div>)}</div> : <p className="doctor-workspace__empty">{empty}</p>}</section>;
}
