import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { laboratoryApi, type CreateLaboratoryOrderPayload, type CreateLaboratoryTestPayload, type LaboratoryAddendum, type LaboratoryCommunication, type LaboratoryCommunicationQueueItem, type LaboratoryDoctorCandidate, type LaboratoryOrder, type LaboratoryOrderStatus, type LaboratoryPatientCandidate, type LaboratoryTest, type UpdateLaboratoryResultPayload } from './laboratory.api';
import './LaboratoryDiagnosticsPage.css';

type Modal = 'order' | 'catalog' | 'collect' | 'result' | 'verify' | 'view' | 'communications' | null;

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ordered: 'info', collected: 'warning', processing: 'warning', verified: 'info', completed: 'success', cancelled: 'danger',
};

function elapsedLabel(value: string | null, now: number) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unknown';
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr ${minutes % 60} min` : `${Math.floor(hours / 24)} d ${hours % 24} hr`;
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function LaboratoryDiagnosticsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'laboratory.create');
  const canUpdate = hasPermission(user, 'laboratory.update');
  const canVerify = hasPermission(user, 'laboratory.verify');
  const canRelease = hasPermission(user, 'laboratory.release');
  const canAmend = hasPermission(user, 'laboratory.amend');
  const canCancel = hasPermission(user, 'laboratory.cancel');
  const canManageCatalog = hasPermission(user, 'laboratory.catalog.manage');
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [catalogTests, setCatalogTests] = useState<LaboratoryTest[]>([]);
  const [orders, setOrders] = useState<LaboratoryOrder[]>([]);
  const [queue, setQueue] = useState<LaboratoryCommunicationQueueItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(25);
  const [queueSearch, setQueueSearch] = useState('');
  const [debouncedQueueSearch, setDebouncedQueueSearch] = useState('');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');
  const queueRequestId = useRef(0);
  const [now, setNow] = useState(Date.now());
  const [worklistTotal, setWorklistTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, pending: 0, processing: 0, completed: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<LaboratoryOrderStatus | ''>('');
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedOrder, setSelectedOrder] = useState<LaboratoryOrder | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<LaboratoryOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LaboratoryOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [retireTarget, setRetireTarget] = useState<LaboratoryTest | null>(null);

  const load = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError('');
    try {
      const [testRows, worklist] = await Promise.all([laboratoryApi.listTests(), laboratoryApi.worklist({ page, pageSize, search: debouncedSearch || undefined, status: status || undefined })]);
      if (currentRequest !== requestId.current) return;
      setTests(testRows); setOrders(worklist.items); setWorklistTotal(worklist.total); setSummary(worklist.summary);
    } catch (err) {
      if (currentRequest === requestId.current) setError(getErrorMessage(err, 'Unable to load laboratory diagnostics'));
    } finally { if (currentRequest === requestId.current) setLoading(false); }
  };

  const loadQueue = async () => {
    const currentRequest = ++queueRequestId.current;
    setQueueLoading(true); setQueueError('');
    try {
      const result = await laboratoryApi.communicationQueue({ page: queuePage, pageSize: queuePageSize, search: debouncedQueueSearch || undefined });
      if (currentRequest !== queueRequestId.current) return;
      setQueue(result.items); setQueueTotal(result.total);
      if (queuePage > 1 && result.total <= (queuePage - 1) * queuePageSize) setQueuePage(Math.max(1, Math.ceil(result.total / queuePageSize)));
    } catch (err) { if (currentRequest === queueRequestId.current) setQueueError(getErrorMessage(err, 'Unable to load communication follow-up queue')); }
    finally { if (currentRequest === queueRequestId.current) setQueueLoading(false); }
  };
  useEffect(() => { const timer = setTimeout(() => setDebouncedQueueSearch(queueSearch.trim().length >= 2 ? queueSearch.trim() : ''), 300); return () => clearTimeout(timer); }, [queueSearch]);
  useEffect(() => { void loadQueue(); }, [queuePage, queuePageSize, debouncedQueueSearch]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const refresh = () => { void load(); void loadQueue(); };
  const openQueueCommunication = (row: LaboratoryCommunicationQueueItem) => {
    setSelectedOrder({ id: row.id, orderNumber: row.orderNumber, patientId: row.patientId, patientName: row.patientName, patientMrdNumber: row.patientMrdNumber, testId: 0, testName: row.testName, status: row.status, priority: row.priority, verifiedAt: row.verifiedAt, completedAt: row.completedAt });
    setModal('communications');
  };
  const queueColumns: TableColumn<LaboratoryCommunicationQueueItem>[] = [
    { key: 'priority', header: 'Priority', render: (row) => <div><Badge tone={row.priority === 'stat' ? 'danger' : row.priority === 'urgent' ? 'warning' : 'neutral'}>{row.priority.toUpperCase()}</Badge>{row.latestAddendumAt && <div className="ui-table__cell-sub">Correction follow-up</div>}</div> },
    { key: 'order', header: 'Order / patient', render: (row) => <div><div className="ui-table__cell-title">{row.orderNumber}</div><div className="ui-table__cell-sub">{row.patientName || `Patient #${row.patientId}`} / {row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'test', header: 'Investigation', render: (row) => row.testName },
    { key: 'elapsed', header: 'Awaiting since', render: (row) => <div><strong>{elapsedLabel(row.latestAddendumAt || row.verifiedAt || row.completedAt, now)}</strong><div className="ui-table__cell-sub">{row.latestAddendumAt ? 'Corrected' : row.status === 'verified' ? 'Verified, awaiting release' : 'Released'} · {dateLabel(row.latestAddendumAt || row.verifiedAt || row.completedAt)}</div></div> },
    { key: 'attempts', header: 'Pending contact', render: (row) => <div>{row.attemptCount} {row.attemptCount === 1 ? 'attempt' : 'attempts'}<div className="ui-table__cell-sub">{row.lastAttemptAt ? `Last: ${dateLabel(row.lastAttemptAt)}` : 'No attempts recorded'}</div></div> },
    { key: 'actions', header: 'Action', render: (row) => <Button size="sm" variant="secondary" onClick={() => openQueueCommunication(row)}>Communications</Button> },
  ];

  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim().length >= 2 ? search.trim() : ''), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { void load(); }, [page, pageSize, debouncedSearch, status]);

  const columns = useMemo<TableColumn<LaboratoryOrder>[]>(() => [
    { key: 'order', header: 'Order', render: (row) => <div><div className="ui-table__cell-title">{row.orderNumber}</div><div className="ui-table__cell-sub">{dateLabel(row.orderedAt)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName || `Patient #${row.patientId}`}</div><div className="ui-table__cell-sub">{row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'test', header: 'Investigation', render: (row) => <div><div className="ui-table__cell-title">{row.testName}</div><div className="ui-table__cell-sub">{row.testCode || 'Laboratory test'} · {row.priority || 'routine'}</div></div> },
    { key: 'result', header: 'Result', render: (row) => row.result ? <div><div className="ui-table__cell-title">{row.result} {row.resultUnit || ''}</div><div className="ui-table__cell-sub">{row.referenceRange ? `Reference: ${row.referenceRange}` : 'Result entered'}</div></div> : <span className="laboratory-muted">Awaiting result</span> },
    { key: 'status', header: 'Status', render: (row) => <div><Badge tone={statusTone[row.status] || 'neutral'}>{row.status.replace('_', ' ')}</Badge>{row.status === 'cancelled' && row.cancellationReason && <div className="ui-table__cell-sub" title={row.cancellationReason}>Reason: {row.cancellationReason}</div>}</div> },
    { key: 'actions', header: 'Actions', render: (row) => <div className="laboratory-actions">
      {row.status === 'ordered' && canUpdate && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('collect'); }}>Collect sample</Button>}
      {row.status === 'ordered' && canCancel && <Button size="sm" variant="secondary" onClick={() => { setCancelTarget(row); setCancelReason(''); setError(''); }}>Cancel</Button>}
      {['collected', 'processing'].includes(row.status) && canUpdate && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('result'); setError(''); }}>{row.result ? 'Edit draft' : 'Enter draft'}</Button>}
      {row.status === 'processing' && canVerify && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('verify'); }}>Verify</Button>}
      {row.status === 'verified' && canRelease && <Button size="sm" onClick={() => setReleaseTarget(row)}>Release</Button>}
      {(row.status === 'completed' || row.status === 'verified' && (canUpdate || canVerify || canRelease)) && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('view'); }}>View result</Button>}
      {(row.status === 'completed' || row.status === 'verified' && ['urgent', 'stat'].includes(row.priority || '')) && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('communications'); }}>Communications</Button>}
    </div> },
  ], [canUpdate, canVerify, canRelease, canCancel]);

  const saveOrder = async (payload: CreateLaboratoryOrderPayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const created = await laboratoryApi.createOrder(payload);
      setModal(null); setNotice(`Laboratory order ${created.orderNumber} created successfully.`); if (page === 1) void load(); else setPage(1);
    } catch (err) { setError(getErrorMessage(err, 'Unable to create laboratory order')); }
    finally { setSaving(false); }
  };
  const saveTest = async (payload: CreateLaboratoryTestPayload) => {
    setSaving(true); setError('');
    try { const created = await laboratoryApi.createTest(payload); setTests((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name))); setCatalogTests((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name))); setModal(null); setNotice('Laboratory test added.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to add laboratory test')); }
    finally { setSaving(false); }
  };
  const retireTest = async () => {
    if (!retireTarget) return;
    setSaving(true); setError('');
    try { await laboratoryApi.retireTest(retireTarget.id); setTests((current) => current.filter((row) => row.id !== retireTarget.id)); setCatalogTests((current) => current.map((row) => row.id === retireTarget.id ? { ...row, isActive: false } : row)); setRetireTarget(null); setNotice('Laboratory test retired.'); }
    catch (err) { setRetireTarget(null); setError(getErrorMessage(err, 'Unable to retire laboratory test')); }
    finally { setSaving(false); }
  };
  const openCatalog = async () => {
    setError('');
    try { setCatalogTests(await laboratoryApi.listAllTests()); setModal('catalog'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load laboratory catalog')); }
  };
  const reactivateTest = async (test: LaboratoryTest) => {
    setSaving(true); setError('');
    try { const updated = await laboratoryApi.reactivateTest(test.id); setCatalogTests((current) => current.map((row) => row.id === updated.id ? updated : row)); setTests((current) => [...current, updated].sort((a, b) => a.name.localeCompare(b.name))); setNotice('Laboratory test reactivated.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to reactivate laboratory test')); }
    finally { setSaving(false); }
  };

  const saveResult = async (payload: UpdateLaboratoryResultPayload) => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await laboratoryApi.updateResult(selectedOrder.id, payload);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); setModal(null); setSelectedOrder(null); setNotice('Laboratory draft saved successfully.'); void load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save laboratory result')); }
    finally { setSaving(false); }
  };
  const collectSample = async (specimenLabel: string) => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await laboratoryApi.collectSample(selectedOrder.id, specimenLabel);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); setModal(null); setSelectedOrder(null); setNotice('Sample collection recorded.'); void load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to collect sample')); }
    finally { setSaving(false); }
  };
  const verifyResult = async (confirmation: { patientAndSpecimenChecked: boolean; qualityControlChecked: boolean }) => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try { const updated = await laboratoryApi.verifyResult(selectedOrder.id, confirmation); setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setModal(null); setSelectedOrder(null); setNotice('Result verified. It is ready for release.'); refresh(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to verify result')); }
    finally { setSaving(false); }
  };
  const releaseResult = async () => {
    if (!releaseTarget) return;
    setSaving(true); setError(''); setNotice('');
    try { const updated = await laboratoryApi.releaseResult(releaseTarget.id); setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setReleaseTarget(null); setNotice('Verified result released.'); refresh(); }
    catch (err) { setReleaseTarget(null); setError(getErrorMessage(err, 'Unable to release result')); }
    finally { setSaving(false); }
  };
  const cancelOrder = async () => {
    if (!cancelTarget) return;
    setSaving(true); setError('');
    try { const updated = await laboratoryApi.cancelOrder(cancelTarget.id, cancelReason.trim()); setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setCancelTarget(null); setNotice('Laboratory order cancelled.'); void load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to cancel laboratory order')); }
    finally { setSaving(false); }
  };

  return <div className="laboratory-page">
    <PageHeader title="Laboratory diagnostics" subtitle="Order investigations, track turnaround, and publish verified results." actions={<div className="laboratory-actions">{canManageCatalog && <Button size="sm" variant="secondary" onClick={() => void openCatalog()}>Manage tests</Button>}{canCreate && <Button size="sm" onClick={() => setModal('order')}>Order a test</Button>}</div>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="laboratory-kpis" aria-label="Laboratory summary">
      <article><span>Total orders</span><strong>{summary.total}</strong><small>All laboratory requests</small></article>
      <article className="laboratory-kpi--amber"><span>Pending workflow</span><strong>{summary.pending}</strong><small>Awaiting completion</small></article>
      <article className="laboratory-kpi--blue"><span>In progress</span><strong>{summary.processing}</strong><small>Collected, processing, or awaiting release</small></article>
      <article className="laboratory-kpi--green"><span>Completed</span><strong>{summary.completed}</strong><small>Results available to care teams</small></article>
    </div>
    <section className="laboratory-section laboratory-communication-queue" aria-label="Laboratory result communication follow-up">
      <div className="laboratory-section__heading"><div><span className="laboratory-eyebrow">RESULTS / CONTACT FOLLOW-UP</span><h2>Result communication follow-up <span className="laboratory-queue-count">{queueTotal}</span></h2><p>Verified urgent and STAT results, plus released result corrections, awaiting confirmed delivery. Record each contact attempt and follow up until delivered.</p></div><Button variant="secondary" size="sm" onClick={() => void loadQueue()}>Refresh queue</Button></div>
      {queueError && <div className="laboratory-queue-error"><Alert tone="error">{queueError}</Alert></div>}
      <Table columns={queueColumns} rows={queue} rowKey={(row) => row.id} loading={queueLoading} searchPlaceholder="Search order, patient, or test (2+ characters)" emptyMessage="No verified urgent, STAT, or corrected results awaiting communication." serverPagination={{ page: queuePage, pageSize: queuePageSize, total: queueTotal, search: queueSearch, onPageChange: setQueuePage, onPageSizeChange: (size) => { setQueuePageSize(size); setQueuePage(1); }, onSearchChange: (value) => { setQueueSearch(value); setQueuePage(1); } }} />
    </section>
    <section className="laboratory-section">
      <div className="laboratory-section__heading"><div><span className="laboratory-eyebrow">DIAGNOSTICS WORKBENCH</span><h2>Laboratory orders</h2><p>Review requests and enter results when the lab completes an investigation.</p></div><div className="laboratory-actions"><Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value as LaboratoryOrderStatus | ''); setPage(1); }} options={[{ value: '', label: 'All statuses' }, ...(['ordered', 'collected', 'processing', 'verified', 'completed', 'cancelled'] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))]} /><Button variant="secondary" size="sm" onClick={refresh}>Refresh</Button></div></div>
      <Table columns={columns} rows={orders} rowKey={(row) => row.id} loading={loading} searchPlaceholder="Search order, patient, or test (2+ characters)" emptyMessage="No matching laboratory orders found." serverPagination={{ page, pageSize, total: worklistTotal, search, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(1); }, onSearchChange: (value) => { setSearch(value); setPage(1); } }} />
    </section>
    {modal === 'order' ? <OrderForm tests={tests} saving={saving} error={error} onClose={() => setModal(null)} onSubmit={(payload) => void saveOrder(payload)} /> : null}
    {modal === 'catalog' && <CatalogForm tests={catalogTests} saving={saving} error={error} onClose={() => setModal(null)} onSubmit={(payload) => void saveTest(payload)} onRetire={(test) => setRetireTarget(test)} onReactivate={(test) => void reactivateTest(test)} />}
    {modal === 'collect' && selectedOrder ? <CollectForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(label) => void collectSample(label)} /> : null}
    {modal === 'result' && selectedOrder ? <ResultForm order={selectedOrder} saving={saving} error={error} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(payload) => void saveResult(payload)} /> : null}
    {modal === 'verify' && selectedOrder ? <VerifyForm order={selectedOrder} saving={saving} error={error} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(confirmation) => void verifyResult(confirmation)} /> : null}
    {modal === 'view' && selectedOrder ? <ResultView order={selectedOrder} canAmend={canAmend} onClose={() => { setModal(null); setSelectedOrder(null); }} /> : null}
    {modal === 'communications' && selectedOrder ? <CommunicationView order={selectedOrder} canRecord={canRelease} onClose={() => { setModal(null); setSelectedOrder(null); void loadQueue(); }} onRecorded={() => void loadQueue()} /> : null}
    <ConfirmDialog open={Boolean(releaseTarget)} title="Release laboratory result" message="Release this verified result to the care team? The released result cannot be edited in place." confirmLabel="Release result" confirming={saving} onConfirm={() => void releaseResult()} onCancel={() => setReleaseTarget(null)} />
    <ConfirmDialog open={Boolean(retireTarget)} title="Retire laboratory test" message={`Retire ${retireTarget?.name || 'this test'} from new orders? Existing orders remain available.`} confirmLabel="Retire test" tone="danger" confirming={saving} onConfirm={() => void retireTest()} onCancel={() => setRetireTarget(null)} />
    {cancelTarget && <ModalShell title="Cancel laboratory order" eyebrow={cancelTarget.orderNumber} onClose={() => setCancelTarget(null)}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); void cancelOrder(); }}><p>Cancel the uncollected order for {cancelTarget.patientName || `patient #${cancelTarget.patientId}`}?</p><label className="laboratory-textarea"><span>Reason</span><textarea required minLength={5} maxLength={500} rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label>{error && <Alert tone="error">{error}</Alert>}<FormFooter saving={saving} onClose={() => setCancelTarget(null)} submitLabel="Cancel order" disabled={cancelReason.trim().length < 5} /></form></ModalShell>}
  </div>;
}

