import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Patient } from '../../types';
import { appointmentsApi } from '../appointments/appointments.api';
import { useAuth } from '../auth/AuthContext';
import { billingApi } from '../billing/billing.api';
import { prescriptionsApi } from '../clinical/prescriptions.api';
import { laboratoryApi } from '../laboratory/laboratory.api';
import { radiologyApi } from '../radiology/radiology.api';

export type PatientRecordsMode = 'Visit' | 'Bills' | 'Tests' | 'Rx' | 'Appointment';
type Row = { key: string; title: string; detail: string; at?: string | null; status?: string | null };

function asDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function PatientRecordsTab({ patient, mode }: { patient: Patient; mode: PatientRecordsMode }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const permitted = mode === 'Visit' ? hasPermission(user, 'patients.view')
    : mode === 'Bills' ? hasPermission(user, 'billing.view')
    : mode === 'Appointment' ? hasPermission(user, 'appointments.view')
    : mode === 'Rx' ? hasPermission(user, 'pharmacy.view') || hasPermission(user, 'pharmacy.inventory.update') || hasPermission(user, 'pharmacy.create')
    : hasPermission(user, 'laboratory.view') || hasPermission(user, 'radiology.view');

  useEffect(() => {
    if (!permitted) { setLoading(false); setRows([]); return; }
    let active = true;
    setLoading(true); setError('');
    const load = async (): Promise<Row[]> => {
      if (mode === 'Visit') return (patient.visits || []).map((row) => ({ key: `visit-${row.id}`, title: row.visitNumber, detail: row.opNumber || row.visitType, at: row.visitAt, status: row.status }));
      if (mode === 'Appointment') return (await appointmentsApi.list({ patientId: patient.id })).map((row) => ({ key: `appointment-${row.id}`, title: row.appointmentNumber, detail: [row.doctorName, row.departmentName, row.appointmentType.replaceAll('_', ' ')].filter(Boolean).join(' · '), at: `${row.appointmentDate}T${row.appointmentTime || '00:00:00'}`, status: row.status }));
      if (mode === 'Bills') return (await billingApi.listInvoices(patient.id)).map((row) => ({ key: `bill-${row.id}`, title: row.invoiceNumber, detail: `Total ₹${Number(row.totalAmount || 0).toFixed(2)} · Balance ₹${Number(row.balanceAmount || 0).toFixed(2)}`, at: row.invoiceDate, status: row.status }));
      if (mode === 'Rx') return (await prescriptionsApi.listByPatient(patient.id)).map((row) => ({ key: `rx-${row.id}`, title: row.medicineName, detail: [row.dosage, row.frequency, row.durationDays ? `${row.durationDays} days` : null].filter(Boolean).join(' · '), at: row.createdAt, status: row.status }));
      const [labs, imaging] = await Promise.all([
        hasPermission(user, 'laboratory.view') ? laboratoryApi.listOrders(patient.id) : Promise.resolve([]),
        hasPermission(user, 'radiology.view') ? radiologyApi.listOrders(patient.id) : Promise.resolve([]),
      ]);
      return [
        ...labs.map((row): Row => ({ key: `lab-${row.id}`, title: `Lab: ${row.testName}`, detail: row.orderNumber, at: row.orderedAt, status: row.status })),
        ...imaging.map((row): Row => ({ key: `radiology-${row.id}`, title: `Imaging: ${row.studyName}`, detail: row.orderNumber, at: row.orderedAt, status: row.status })),
      ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    };
    load().then((result) => { if (active) setRows(result); }).catch((err) => { if (active) setError(getErrorMessage(err, `Unable to load ${mode.toLowerCase()} records`)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patient, mode, permitted, user]);

  return <section className="pd-card pd-card--wide">
    <div className="pd-card__head"><h3>{mode === 'Rx' ? 'Prescriptions' : mode === 'Tests' ? 'Diagnostic tests' : mode === 'Visit' ? 'Visits' : mode === 'Bills' ? 'Patient bills' : 'Appointments'}</h3><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{mode === 'Rx' && rows.length ? <Button size="sm" variant="secondary" onClick={() => window.print()}>Print medication list</Button> : null}<Badge tone="info">{rows.length} records</Badge></div></div>
    {!permitted ? <Alert tone="error">You do not have permission to view these records.</Alert> : error ? <Alert tone="error">{error}</Alert> : loading ? <Loader size="sm" variant="block" label="Loading records…" /> : rows.length ? <div className="pd-card__body pd-visits">
      {rows.map((row) => <div className="pd-visit-row" key={row.key}><div><div className="ui-table__cell-title">{row.title}</div><div className="ui-table__cell-sub">{[row.detail, row.status].filter(Boolean).join(' · ')}</div></div><strong>{asDate(row.at)}</strong></div>)}
    </div> : <p className="pd-empty">No {mode.toLowerCase()} records found for this patient.</p>}
  </section>;
}
