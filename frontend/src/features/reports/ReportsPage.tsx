import { api } from '../../lib/api';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { patientsApi } from '../patients/patients.api';
import { appointmentsApi } from '../appointments/appointments.api';
import { billingApi } from '../billing/billing.api';
import { pharmacyApi } from '../pharmacy/pharmacy.api';
import { operationsApi } from '../operations/operations.api';
import type { Appointment, RegistrationSourceReport } from '../../types';
import type { CashierReport, ReceivablesReport } from '../billing/billing.api';
import type { InventoryWorklist } from '../pharmacy/pharmacy.api';
import type { OperationsDashboard } from '../operations/operations.api';
import './ReportsPage.css';

type Activity = { consultations: { day: string; doctor: string; status: string; total: number }[]; pharmacy: { day: string; type: string; total: number; units: string }[] };

type Category = 'activity' | 'patients' | 'appointments' | 'billing' | 'pharmacy' | 'operations';
const categories: Array<{ id: Category; label: string; permission: string }> = [
  { id: 'patients', label: 'Patients', permission: 'patients.registration_sources.manage' },
  { id: 'appointments', label: 'Appointments', permission: 'appointments.view' },
  { id: 'billing', label: 'Billing', permission: 'billing.view' },
  { id: 'pharmacy', label: 'Pharmacy', permission: 'pharmacy.inventory.view' },
  { id: 'activity', label: 'Doctor & pharmacy activity', permission: 'operations.view' },
  { id: 'operations', label: 'Operations', permission: 'operations.view' },
];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: string | number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);

