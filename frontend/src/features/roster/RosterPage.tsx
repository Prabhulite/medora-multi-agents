import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { rosterApi, type CreateDutyShift, type DutyShift, type RosterStaff } from './roster.api';
import './RosterPage.css';

const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const nextDay = (value: string) => new Date(new Date(`${value}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

export function RosterPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'roster.manage');
  const [staff, setStaff] = useState<RosterStaff[]>([]);
  const [shifts, setShifts] = useState<DutyShift[]>([]);
  const [from, setFrom] = useState(dateInput(new Date()));
  const [to, setTo] = useState(dateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [staffId, setStaffId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [closeTarget, setCloseTarget] = useState<{ shift: DutyShift; status: 'completed' | 'cancelled' } | null>(null);
  const load = async () => {
    if (new Date(to) < new Date(from) || (new Date(to).getTime() - new Date(from).getTime()) > 30 * 24 * 60 * 60 * 1000) { setError('Choose a range of up to 30 days'); return; }
    setLoading(true); setError('');
    try { const [staffRows, shiftRows] = await Promise.all([rosterApi.staff(), rosterApi.shifts(new Date(`${from}T00:00:00`).toISOString(), nextDay(to), staffId ? Number(staffId) : undefined)]); setStaff(staffRows); setShifts(shiftRows); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load duty roster')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const create = async (payload: CreateDutyShift) => { setSaving(true); setError(''); setNotice(''); try { await rosterApi.create(payload); setShowCreate(false); setNotice('Shift scheduled.'); await load(); } catch (err) { setError(getErrorMessage(err, 'Unable to schedule shift')); } finally { setSaving(false); } };
  const close = async (closureNote: string) => { if (!closeTarget) return; setSaving(true); setError(''); setNotice(''); try { await rosterApi.close(closeTarget.shift.id, closeTarget.status, closureNote); setCloseTarget(null); setNotice('Shift updated.'); await load(); } catch (err) { setError(getErrorMessage(err, 'Unable to update shift')); } finally { setSaving(false); } };
  const columns = useMemo<TableColumn<DutyShift>[]>(() => [
    { key: 'staff', header: 'Staff', render: (row) => <div><strong>{row.staff.fullName}</strong><small>{row.staff.employeeId || row.staff.designation || ''}</small></div> },
    { key: 'time', header: 'Duty time', render: (row) => <div><strong>{new Date(row.startsAt).toLocaleString()}</strong><small>to {new Date(row.endsAt).toLocaleString()}</small></div> },
    { key: 'assignment', header: 'Assignment', render: (row) => <div><strong>{row.dutyRole}</strong><small>{row.location}</small></div> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'scheduled' ? 'info' : row.status === 'completed' ? 'success' : 'neutral'}>{row.status}</Badge> },
    { key: 'action', header: 'Action', render: (row) => row.status === 'scheduled' && canManage ? <div className="roster-filters"><Button size="sm" variant="secondary" onClick={() => setCloseTarget({ shift: row, status: 'completed' })}>Complete</Button><Button size="sm" variant="ghost" onClick={() => setCloseTarget({ shift: row, status: 'cancelled' })}>Cancel</Button></div> : <span title={row.closureNote || ''}>—</span> },
  ], [canManage]);
  return <div className="roster-page"><PageHeader title="Duty Roster" subtitle="Schedule staff shifts and review duty coverage." actions={canManage ? <Button onClick={() => setShowCreate(true)}>Schedule shift</Button> : undefined} />{error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}<form className="roster-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}><Input label="From" type="date" required value={from} onChange={(event) => setFrom(event.target.value)} /><Input label="To" type="date" required value={to} onChange={(event) => setTo(event.target.value)} /><Select label="Staff" value={staffId} onChange={(event) => setStaffId(event.target.value)} options={[{ value: '', label: 'All staff' }, ...staff.map((row) => ({ value: row.id, label: row.fullName }))]} /><Button type="submit" variant="secondary">Apply</Button></form><Table columns={columns} rows={shifts} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.staff.fullName} ${row.dutyRole} ${row.location}`} searchPlaceholder="Search shifts" emptyMessage="No duty shifts in this range." />{showCreate && <CreateShiftForm staff={staff} saving={saving} error={error} onClose={() => setShowCreate(false)} onSave={(payload) => void create(payload)} />}{closeTarget && <CloseShiftForm target={closeTarget} saving={saving} error={error} onClose={() => setCloseTarget(null)} onSave={(note) => void close(note)} />}</div>;
}

function CreateShiftForm({ staff, saving, error, onClose, onSave }: { staff: RosterStaff[]; saving: boolean; error: string; onClose: () => void; onSave: (payload: CreateDutyShift) => void }) {
  const [form, setForm] = useState({ staffId: '', startsAt: '', endsAt: '', location: '', dutyRole: '', notes: '' });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.staffId || new Date(form.endsAt) <= new Date(form.startsAt)) return; onSave({ staffId: Number(form.staffId), startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), location: form.location, dutyRole: form.dutyRole, notes: form.notes || null }); };
  return <div className="roster-modal-backdrop" role="presentation" onClick={onClose}><section className="roster-modal" role="dialog" aria-modal="true" aria-labelledby="roster-create-title" onClick={(event) => event.stopPropagation()}><div className="roster-modal__header"><h2 id="roster-create-title">Schedule duty shift</h2><button type="button" onClick={onClose} aria-label="Close shift form">×</button></div>{error && <Alert tone="error">{error}</Alert>}<form className="roster-form" onSubmit={submit}><Select label="Staff member" required value={form.staffId} onChange={(event) => setForm({ ...form, staffId: event.target.value })} options={[{ value: '', label: 'Select staff' }, ...staff.map((row) => ({ value: row.id, label: `${row.fullName}${row.designation ? ` · ${row.designation}` : ''}` }))]} /><div className="roster-form-grid"><Input label="Start" type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /><Input label="End" type="datetime-local" required min={form.startsAt || undefined} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /><Input label="Duty role" required minLength={2} maxLength={120} value={form.dutyRole} onChange={(event) => setForm({ ...form, dutyRole: event.target.value })} /><Input label="Location / ward" required minLength={2} maxLength={120} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></div><label><span>Notes</span><textarea maxLength={2000} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="roster-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Schedule</Button></div></form></section></div>;
}

function CloseShiftForm({ target, saving, error, onClose, onSave }: { target: { shift: DutyShift; status: 'completed' | 'cancelled' }; saving: boolean; error: string; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState('');
  return <div className="roster-modal-backdrop" role="presentation" onClick={onClose}><section className="roster-modal" role="dialog" aria-modal="true" aria-labelledby="roster-close-title" onClick={(event) => event.stopPropagation()}><div className="roster-modal__header"><h2 id="roster-close-title">{target.status === 'completed' ? 'Complete' : 'Cancel'} shift</h2><button type="button" onClick={onClose} aria-label="Close shift action">×</button></div><p>{target.shift.staff.fullName} · {new Date(target.shift.startsAt).toLocaleString()}</p>{error && <Alert tone="error">{error}</Alert>}<form className="roster-form" onSubmit={(event) => { event.preventDefault(); onSave(note); }}><label><span>{target.status === 'completed' ? 'Completion note' : 'Cancellation reason'} *</span><textarea required minLength={2} maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="roster-form-actions"><Button type="button" variant="back" onClick={onClose}>Back</Button><Button type="submit" loading={saving}>Confirm</Button></div></form></section></div>;
}

export default RosterPage;
