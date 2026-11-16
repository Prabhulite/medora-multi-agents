import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { radiologyApi, type CreateRadiologyOrderPayload, type RadiologyModality, type RadiologyOrder, type UpdateRadiologyReportPayload } from './radiology.api';
import './RadiologyDiagnosticsPage.css';

type Modal = 'order' | 'report' | null;
const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ordered: 'info', scheduled: 'warning', in_progress: 'warning', completed: 'success', cancelled: 'danger',
};

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function RadiologyDiagnosticsPage() {
  const [modalities, setModalities] = useState<RadiologyModality[]>([]);
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [modalityRows, orderRows] = await Promise.all([radiologyApi.listModalities(), radiologyApi.listOrders()]);
      setModalities(modalityRows); setOrders(orderRows);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load radiology worklist')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length,
    inProgress: orders.filter((order) => order.status === 'in_progress').length,
    reported: orders.filter((order) => order.status === 'completed').length,
  }), [orders]);

  const columns = useMemo<TableColumn<RadiologyOrder>[]>(() => [
    { key: 'order', header: 'Order', render: (row) => <div><div className="ui-table__cell-title">{row.orderNumber}</div><div className="ui-table__cell-sub">{dateLabel(row.orderedAt)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName || `Patient #${row.patientId}`}</div><div className="ui-table__cell-sub">{row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'study', header: 'Study', render: (row) => <div><div className="ui-table__cell-title">{row.studyName}</div><div className="ui-table__cell-sub">{row.modalityCode || row.modalityName} · {row.priority || 'routine'}</div></div> },
    { key: 'report', header: 'Report', render: (row) => row.report || row.impression ? <div><div className="ui-table__cell-title">Report available</div><div className="ui-table__cell-sub">{row.reportedAt ? dateLabel(row.reportedAt) : 'Draft report'}</div></div> : <span className="radiology-muted">Awaiting report</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status] || 'neutral'}>{row.status.replace('_', ' ')}</Badge> },
    { key: 'actions', header: 'Actions', render: (row) => <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('report'); }}>{row.report || row.impression ? 'Edit report' : 'Enter report'}</Button> },
  ], []);

  const saveOrder = async (payload: CreateRadiologyOrderPayload) => {
    setSaving(true); setError(''); setNotice('');
    try { const created = await radiologyApi.createOrder(payload); setOrders((current) => [created, ...current]); setModal(null); setNotice('Radiology order created successfully.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to create radiology order')); }
    finally { setSaving(false); }
  };

  const saveReport = async (payload: UpdateRadiologyReportPayload) => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try { const updated = await radiologyApi.updateReport(selectedOrder.id, payload); setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); setModal(null); setSelectedOrder(null); setNotice('Radiology report saved successfully.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to save radiology report')); }
    finally { setSaving(false); }
  };

  return <div className="radiology-page">
    <PageHeader title="Radiology diagnostics" subtitle="Coordinate imaging work, review the modality queue, and publish reports." actions={<Button size="sm" onClick={() => setModal('order')}>Order imaging</Button>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="radiology-kpis" aria-label="Radiology summary">
      <article><span>Total studies</span><strong>{summary.total}</strong><small>All imaging requests</small></article>
      <article className="radiology-kpi--amber"><span>Pending worklist</span><strong>{summary.pending}</strong><small>Awaiting completion</small></article>
      <article className="radiology-kpi--blue"><span>In progress</span><strong>{summary.inProgress}</strong><small>Being acquired or read</small></article>
      <article className="radiology-kpi--green"><span>Reported</span><strong>{summary.reported}</strong><small>Reports available to care teams</small></article>
    </div>
    <section className="radiology-section">
      <div className="radiology-section__heading"><div><span className="radiology-eyebrow">IMAGING WORKLIST</span><h2>Radiology orders</h2><p>Track studies from request through final report.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}>Refresh</Button></div>
      <Table columns={columns} rows={orders} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.orderNumber} ${row.patientName || ''} ${row.patientMrdNumber || ''} ${row.studyName} ${row.modalityName} ${row.status}`} searchPlaceholder="Search orders, patients, or studies" emptyMessage="No radiology orders found. Create an imaging order to start the worklist." />
    </section>
    {modal === 'order' ? <OrderForm modalities={modalities} saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveOrder(payload)} /> : null}
    {modal === 'report' && selectedOrder ? <ReportForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(payload) => void saveReport(payload)} /> : null}
  </div>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="radiology-modal-backdrop" role="presentation" onClick={onClose}><section className="radiology-modal" role="dialog" aria-modal="true" aria-labelledby="radiology-modal-title" onClick={(event) => event.stopPropagation()}><div className="radiology-modal__header"><div><span className="radiology-eyebrow">{eyebrow}</span><h2 id="radiology-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function OrderForm({ modalities, saving, onClose, onSubmit }: { modalities: RadiologyModality[]; saving: boolean; onClose: () => void; onSubmit: (payload: CreateRadiologyOrderPayload) => void }) {
  const [form, setForm] = useState({ patientId: '', modalityId: modalities[0]?.id ? String(modalities[0].id) : '', studyName: '', priority: 'routine' as CreateRadiologyOrderPayload['priority'], clinicalNotes: '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Order imaging" eyebrow="NEW RADIOLOGY ORDER" onClose={onClose}><form className="radiology-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ patientId: Number(form.patientId), modalityId: Number(form.modalityId), studyName: form.studyName, priority: form.priority, clinicalNotes: form.clinicalNotes || null }); }}><div className="radiology-form__grid"><Input label="Patient ID" type="number" min="1" required value={form.patientId} onChange={(event) => update('patientId', event.target.value)} placeholder="Registered patient ID" /><Select label="Modality" required value={form.modalityId} onChange={(event) => update('modalityId', event.target.value)} options={[{ value: '', label: modalities.length ? 'Select a modality' : 'No modalities available' }, ...modalities.map((modality) => ({ value: modality.id, label: `${modality.name}${modality.code ? ` · ${modality.code}` : ''}` }))]} /><Input label="Study name" required value={form.studyName} onChange={(event) => update('studyName', event.target.value)} placeholder="e.g. Chest X-ray AP view" /><Select label="Priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} /></div><label className="radiology-textarea"><span>Clinical notes</span><textarea rows={4} value={form.clinicalNotes} onChange={(event) => update('clinicalNotes', event.target.value)} placeholder="Symptoms, provisional diagnosis, or imaging instructions" /></label><FormFooter saving={saving} onClose={onClose} submitLabel="Create order" disabled={!modalities.length || !form.studyName.trim()} /></form></ModalShell>;
}

function ReportForm({ order, saving, onClose, onSubmit }: { order: RadiologyOrder; saving: boolean; onClose: () => void; onSubmit: (payload: UpdateRadiologyReportPayload) => void }) {
  const [form, setForm] = useState({ report: order.report || '', findings: order.findings || '', impression: order.impression || '', status: 'completed' as UpdateRadiologyReportPayload['status'] });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title={`Report · ${order.studyName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="radiology-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ report: form.report, findings: form.findings || null, impression: form.impression || null, status: form.status }); }}><div className="radiology-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.modalityName} · {order.priority || 'routine'} priority</span></div><label className="radiology-textarea"><span>Report</span><textarea rows={4} required value={form.report} onChange={(event) => update('report', event.target.value)} placeholder="Enter the radiologist's report" /></label><div className="radiology-form__grid"><label className="radiology-textarea"><span>Findings</span><textarea rows={3} value={form.findings} onChange={(event) => update('findings', event.target.value)} placeholder="Describe observations" /></label><label className="radiology-textarea"><span>Impression</span><textarea rows={3} value={form.impression} onChange={(event) => update('impression', event.target.value)} placeholder="Clinical impression" /></label></div><Select label="Workflow status" value={form.status} onChange={(event) => update('status', event.target.value)} options={[{ value: 'completed', label: 'Completed / verified' }, { value: 'in_progress', label: 'In progress / preliminary' }]} /><FormFooter saving={saving} onClose={onClose} submitLabel="Save report" /></form></ModalShell>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="radiology-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default RadiologyDiagnosticsPage;