export function ReportsPage() {
  const { user } = useAuth();
  const available = categories.filter((category) => hasPermission(user, category.permission));
  const [category, setCategory] = useState<Category>(available[0]?.id ?? 'patients');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<RegistrationSourceReport | Appointment[] | { cashier: CashierReport; receivables: ReceivablesReport } | InventoryWorklist | OperationsDashboard | Activity | null>(null);

  useEffect(() => {
    if (!available.some((item) => item.id === category)) { setCategory(available[0]?.id ?? 'patients'); return; }
    if (from > to) { setError('The start date must be on or before the end date.'); setData(null); return; }
    let active = true;
    setLoading(true); setError(''); setData(null);
    const load = async () => {
      try {
        const result = category === 'patients' ? await patientsApi.registrationSourceReport(from, to)
          : category === 'appointments' ? await appointmentsApi.list({ fromDate: from, toDate: to })
          : category === 'billing' ? await Promise.all([billingApi.cashierReport(from, to), billingApi.receivablesReport(1)]).then(([cashier, receivables]) => ({ cashier, receivables }))
          : category === 'pharmacy' ? await pharmacyApi.inventoryWorklist(1, 20, '', null)
          : category === 'activity' ? (await api.get<{ data: Activity }>('/operations/activity', { params: { from, to } })).data.data
          : await operationsApi.getDashboard();
        if (active) setData(result);
      } catch (cause) { if (active) setError(getErrorMessage(cause, 'Unable to load this report.')); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [category, from, to, revision, user]);

  return <div className="reports-page">
    <PageHeader title="Reports" subtitle="Patient activity, scheduling, revenue, stock and hospital operations." />
    {available.length === 0 ? <p role="alert">You do not have access to any report categories.</p> : <>
      <nav className="reports-tabs" aria-label="Report categories">{available.map((item) => <button type="button" key={item.id} aria-current={category === item.id ? 'page' : undefined} onClick={() => setCategory(item.id)}>{item.label}</button>)}</nav>
      <div className="reports-toolbar">
        {(category === 'patients' || category === 'appointments' || category === 'billing' || category === 'activity') && <><label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></>}
        <button type="button" onClick={() => setRevision((value) => value + 1)}>Refresh</button>
        {category === 'billing' && data && <button type="button" onClick={() => void billingApi.downloadCashierReport(from, to)}>Export cashier CSV</button>}
        {category === 'operations' && data && <button type="button" onClick={() => void operationsApi.downloadCsv()}>Export operations CSV</button>}
      </div>
      {loading && <p role="status">Loading report…</p>}
      {error && <p className="reports-error" role="alert">{error}</p>}
      {!loading && data && category === 'patients' && (() => { const report = data as RegistrationSourceReport; return <section><h2>Registration sources</h2><div className="reports-stats"><article><span>Registrations</span><strong>{report.total}</strong></article><article><span>Unassigned source</span><strong>{report.unassigned}</strong></article></div><table><thead><tr><th>Source</th><th>Code</th><th>Status</th><th>Patients</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.sourceId ?? 'unassigned'}><td>{row.name}</td><td>{row.code ?? '—'}</td><td>{row.sourceId == null ? 'Unassigned' : row.isActive ? 'Active' : 'Retired'}</td><td>{row.count}</td></tr>)}</tbody></table></section>; })()}
      {!loading && data && category === 'appointments' && (() => { const rows = data as Appointment[]; const statuses = [...new Set(rows.map((row) => row.status))]; return <section><h2>Appointment activity</h2><div className="reports-stats"><article><span>Total appointments</span><strong>{rows.length}</strong></article>{statuses.map((status) => <article key={status}><span>{status.replaceAll('_', ' ')}</span><strong>{rows.filter((row) => row.status === status).length}</strong></article>)}</div><table><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Department</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.appointmentDate} {row.appointmentTime}</td><td>{row.patientName}</td><td>{row.doctorName ?? '—'}</td><td>{row.departmentName ?? '—'}</td><td>{row.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table>{rows.length === 0 && <p>No appointments in this period.</p>}</section>; })()}
      {!loading && data && category === 'billing' && (() => { const { cashier, receivables } = data as { cashier: CashierReport; receivables: ReceivablesReport }; return <section><h2>Revenue and receivables</h2><div className="reports-stats"><article><span>Received</span><strong>{money(cashier.totals.received)}</strong></article><article><span>Refunded</span><strong>{money(cashier.totals.refunded)}</strong></article><article><span>Net collections</span><strong>{money(cashier.totals.net)}</strong></article><article><span>Outstanding as of {receivables.asOf}</span><strong>{money(receivables.totalOutstanding)}</strong></article></div><h3>Collections by method</h3><table><thead><tr><th>Method</th><th>Payments</th><th>Refunds</th><th>Net</th></tr></thead><tbody>{cashier.rows.map((row) => <tr key={row.method}><td>{row.method}</td><td>{row.paymentCount}</td><td>{row.refundCount}</td><td>{money(row.net)}</td></tr>)}</tbody></table><h3>Receivables aging</h3><table><thead><tr><th>Bucket</th><th>Invoices</th><th>Amount</th></tr></thead><tbody>{receivables.buckets.map((row) => <tr key={row.bucket}><td>{row.bucket.replaceAll('_', '–')}</td><td>{row.count}</td><td>{money(row.amount)}</td></tr>)}</tbody></table><Link to="/billing">Open billing</Link></section>; })()}
      {!loading && data && category === 'pharmacy' && (() => { const report = data as InventoryWorklist; return <section><h2>Inventory health</h2><p>Current stock snapshot</p><div className="reports-stats">{Object.entries(report.summary).map(([key, value]) => <article key={key}><span>{key.replaceAll(/([A-Z])/g, ' $1')}</span><strong>{value}</strong></article>)}</div><h3>Inventory batches</h3><table><thead><tr><th>Medication</th><th>Batch</th><th>Expiry</th><th>Units</th><th>Reorder level</th></tr></thead><tbody>{report.items.map((row) => <tr key={row.id}><td>{row.medicationName}</td><td>{row.batchNumber}</td><td>{row.expiryDate}</td><td>{row.quantity}</td><td>{row.reorderLevel}</td></tr>)}</tbody></table><p>Showing {report.items.length} of {report.total} batches. <Link to="/pharmacy">Open full inventory</Link></p></section>; })()}
      {!loading && data && category === 'activity' && (() => {
        const activity = data as Activity;
        return <section>
          <h2>Consultations by doctor</h2>
          {activity.consultations.length ? <table>
            <thead><tr><th>Date</th><th>Doctor</th><th>Status</th><th>Consultations</th></tr></thead>
            <tbody>{activity.consultations.map((row, index) => <tr key={index}>
              <td>{row.day}</td><td>{row.doctor}</td><td>{row.status}</td><td>{row.total}</td>
            </tr>)}</tbody>
          </table> : <p>No consultations in this period.</p>}
          <h2>Pharmacy stock activity</h2>
          {activity.pharmacy.length ? <table>
            <thead><tr><th>Date</th><th>Movement type</th><th>Transactions</th><th>Units moved</th></tr></thead>
            <tbody>{activity.pharmacy.map((row) => <tr key={row.day + row.type}>
              <td>{row.day}</td><td>{row.type}</td><td>{row.total}</td><td>{row.units}</td>
            </tr>)}</tbody>
          </table> : <p>No stock activity in this period.</p>}
        </section>;
      })()}
      {!loading && data && category === 'operations' && (() => { const report = data as OperationsDashboard; return <section><h2>Operational snapshot</h2><p>{report.generatedAt ? `Updated ${new Date(report.generatedAt).toLocaleString()}` : 'Current dashboard'}</p><div className="reports-stats">{Object.entries(report.kpis).map(([key, value]) => <article key={key}><span>{key.replaceAll(/([A-Z])/g, ' $1')}</span><strong>{key === 'billingOutstanding' ? money(value) : value}</strong></article>)}</div><h3>Alerts</h3>{report.alerts.length ? <ul>{report.alerts.map((alert) => <li key={alert.id}><strong>{alert.title}</strong> — {alert.detail ?? alert.severity}</li>)}</ul> : <p>No active alerts.</p>}<Link to="/operations">Open operations dashboard</Link></section>; })()}
    </>}
  </div>;
}

export default ReportsPage;