function ModalShell({ title, eyebrow, onClose, children, className = '' }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <div className="laboratory-modal-backdrop" role="presentation" onClick={onClose}><section className={`laboratory-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="laboratory-modal-title" onClick={(event) => event.stopPropagation()}><div className="laboratory-modal__header"><div><span className="laboratory-eyebrow">{eyebrow}</span><h2 id="laboratory-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function CatalogForm({ tests, saving, error, onClose, onSubmit, onRetire, onReactivate }: { tests: LaboratoryTest[]; saving: boolean; error: string; onClose: () => void; onSubmit: (payload: CreateLaboratoryTestPayload) => void; onRetire: (test: LaboratoryTest) => void; onReactivate: (test: LaboratoryTest) => void }) {
  const [form, setForm] = useState({ testCode: '', testName: '', category: '', priority: 'routine' as CreateLaboratoryTestPayload['priority'], turnaroundHours: '24', price: '0' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Laboratory test catalog" eyebrow="INVESTIGATIONS" onClose={onClose}><div className="laboratory-form"><h3>Active tests</h3><div className="laboratory-catalog-list">{tests.map((test) => <div key={test.id}><span>{test.name} · {test.code} · {test.isActive ? 'Active' : 'Retired'}</span>{test.isActive ? <Button size="sm" variant="secondary" onClick={() => onRetire(test)}>Retire</Button> : <Button size="sm" variant="secondary" onClick={() => onReactivate(test)}>Reactivate</Button>}</div>)}</div></div><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ testCode: form.testCode.trim(), testName: form.testName.trim(), category: form.category.trim() || null, priority: form.priority, turnaroundHours: Number(form.turnaroundHours), price: Number(form.price) }); }}><h3>Add test</h3><div className="laboratory-form__grid"><Input label="Code" required minLength={2} maxLength={40} value={form.testCode} onChange={(event) => update('testCode', event.target.value)} /><Input label="Name" required minLength={2} maxLength={180} value={form.testName} onChange={(event) => update('testName', event.target.value)} /><Input label="Category" maxLength={80} value={form.category} onChange={(event) => update('category', event.target.value)} /><Select label="Default priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} /><Input label="Turnaround hours" type="number" min="1" required value={form.turnaroundHours} onChange={(event) => update('turnaroundHours', event.target.value)} /><Input label="Price" type="number" min="0" required value={form.price} onChange={(event) => update('price', event.target.value)} /></div>{error && <Alert tone="error">{error}</Alert>}<FormFooter saving={saving} onClose={onClose} submitLabel="Add test" /></form></ModalShell>;
}

function OrderForm({ tests, saving, error, onClose, onSubmit }: { tests: LaboratoryTest[]; saving: boolean; error: string; onClose: () => void; onSubmit: (payload: CreateLaboratoryOrderPayload) => void }) {
  const [form, setForm] = useState({ patientId: '', doctorId: '', testId: tests[0]?.id ? String(tests[0].id) : '', priority: 'routine' as CreateLaboratoryOrderPayload['priority'], clinicalNotes: '' });
  const [patientQuery, setPatientQuery] = useState('');
  const [patientMatches, setPatientMatches] = useState<LaboratoryPatientCandidate[]>([]);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorMatches, setDoctorMatches] = useState<LaboratoryDoctorCandidate[]>([]);
  const [lookupError, setLookupError] = useState('');
  useEffect(() => {
    if (patientQuery.trim().length < 2 || form.patientId) { setPatientMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { laboratoryApi.patientCandidates(patientQuery.trim()).then((rows) => { if (active) { setPatientMatches(rows); setLookupError(''); } }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [patientQuery, form.patientId]);
  useEffect(() => {
    if (doctorQuery.trim().length < 2 || form.doctorId) { setDoctorMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { laboratoryApi.doctorCandidates(doctorQuery.trim()).then((rows) => { if (active) { setDoctorMatches(rows); setLookupError(''); } }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to search doctors')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [doctorQuery, form.doctorId]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Order a laboratory test" eyebrow="NEW INVESTIGATION" onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); if (!form.patientId) return; onSubmit({ patientId: Number(form.patientId), testId: Number(form.testId), doctorId: form.doctorId ? Number(form.doctorId) : null, priority: form.priority, clinicalNotes: form.clinicalNotes || null }); }}>
    <div><Input label="Search patient by name or MRD" value={patientQuery} onChange={(event) => { setPatientQuery(event.target.value); update('patientId', ''); }} placeholder="Type at least 2 characters" />{patientMatches.length > 0 && <Select label="Matching patients" value={form.patientId} onChange={(event) => { const patient = patientMatches.find((row) => String(row.id) === event.target.value); update('patientId', event.target.value); if (patient) setPatientQuery(`${patient.fullName} (${patient.mrdNumber})`); }} options={[{ value: '', label: 'Select a patient' }, ...patientMatches.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{form.patientId && <small>Selected patient ID: {form.patientId}</small>}{lookupError && <Alert tone="error">{lookupError}</Alert>}</div>
    <div><Input label="Referring doctor (optional)" value={doctorQuery} onChange={(event) => { setDoctorQuery(event.target.value); update('doctorId', ''); }} placeholder="Search name, code, or registration number" />{doctorMatches.length > 0 && <Select label="Matching doctors" value={form.doctorId} onChange={(event) => { const doctor = doctorMatches.find((row) => String(row.id) === event.target.value); update('doctorId', event.target.value); if (doctor) setDoctorQuery(`${doctor.name} (${doctor.doctorCode})`); }} options={[{ value: '', label: 'Select a doctor' }, ...doctorMatches.map((row) => ({ value: row.id, label: `${row.name} · ${row.doctorCode}` }))]} />}{form.doctorId && <small>Selected doctor ID: {form.doctorId}</small>}</div>
    <div className="laboratory-form__grid"><Select label="Investigation" required value={form.testId} onChange={(event) => update('testId', event.target.value)} options={[{ value: '', label: tests.length ? 'Select a test' : 'No tests available' }, ...tests.map((test) => ({ value: test.id, label: `${test.name}${test.code ? ` · ${test.code}` : ''}` }))]} /><Select label="Priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} /></div><label className="laboratory-textarea"><span>Clinical notes</span><textarea rows={4} maxLength={5000} value={form.clinicalNotes} onChange={(event) => update('clinicalNotes', event.target.value)} placeholder="Relevant symptoms, provisional diagnosis, or collection instructions" /></label>{error && <Alert tone="error">{error}</Alert>}<FormFooter saving={saving} onClose={onClose} submitLabel="Create order" disabled={!tests.length || !form.patientId} /></form></ModalShell>;
}

function ResultForm({ order, saving, error, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; error: string; onClose: () => void; onSubmit: (payload: UpdateLaboratoryResultPayload) => void }) {
  const [form, setForm] = useState({ result: order.result || '', resultUnit: order.resultUnit || '', referenceRange: order.referenceRange || '', remarks: order.remarks || '', status: 'processing' as const });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title={`Result · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ result: form.result, resultUnit: form.resultUnit || null, referenceRange: form.referenceRange || null, remarks: form.remarks || null, status: form.status }); }}><div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.priority || 'routine'} priority</span></div><label className="laboratory-textarea"><span>Result value</span><textarea rows={4} required value={form.result} onChange={(event) => update('result', event.target.value)} placeholder="Enter the observed result or interpretation" /></label><div className="laboratory-form__grid"><Input label="Unit" value={form.resultUnit} onChange={(event) => update('resultUnit', event.target.value)} placeholder="e.g. mg/dL" /><Input label="Reference range" value={form.referenceRange} onChange={(event) => update('referenceRange', event.target.value)} placeholder="e.g. 70–100 mg/dL" /></div><label className="laboratory-textarea"><span>Remarks</span><textarea rows={3} value={form.remarks} onChange={(event) => update('remarks', event.target.value)} placeholder="Add interpretation or quality notes" /></label>{error && <Alert tone="error">{error}</Alert>}<FormFooter saving={saving} onClose={onClose} submitLabel="Save draft" /></form></ModalShell>;
}

