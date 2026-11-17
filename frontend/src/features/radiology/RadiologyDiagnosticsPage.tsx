import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { radiologyApi, type CreateRadiologyOrderPayload, type RadiologyAddendum, type RadiologyCommunication, type RadiologyModality, type RadiologyOrder, type RadiologyResource, type RadiologyScheduleEvent, type ReferringDoctor, type UpdateRadiologyReportPayload } from './radiology.api';
import './RadiologyDiagnosticsPage.css';

type Modal = 'order' | 'report' | 'communications' | 'schedule' | 'resources' | null;
const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ordered: 'info', scheduled: 'warning', performed: 'warning', reported: 'success', cancelled: 'danger',
};

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function RadiologyDiagnosticsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'radiology.create');
  const canUpdate = hasPermission(user, 'radiology.update');
  const canManageResources = hasPermission(user, 'radiology.resources.manage');
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
    pending: orders.filter((order) => !['reported', 'cancelled'].includes(order.status)).length,
    inProgress: orders.filter((order) => order.status === 'performed').length,
    reported: orders.filter((order) => order.status === 'reported').length,
  }), [orders]);

  const columns = useMemo<TableColumn<RadiologyOrder>[]>(() => [
    { key: 'order', header: 'Order', render: (row) => <div><div className="ui-table__cell-title">{row.orderNumber}</div><div className="ui-table__cell-sub">{dateLabel(row.orderedAt)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName || `Patient #${row.patientId}`}</div><div className="ui-table__cell-sub">{row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'study', header: 'Study', render: (row) => <div><div className="ui-table__cell-title">{row.studyName}</div><div className="ui-table__cell-sub">{row.modalityCode || row.modalityName} · {row.priority || 'routine'}</div></div> },
    { key: 'scheduled', header: 'Scheduled', render: (row) => row.scheduledAt ? <div><div>{dateLabel(row.scheduledAt)}</div><small>{row.resourceName || 'Unassigned resource'}</small></div> : 'Not scheduled' },
    { key: 'report', header: 'Report', render: (row) => row.report || row.impression ? <div><div className="ui-table__cell-title">Report available</div><div className="ui-table__cell-sub">{row.reportedAt ? dateLabel(row.reportedAt) : 'Draft report'}</div></div> : <span className="radiology-muted">Awaiting report</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status] || 'neutral'}>{row.status.replace('_', ' ')}</Badge> },
    { key: 'actions', header: 'Actions', render: (row) => <div className="radiology-actions">{canUpdate && ['ordered', 'scheduled'].includes(row.status) && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('schedule'); }}>{row.scheduledAt ? 'Reschedule' : 'Schedule'}</Button>}{canUpdate && ['ordered', 'scheduled'].includes(row.status) && <Button size="sm" variant="secondary" onClick={() => void markPerformed(row)}>Mark performed</Button>}{(row.status === 'performed' && canUpdate || row.status === 'reported') && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('report'); }}>{row.status === 'reported' ? 'View final report' : row.report ? 'Edit draft' : 'Enter report'}</Button>}{['performed', 'reported'].includes(row.status) && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('communications'); }}>Communications</Button>}</div> },
  ], [canUpdate]);

  const markPerformed = async (order: RadiologyOrder) => {
    setSaving(true); setError(''); setNotice('');
    try { const updated = await radiologyApi.updateReport(order.id, { status: 'performed' }); setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setNotice('Study marked performed.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to mark study performed')); }
    finally { setSaving(false); }
  };

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
    <PageHeader title="Radiology diagnostics" subtitle="Coordinate imaging work, review the modality queue, and publish reports." actions={<div className="radiology-actions">{canManageResources && <Button size="sm" variant="secondary" onClick={() => setModal('resources')}>Manage resources</Button>}{canCreate && <Button size="sm" onClick={() => setModal('order')}>Order imaging</Button>}</div>} />
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
    {modal === 'report' && selectedOrder ? selectedOrder.status === 'reported' ? <FinalReportView order={selectedOrder} canUpdate={canUpdate} onClose={() => { setModal(null); setSelectedOrder(null); }} /> : <ReportForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(payload) => void saveReport(payload)} /> : null}
    {modal === 'communications' && selectedOrder ? <CommunicationView order={selectedOrder} canUpdate={canUpdate} onClose={() => { setModal(null); setSelectedOrder(null); }} /> : null}
    {modal === 'schedule' && selectedOrder ? <ScheduleView order={selectedOrder} onSaved={(updated) => { setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setSelectedOrder(updated); setNotice('Study schedule saved.'); }} onClose={() => { setModal(null); setSelectedOrder(null); }} /> : null}
    {modal === 'resources' ? <ResourceManager modalities={modalities} onClose={() => setModal(null)} /> : null}
  </div>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="radiology-modal-backdrop" role="presentation" onClick={onClose}><section className="radiology-modal" role="dialog" aria-modal="true" aria-labelledby="radiology-modal-title" onClick={(event) => event.stopPropagation()}><div className="radiology-modal__header"><div><span className="radiology-eyebrow">{eyebrow}</span><h2 id="radiology-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function OrderForm({ modalities, saving, onClose, onSubmit }: { modalities: RadiologyModality[]; saving: boolean; onClose: () => void; onSubmit: (payload: CreateRadiologyOrderPayload) => void }) {
  const [form, setForm] = useState({ patientId: '', modalityId: modalities[0]?.id ? String(modalities[0].id) : '', studyName: '', priority: 'routine' as CreateRadiologyOrderPayload['priority'], clinicalNotes: '', doctorId: '' });
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctors, setDoctors] = useState<ReferringDoctor[]>([]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (doctorSearch.trim().length < 2) { setDoctors([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void radiologyApi.doctors(doctorSearch.trim()).then((rows) => { if (active) setDoctors(rows); }).catch(() => { if (active) setDoctors([]); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [doctorSearch]);
  return <ModalShell title="Order imaging" eyebrow="NEW RADIOLOGY ORDER" onClose={onClose}><form className="radiology-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ patientId: Number(form.patientId), modalityId: Number(form.modalityId), studyName: form.studyName, doctorId: form.doctorId ? Number(form.doctorId) : null, priority: form.priority, clinicalNotes: form.clinicalNotes || null }); }}><div className="radiology-form__grid"><Input label="Patient ID" type="number" min="1" required value={form.patientId} onChange={(event) => update('patientId', event.target.value)} placeholder="Registered patient ID" /><Select label="Modality" required value={form.modalityId} onChange={(event) => update('modalityId', event.target.value)} options={[{ value: '', label: modalities.length ? 'Select a modality' : 'No modalities available' }, ...modalities.map((modality) => ({ value: modality.id, label: `${modality.name}${modality.code ? ` · ${modality.code}` : ''}` }))]} /><Input label="Study name" required value={form.studyName} onChange={(event) => update('studyName', event.target.value)} placeholder="e.g. Chest X-ray AP view" /><Select label="Priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} /><Input label="Find referring doctor" value={doctorSearch} onChange={(event) => { setDoctorSearch(event.target.value); update('doctorId', ''); }} placeholder="Name, code, or registration" /><Select label="Referring doctor (optional)" value={form.doctorId} onChange={(event) => update('doctorId', event.target.value)} options={[{ value: '', label: 'No doctor selected' }, ...doctors.map((doctor) => ({ value: doctor.id, label: [doctor.name, doctor.doctorCode, doctor.medicalRegistrationNumber].join(' · ') }))]} /></div><label className="radiology-textarea"><span>Clinical notes</span><textarea rows={4} value={form.clinicalNotes} onChange={(event) => update('clinicalNotes', event.target.value)} placeholder="Symptoms, provisional diagnosis, or imaging instructions" /></label><FormFooter saving={saving} onClose={onClose} submitLabel="Create order" disabled={!modalities.length || !form.studyName.trim()} /></form></ModalShell>;
}

function ReportForm({ order, saving, onClose, onSubmit }: { order: RadiologyOrder; saving: boolean; onClose: () => void; onSubmit: (payload: UpdateRadiologyReportPayload) => void }) {
  const [form, setForm] = useState({ report: order.report || '', impression: order.impression || '', status: 'reported' as UpdateRadiologyReportPayload['status'] });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title={`Report · ${order.studyName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="radiology-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ report: form.report, impression: form.impression || null, status: form.status }); }}><div className="radiology-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.modalityName} · {order.priority || 'routine'} priority</span></div><label className="radiology-textarea"><span>Report</span><textarea rows={4} required value={form.report} onChange={(event) => update('report', event.target.value)} placeholder="Enter the radiologist's report" /></label><div className="radiology-form__grid"><label className="radiology-textarea"><span>Impression</span><textarea rows={3} value={form.impression} onChange={(event) => update('impression', event.target.value)} placeholder="Clinical impression" /></label></div><Alert tone="warning">Finalizing locks this report. Corrections are recorded as dated addenda.</Alert><Select label="Report action" value={form.status} onChange={(event) => update('status', event.target.value)} options={[{ value: 'reported', label: 'Finalize report' }, { value: 'performed', label: 'Save draft' }]} /><FormFooter saving={saving} onClose={onClose} submitLabel={form.status === 'reported' ? 'Finalize report' : 'Save draft'} /></form></ModalShell>;
}

function FinalReportView({ order, canUpdate, onClose }: { order: RadiologyOrder; canUpdate: boolean; onClose: () => void }) {
  const [addenda, setAddenda] = useState<RadiologyAddendum[]>([]);
  const [reason, setReason] = useState('');
  const [addendum, setAddendum] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    radiologyApi.listAddenda(order.id).then((rows) => { if (active) setAddenda(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load report addenda')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [order.id]);
  const saveAddendum = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const row = await radiologyApi.addAddendum(order.id, { reason: reason.trim(), addendum: addendum.trim() });
      setAddenda((current) => [...current, row]); setReason(''); setAddendum('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to save report addendum')); }
    finally { setSaving(false); }
  };
  return <ModalShell title={`Final report · ${order.studyName}`} eyebrow={order.orderNumber} onClose={onClose}>
    <div className="radiology-form">
      <div className="radiology-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.modalityName}</span></div>
      <Alert tone="info">The original final report is preserved. Corrections are dated addenda.</Alert>
      <section><h3>Report</h3><p>{order.report || 'No report text recorded.'}</p></section>
      {order.impression && <section><h3>Impression</h3><p>{order.impression}</p></section>}
      <section><h3>Addenda</h3>{loading ? <p>Loading addenda…</p> : addenda.length ? addenda.map((row) => <article key={row.id}><strong>{dateLabel(row.createdAt)} · {row.authorName || 'Former user'}</strong><p>Reason: {row.reason}</p><p>{row.addendum}</p></article>) : <p>No addenda recorded.</p>}</section>
      {error && <Alert tone="error">{error}</Alert>}
      {canUpdate && <form className="radiology-form" onSubmit={(event) => void saveAddendum(event)}><h3>Add a correction</h3><Input label="Reason" required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /><label className="radiology-textarea"><span>Addendum</span><textarea required rows={4} maxLength={10000} value={addendum} onChange={(event) => setAddendum(event.target.value)} /></label><Button type="submit" loading={saving} disabled={saving || reason.trim().length < 5 || !addendum.trim()}>Save addendum</Button></form>}
      <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
    </div>
  </ModalShell>;
}

function ResourceManager({ modalities, onClose }: { modalities: RadiologyModality[]; onClose: () => void }) {
  const [resources, setResources] = useState<RadiologyResource[]>([]);
  const [form, setForm] = useState({ modalityId: '', code: '', name: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    radiologyApi.listResources().then((rows) => { if (active) setResources(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load resources')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const row = await radiologyApi.createResource({ modalityId: Number(form.modalityId), code: form.code.trim().toUpperCase(), name: form.name.trim(), location: form.location.trim() || null });
      setResources((current) => [...current, row]); setForm({ modalityId: '', code: '', name: '', location: '' });
    } catch (err) { setError(getErrorMessage(err, 'Unable to create resource')); }
    finally { setBusy(false); }
  };
  const toggle = async (resource: RadiologyResource) => {
    setBusy(true); setError('');
    try { const updated = await radiologyApi.setResourceActive(resource.id, !resource.isActive); setResources((current) => current.map((row) => row.id === updated.id ? updated : row)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to update resource')); }
    finally { setBusy(false); }
  };
  return <ModalShell title="Radiology resources" eyebrow="SCANNERS AND ROOMS" onClose={onClose}><div className="radiology-form">
    {error && <Alert tone="error">{error}</Alert>}
    <section><h3>Configured resources</h3>{loading ? <p>Loading…</p> : resources.length ? resources.map((resource) => <article key={resource.id}><strong>{resource.name} · {resource.code}</strong><p>{modalities.find((modality) => modality.id === resource.modalityId)?.name || `Modality #${resource.modalityId}`}{resource.location ? ` · ${resource.location}` : ''} · {resource.isActive ? 'Active' : 'Inactive'}</p><Button size="sm" variant="secondary" disabled={busy} onClick={() => void toggle(resource)}>{resource.isActive ? 'Deactivate' : 'Activate'}</Button></article>) : <p>No resources configured.</p>}</section>
    <form className="radiology-form" onSubmit={(event) => void create(event)}><h3>Add scanner or room</h3><div className="radiology-form__grid"><Select label="Modality" required value={form.modalityId} onChange={(event) => setForm((current) => ({ ...current, modalityId: event.target.value }))} options={[{ value: '', label: 'Select modality' }, ...modalities.map((modality) => ({ value: modality.id, label: modality.name }))]} /><Input label="Resource code" required minLength={2} maxLength={40} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="e.g. CT-ROOM-1" /><Input label="Name" required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. CT Scanner 1" /><Input label="Location" maxLength={160} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Building and room" /></div><Button type="submit" loading={busy} disabled={busy || !form.modalityId || !form.code.trim() || !form.name.trim()}>Add resource</Button></form>
    <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
  </div></ModalShell>;
}

function ScheduleView({ order, onSaved, onClose }: { order: RadiologyOrder; onSaved: (order: RadiologyOrder) => void; onClose: () => void }) {
  const localTime = (value: string | Date) => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  };
  const [scheduledAt, setScheduledAt] = useState(localTime(order.scheduledAt || new Date(Date.now() + 24 * 60 * 60_000)));
  const [durationMinutes, setDurationMinutes] = useState(order.scheduledAt && order.scheduledEndAt ? String(Math.round((new Date(order.scheduledEndAt).getTime() - new Date(order.scheduledAt).getTime()) / 60_000)) : '30');
  const [resourceId, setResourceId] = useState(order.resourceId ? String(order.resourceId) : '');
  const [resources, setResources] = useState<RadiologyResource[]>([]);
  const [reason, setReason] = useState('');
  const [events, setEvents] = useState<RadiologyScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([radiologyApi.listScheduleEvents(order.id), radiologyApi.listResources()]).then(([rows, available]) => { if (active) { setEvents(rows); setResources(available); } }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load schedule details')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [order.id]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const updated = await radiologyApi.scheduleOrder(order.id, { scheduledAt: new Date(scheduledAt).toISOString(), durationMinutes: Number(durationMinutes), resourceId: resourceId ? Number(resourceId) : null, reason: reason.trim() || null });
      onSaved(updated);
      setEvents(await radiologyApi.listScheduleEvents(order.id));
      setReason('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to save study schedule')); }
    finally { setSaving(false); }
  };
  return <ModalShell title={`Schedule · ${order.studyName}`} eyebrow={order.orderNumber} onClose={onClose}><div className="radiology-form">
    <div className="radiology-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.modalityName}</span></div>
    <Alert tone="info">Selecting a resource checks for overlapping booked studies. Unassigned bookings do not reserve equipment.</Alert>
    {error && <Alert tone="error">{error}</Alert>}
    <form className="radiology-form" onSubmit={(event) => void save(event)}><div className="radiology-form__grid"><Input label="Study date and time" type="datetime-local" required value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /><Select label="Duration" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} options={[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => ({ value: minutes, label: `${minutes} minutes` }))} /><Select label="Scanner or room" value={resourceId} onChange={(event) => setResourceId(event.target.value)} options={[{ value: '', label: 'Unassigned (no collision check)' }, ...resources.filter((resource) => resource.modalityId === order.modalityId && (resource.isActive || resource.id === order.resourceId)).map((resource) => ({ value: resource.id, label: `${resource.name}${resource.location ? ` · ${resource.location}` : ''}${resource.isActive ? '' : ' (inactive)'}` }))]} /></div>{order.scheduledAt && <Input label="Reason for rescheduling" required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />}<Button type="submit" loading={saving} disabled={loading || saving || !scheduledAt || Boolean(order.scheduledAt && reason.trim().length < 5)}>Save schedule</Button></form>
    <section><h3>Schedule history</h3>{loading ? <p>Loading…</p> : events.length ? events.map((row) => <article key={row.id}><strong>{dateLabel(row.scheduledAt)} to {dateLabel(row.scheduledEndAt)}</strong><p>{row.resourceId ? resources.find((resource) => resource.id === row.resourceId)?.name || `Resource #${row.resourceId}` : 'Unassigned resource'} · {row.previousAt ? `Changed from ${dateLabel(row.previousAt)}` : 'Initial booking'}{row.reason ? ` · ${row.reason}` : ''}</p><small>{row.actorName || 'Former user'} · {dateLabel(row.createdAt)}</small></article>) : <p>No schedule recorded.</p>}</section>
    <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
  </div></ModalShell>;
}

