import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader } from '../../components/ui/Loader';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/api';
import { auditApi, AuditLog, AuditLogFilters, AuditLogPage } from './audit.api';
import './AuditLogsPage.css';

const initialPage: AuditLogPage = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 };

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function statusClass(status: number | string | null) {
  const code = Number(status);
  if (code >= 200 && code < 300) return 'audit-status--success';
  if (code >= 400 && code < 500) return 'audit-status--warning';
  if (code >= 500) return 'audit-status--error';
  return '';
}

function SkeletonRows() {
  return <Loader size="md" variant="block" label="Loading audit logs…" />;
}

function LogTable({ logs }: { logs: AuditLog[] }) {
  return <div className="audit-table-wrap"><table className="audit-table"><caption className="sr-only">Audit log entries</caption><thead><tr><th scope="col">Timestamp</th><th scope="col">User</th><th scope="col">Method</th><th scope="col">Path</th><th scope="col">Status</th><th scope="col">Request ID</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td data-label="Timestamp"><time dateTime={log.timestamp || undefined}>{formatTimestamp(log.timestamp)}</time></td><td data-label="User"><span className="audit-user">{log.user}</span></td><td data-label="Method"><span className={`audit-method audit-method--${log.method.toLowerCase()}`}>{log.method}</span></td><td data-label="Path"><code className="audit-path">{log.path}</code></td><td data-label="Status"><span className={`audit-status ${statusClass(log.status)}`}>{log.status ?? '—'}</span></td><td data-label="Request ID"><code className="audit-request-id" title={log.requestId || undefined}>{log.requestId || '—'}</code></td></tr>)}</tbody></table></div>;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogPage>(initialPage);
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, pageSize: 25 });
  const [draft, setDraft] = useState({ search: '', method: '', status: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextFilters: AuditLogFilters = filters) => {
    setLoading(true); setError(null);
    try { setLogs(await auditApi.listLogs(nextFilters)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load audit logs.')); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...filters, ...draft, page: 1 };
    setFilters(next); void load(next);
  };

  const clearFilters = () => {
    const next = { page: 1, pageSize: filters.pageSize };
    setDraft({ search: '', method: '', status: '', from: '', to: '' }); setFilters(next); void load(next);
  };

  const goToPage = (page: number) => {
    const next = { ...filters, page: Math.max(1, Math.min(logs.totalPages, page)) };
    setFilters(next); void load(next);
  };

  const rangeText = useMemo(() => {
    if (!logs.total) return 'No entries';
    const start = (logs.page - 1) * logs.pageSize + 1;
    return `${start}–${Math.min(logs.page * logs.pageSize, logs.total)} of ${logs.total}`;
  }, [logs]);

  return <div className="audit-page">
    <PageHeader title="Audit logs" subtitle="Review system activity with a traceable record of every request." />
    <section className="audit-card audit-filters" aria-labelledby="audit-filters-title">
      <div className="audit-card-heading"><div><span className="audit-eyebrow">SECURITY &amp; COMPLIANCE</span><h2 id="audit-filters-title">Filter activity</h2></div><span className="audit-total">{logs.total.toLocaleString()} entries</span></div>
      <form onSubmit={submitFilters}><div className="audit-filter-grid"><label>Search<input type="search" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Path, user, request ID" /></label><label>Method<select value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })}><option value="">All methods</option><option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option><option value="DELETE">DELETE</option></select></label><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">All statuses</option><option value="2">2xx success</option><option value="4">4xx client error</option><option value="5">5xx server error</option></select></label><label>From<input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label><label>To<input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label><div className="audit-filter-actions"><button type="submit" className="audit-button audit-button--primary">Apply filters</button><button type="button" className="audit-button audit-button--quiet" onClick={clearFilters}>Clear</button></div></div></form>
    </section>
    <section className="audit-card audit-results" aria-labelledby="audit-results-title">
      <div className="audit-card-heading"><div><span className="audit-eyebrow">REQUEST HISTORY</span><h2 id="audit-results-title">System activity</h2></div><button type="button" className="audit-button audit-button--quiet" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {error ? <div className="audit-state audit-state--error" role="alert"><strong>Couldn’t load audit logs</strong><span>{error}</span><button type="button" className="audit-button audit-button--primary" onClick={() => void load()}>Try again</button></div> : loading ? <SkeletonRows /> : logs.items.length ? <LogTable logs={logs.items} /> : <div className="audit-state" role="status"><strong>No audit entries found</strong><span>Try adjusting the filters or check back after more activity is recorded.</span></div>}
      {!loading && !error && logs.items.length > 0 && <div className="audit-pagination"><span>Showing {rangeText}</span><div><button type="button" className="audit-page-button" onClick={() => goToPage(logs.page - 1)} disabled={logs.page <= 1}>Previous</button><span className="audit-page-number">Page {logs.page} of {logs.totalPages}</span><button type="button" className="audit-page-button" onClick={() => goToPage(logs.page + 1)} disabled={logs.page >= logs.totalPages}>Next</button></div></div>}
    </section>
  </div>;
}