function VerifyForm({ order, saving, error, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; error: string; onClose: () => void; onSubmit: (confirmation: { patientAndSpecimenChecked: boolean; qualityControlChecked: boolean }) => void }) {
  const [patientAndSpecimenChecked, setPatientAndSpecimenChecked] = useState(false);
  const [qualityControlChecked, setQualityControlChecked] = useState(false);
  return <ModalShell title={`Verify result · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); if (patientAndSpecimenChecked && qualityControlChecked) onSubmit({ patientAndSpecimenChecked, qualityControlChecked }); }}>
    <div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · Specimen {order.specimenLabel || 'not labeled'}</span></div>
    {order.clinicalNotes && <section><h3>Order notes</h3><p>{order.clinicalNotes}</p></section>}
    <section><h3>Draft result</h3><p>{order.result} {order.resultUnit || ''}</p><p>{order.referenceRange ? `Reference range: ${order.referenceRange}` : 'Reference range not recorded.'}</p>{order.remarks && <p>{order.remarks}</p>}</section>
    <label><input type="checkbox" checked={patientAndSpecimenChecked} onChange={(event) => setPatientAndSpecimenChecked(event.target.checked)} /> I checked the patient, order, specimen, and transcribed result.</label>
    <label><input type="checkbox" checked={qualityControlChecked} onChange={(event) => setQualityControlChecked(event.target.checked)} /> I reviewed the relevant quality-control information under our laboratory procedure.</label>
    <Alert tone="warning">Verification requires a staff member other than the person who entered the draft. This records an internal review, not a regulated electronic signature.</Alert>
    {error && <Alert tone="error">{error}</Alert>}
    <FormFooter saving={saving} onClose={onClose} submitLabel="Verify result" disabled={!patientAndSpecimenChecked || !qualityControlChecked} />
  </form></ModalShell>;
}

function ResultView({ order, canAmend, onClose }: { order: LaboratoryOrder; canAmend: boolean; onClose: () => void }) {
  const released = order.status === 'completed';
  const [addenda, setAddenda] = useState<LaboratoryAddendum[]>([]);
  const [loadingAddenda, setLoadingAddenda] = useState(released);
  const [savingAddendum, setSavingAddendum] = useState(false);
  const [reason, setReason] = useState('');
  const [addendum, setAddendum] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!released) return;
    let active = true;
    laboratoryApi.listAddenda(order.id).then((rows) => { if (active) setAddenda(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load result addenda')); }).finally(() => { if (active) setLoadingAddenda(false); });
    return () => { active = false; };
  }, [order.id, released]);
  const saveAddendum = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingAddendum(true); setError('');
    try { const row = await laboratoryApi.addAddendum(order.id, { reason: reason.trim(), addendum: addendum.trim() }); setAddenda((current) => [...current, row]); setReason(''); setAddendum(''); }
    catch (err) { setError(getErrorMessage(err, 'Unable to save result addendum')); }
    finally { setSavingAddendum(false); }
  };
  return <ModalShell title={`${released ? 'Laboratory report' : 'Verified draft'} · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose} className={released ? 'laboratory-report' : ''}><div className="laboratory-form">
    <div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {released ? 'Released result' : 'Awaiting release'}</span></div>
    <dl className="laboratory-report__details"><div><dt>Investigation</dt><dd>{order.testName} {order.testCode && `(${order.testCode})`}</dd></div><div><dt>Priority</dt><dd>{order.priority || 'routine'}</dd></div><div><dt>Ordered</dt><dd>{dateLabel(order.orderedAt)}</dd></div><div><dt>Collected</dt><dd>{dateLabel(order.collectedAt)}</dd></div><div><dt>Specimen label</dt><dd>{order.specimenLabel || 'Not recorded'}</dd></div><div><dt>Referring doctor</dt><dd>{order.doctorName || 'Not assigned'}</dd></div><div><dt>Order number</dt><dd>{order.orderNumber}</dd></div></dl>
    <section className="laboratory-report__result"><h3>Result</h3><p>{order.result || 'No result recorded.'} {order.resultUnit || ''}</p>{order.referenceRange && <p>Reference range: {order.referenceRange}</p>}{order.remarks && <p>{order.remarks}</p>}</section>
    {order.verifiedAt && <p>Verified {dateLabel(order.verifiedAt)} · staff #{order.verifiedById || 'unknown'}</p>}
    {order.completedAt && <p>Released {dateLabel(order.completedAt)} · staff #{order.releasedById || 'unknown'}</p>}
    {released && !order.verifiedAt && <p>Historical result: verification details were not recorded in the earlier workflow.</p>}
    {released && <section className="laboratory-report__addenda"><h3>Addenda</h3>{loadingAddenda ? <p>Loading corrections…</p> : addenda.length ? addenda.map((row) => <article key={row.id}><strong>{dateLabel(row.createdAt)} · {row.authorName || 'Former user'}</strong><p>Reason: {row.reason}</p><p>{row.addendum}</p></article>) : <p>No corrections recorded.</p>}</section>}
    {error && <Alert tone="error">{error}</Alert>}
    <div className="laboratory-modal__footer laboratory-report__actions"><Button type="button" variant="secondary" onClick={onClose}>Close</Button>{released && <Button type="button" disabled={loadingAddenda || Boolean(error)} onClick={() => window.print()}>Print report</Button>}</div>
  </div>{released && canAmend && <form className="laboratory-form laboratory-report__correction" onSubmit={(event) => void saveAddendum(event)}><h3>Add a correction</h3><Input label="Reason" required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /><label className="laboratory-textarea"><span>Addendum</span><textarea required rows={4} maxLength={10000} value={addendum} onChange={(event) => setAddendum(event.target.value)} /></label><Button type="submit" loading={savingAddendum} disabled={savingAddendum || reason.trim().length < 5 || !addendum.trim()}>Save addendum</Button></form>}</ModalShell>;
}

function CommunicationView({ order, canRecord, onClose, onRecorded }: { order: LaboratoryOrder; canRecord: boolean; onClose: () => void; onRecorded: () => void }) {
  const [rows, setRows] = useState<LaboratoryCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ outcome: 'attempted' as LaboratoryCommunication['outcome'], method: 'phone' as LaboratoryCommunication['method'], recipientName: '', resultSummary: '', note: '', occurredAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) });
  useEffect(() => {
    let active = true;
    laboratoryApi.listCommunications(order.id).then((items) => { if (active) setRows(items); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load result communications')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [order.id]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const item = await laboratoryApi.recordCommunication(order.id, { outcome: form.outcome, method: form.method, recipientName: form.recipientName.trim(), resultSummary: form.resultSummary.trim(), note: form.note.trim() || null, occurredAt: new Date(form.occurredAt).toISOString() });
      setRows((current) => [...current, item]);
      onRecorded();
      setForm((current) => ({ ...current, resultSummary: '', note: '' }));
    } catch (err) { setError(getErrorMessage(err, 'Unable to record result communication')); }
    finally { setSaving(false); }
  };
  return <ModalShell title={`Result communications · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}>
    <div className="laboratory-form">
      {order.status === 'verified' ? <Alert tone="warning">This urgent result is verified but the report is awaiting release. Confirm the verified result and recipient before direct communication.</Alert> : null}
      <div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`}</span></div>
      <Alert tone="warning">Record actual contact attempts and confirmed delivery. An in-app notification does not confirm receipt.</Alert>
      {error && <Alert tone="error">{error}</Alert>}
      <section className="laboratory-report__communications"><h3>Contact history</h3>{loading ? <p>Loading…</p> : rows.length ? rows.map((row) => <article key={row.id}><strong>{row.outcome === 'delivered' ? 'Delivered' : 'Attempted'} · {dateLabel(row.occurredAt)}</strong><p>{row.method.replace('_', ' ')} · {row.recipientName}</p><p>{row.resultSummary ?? 'Result details are restricted until report release.'}</p>{row.note && <p>{row.note}</p>}<small>Recorded by {row.recorderName || 'Former user'} · {dateLabel(row.createdAt)}</small></article>) : <p>No communication recorded.</p>}</section>
    </div>
    {canRecord && <form className="laboratory-form laboratory-report__contact-form" onSubmit={(event) => void save(event)}>
      <h3>Record contact</h3>
      <div className="laboratory-form__grid">
        <Select label="Outcome" value={form.outcome} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value as LaboratoryCommunication['outcome'] }))} options={[{ value: 'attempted', label: 'Attempted contact' }, { value: 'delivered', label: 'Delivered to recipient' }]} />
        <Select label="Method" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as LaboratoryCommunication['method'] }))} options={[{ value: 'phone', label: 'Phone' }, { value: 'in_person', label: 'In person' }, { value: 'secure_message', label: 'Secure message with receipt' }, { value: 'other', label: 'Other' }]} />
        <Input label="Recipient name" required maxLength={160} value={form.recipientName} onChange={(event) => setForm((current) => ({ ...current, recipientName: event.target.value }))} />
        <Input label="Contact time" type="datetime-local" required value={form.occurredAt} onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} />
      </div>
      <label className="laboratory-textarea"><span>Result communicated</span><textarea required minLength={5} maxLength={1000} rows={3} value={form.resultSummary} onChange={(event) => setForm((current) => ({ ...current, resultSummary: event.target.value }))} /></label>
      <label className="laboratory-textarea"><span>Notes (optional)</span><textarea maxLength={1000} rows={2} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></label>
      <Button type="submit" loading={saving} disabled={saving || !form.occurredAt || form.recipientName.trim().length < 2 || form.resultSummary.trim().length < 5}>Record communication</Button>
    </form>}
  </ModalShell>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="laboratory-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default LaboratoryDiagnosticsPage;

function CollectForm({ order, saving, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; onClose: () => void; onSubmit: (label: string) => void }) {
  const [specimenLabel, setSpecimenLabel] = useState('');
  return <ModalShell title={`Collect sample · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit(specimenLabel.trim()); }}><div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`}</span></div><Input label="Specimen label / barcode" required minLength={2} maxLength={80} value={specimenLabel} onChange={(event) => setSpecimenLabel(event.target.value)} placeholder="Label on the collected specimen" /><FormFooter saving={saving} onClose={onClose} submitLabel="Confirm collection" /></form></ModalShell>;
}