function CommunicationView({ order, canUpdate, onClose }: { order: RadiologyOrder; canUpdate: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<RadiologyCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ outcome: 'attempted' as RadiologyCommunication['outcome'], method: 'phone' as RadiologyCommunication['method'], recipientName: '', findingSummary: '', note: '', occurredAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) });
  useEffect(() => {
    let active = true;
    radiologyApi.listCommunications(order.id).then((items) => { if (active) setRows(items); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load communications')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [order.id]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const row = await radiologyApi.recordCommunication(order.id, { outcome: form.outcome, method: form.method, recipientName: form.recipientName.trim(), findingSummary: form.findingSummary.trim(), note: form.note.trim() || null, occurredAt: new Date(form.occurredAt).toISOString() });
      setRows((current) => [...current, row]);
      setForm((current) => ({ ...current, note: '' }));
    } catch (err) { setError(getErrorMessage(err, 'Unable to record communication')); }
    finally { setSaving(false); }
  };
  return <ModalShell title={`Finding communications · ${order.studyName}`} eyebrow={order.orderNumber} onClose={onClose}>
    <div className="radiology-form">
      <div className="radiology-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`}</span></div>
      <Alert tone="warning">Record actual contact attempts and confirmed delivery. An in-app report notification does not confirm that urgent findings were received.</Alert>
      <section><h3>Communication history</h3>{loading ? <p>Loading…</p> : rows.length ? rows.map((row) => <article key={row.id}><strong>{row.outcome === 'delivered' ? 'Delivered' : 'Attempted'} · {dateLabel(row.occurredAt)}</strong><p>{row.method.replace('_', ' ')} · {row.recipientName}</p><p>{row.findingSummary}</p>{row.note && <p>{row.note}</p>}<small>Recorded by {row.recorderName || 'Former user'} · {dateLabel(row.createdAt)}</small></article>) : <p>No communication recorded.</p>}</section>
      {error && <Alert tone="error">{error}</Alert>}
      {canUpdate && <form className="radiology-form" onSubmit={(event) => void save(event)}><h3>Record contact</h3><div className="radiology-form__grid"><Select label="Outcome" value={form.outcome} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value as RadiologyCommunication['outcome'] }))} options={[{ value: 'attempted', label: 'Attempted contact' }, { value: 'delivered', label: 'Delivered to recipient' }]} /><Select label="Method" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as RadiologyCommunication['method'] }))} options={[{ value: 'phone', label: 'Phone' }, { value: 'in_person', label: 'In person' }, { value: 'secure_message', label: 'Secure message with receipt' }, { value: 'other', label: 'Other' }]} /><Input label="Recipient name" required maxLength={160} value={form.recipientName} onChange={(event) => setForm((current) => ({ ...current, recipientName: event.target.value }))} /><Input label="Contact time" type="datetime-local" required value={form.occurredAt} onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} /></div><label className="radiology-textarea"><span>Finding communicated</span><textarea required minLength={5} maxLength={1000} rows={3} value={form.findingSummary} onChange={(event) => setForm((current) => ({ ...current, findingSummary: event.target.value }))} /></label><label className="radiology-textarea"><span>Notes (optional)</span><textarea maxLength={1000} rows={2} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></label><Button type="submit" loading={saving} disabled={saving || !form.occurredAt || form.recipientName.trim().length < 2 || form.findingSummary.trim().length < 5}>Record communication</Button></form>}
      <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
    </div>
  </ModalShell>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="radiology-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default RadiologyDiagnosticsPage;
