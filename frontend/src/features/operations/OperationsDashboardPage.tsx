import { useCallback, useEffect, useState } from 'react';
import { PageLoader } from '../../components/ui/Loader';
import { PageHeader } from '../../components/ui/PageHeader';
import { operationsApi, OperationsDashboard, OperationsQueueItem } from './operations.api';
import { FollowUpQueue } from '../patients/FollowUpQueue';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import './OperationsDashboardPage.css';

const emptyDashboard: OperationsDashboard = {
  kpis: { appointmentsToday: 0, appointmentsWaiting: 0, admissionsActive: 0, bedsAvailable: 0, billingOutstanding: 0, lowStockItems: 0, labPending: 0, radiologyPending: 0 },
  queues: { appointments: [], admissions: [], billing: [], laboratory: [], radiology: [] },
  alerts: [],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Queue({ items }: { items: OperationsQueueItem[] }) {
  if (!items.length) return <div className="operations-empty">Nothing is waiting right now.</div>;
  return <ul className="operations-queue" aria-label="Operational queue">
    {items.slice(0, 5).map((item) => <li key={item.id} className="operations-queue__item">
      <div><strong>{item.label}</strong><span>{item.detail || item.status || 'Requires attention'}</span></div>
      <div className="operations-queue__meta">{item.priority && <em className={`operations-priority operations-priority--${item.priority.toLowerCase()}`}>{item.priority}</em>}{item.timestamp && <time>{formatTime(item.timestamp)}</time>}{item.count != null && <b>{item.count}</b>}</div>
    </li>)}
  </ul>;
}

export function OperationsDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<OperationsDashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setDashboard(await operationsApi.getDashboard()); }
    catch (err: any) { setError(err?.response?.data?.message || err?.message || 'Unable to load the operations dashboard.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const k = dashboard.kpis;
  const cards = [
    ['Appointments today', k.appointmentsToday, 'appointments'],
    ['Waiting to be seen', k.appointmentsWaiting, 'attention'],
    ['Active admissions', k.admissionsActive, 'inpatient'],
    ['Beds available', k.bedsAvailable, 'available'],
    ['Outstanding billing', formatCurrency(k.billingOutstanding), 'billing'],
    ['Low-stock items', k.lowStockItems, 'warning'],
    ['Lab pending', k.labPending, 'lab'],
    ['Radiology pending', k.radiologyPending, 'radiology'],
  ] as const;

  return <div className="operations-page">
    <PageHeader title="Operations dashboard" subtitle="A live view of patient flow, capacity, revenue, and diagnostic work." />
    <div className="operations-toolbar"><span className="operations-updated">{dashboard.generatedAt ? `Updated ${formatTime(dashboard.generatedAt)}` : 'Live operational overview'}</span><div className="operations-toolbar__actions"><button type="button" className="operations-refresh" onClick={() => void operationsApi.downloadCsv()} aria-label="Export operations dashboard as CSV">Export CSV</button><button type="button" className="operations-refresh" onClick={() => void loadDashboard(true)} disabled={loading || refreshing} aria-label="Refresh operations dashboard">{refreshing ? 'Refreshing…' : 'Refresh'}</button></div></div>
    {error && <div className="operations-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadDashboard()}>Try again</button></div>}
    {loading ? <PageLoader label="Loading operations dashboard…" /> : <>
      <section className="operations-kpis" aria-label="Key performance indicators">{cards.map(([label, value, tone]) => <article className={`operations-kpi operations-kpi--${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
      <section className="operations-content" aria-label="Operational queues">
        <div className="operations-panels">
          {hasPermission(user, 'patients.view') ? <FollowUpQueue /> : null}
          <article className="operations-panel"><header><div><small>Front office</small><h2>Appointments</h2></div><b>{k.appointmentsWaiting} waiting</b></header><Queue items={dashboard.queues.appointments} /></article>
          <article className="operations-panel"><header><div><small>Inpatient</small><h2>Admissions</h2></div><b>{k.admissionsActive} active</b></header><Queue items={dashboard.queues.admissions} /></article>
          <article className="operations-panel"><header><div><small>Finance</small><h2>Billing balances</h2></div><b>{formatCurrency(k.billingOutstanding)}</b></header><Queue items={dashboard.queues.billing} /></article>
          <article className="operations-panel"><header><div><small>Diagnostics</small><h2>Laboratory</h2></div><b>{k.labPending} pending</b></header><Queue items={dashboard.queues.laboratory} /></article>
          <article className="operations-panel"><header><div><small>Diagnostics</small><h2>Radiology</h2></div><b>{k.radiologyPending} pending</b></header><Queue items={dashboard.queues.radiology} /></article>
        </div>
        <aside className="operations-alerts" aria-labelledby="operations-alerts-title"><header><div><small>Attention needed</small><h2 id="operations-alerts-title">Alerts</h2></div><b>{dashboard.alerts.length}</b></header>{dashboard.alerts.length ? <ul>{dashboard.alerts.map((alert) => <li key={alert.id} className={`operations-alert operations-alert--${alert.severity}`}><span className="operations-alert__marker" aria-hidden="true">!</span><div><strong>{alert.title}{alert.count != null && ` · ${alert.count}`}</strong><span>{alert.detail || 'Review this item when possible.'}</span></div></li>)}</ul> : <div className="operations-empty">No active alerts. Your teams are on track.</div>}</aside>
      </section>
    </>}
  </div>;
}
