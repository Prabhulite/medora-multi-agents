import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Appointment, AppointmentStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments.api';
import './AppointmentsPage.css';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'booked', label: 'Booked' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked-In' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-Show' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

function statusTone(status: AppointmentStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'completed' || status === 'checked_in') return 'success';
  if (status === 'confirmed' || status === 'booked') return 'info';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  if (status === 'rescheduled') return 'warning';
  return 'neutral';
}

function statusLabel(status: AppointmentStatus) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function typeLabel(type: Appointment['appointmentType']) {
  if (type === 'new_consultation') return 'New Consultation';
  if (type === 'follow_up') return 'Follow-up';
  return 'Review';
}

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const queueRows = useMemo(
    () => rows.filter((row) => row.status === 'checked_in'),
    [rows],
  );

  const canCreate = hasPermission(user, 'appointments.create');
  const canUpdate = hasPermission(user, 'appointments.update');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(
        await appointmentsApi.list({
          date: date || undefined,
          status: status ? (status as AppointmentStatus) : undefined,
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load appointments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [date, status]);

  const updateStatus = async (row: Appointment, next: AppointmentStatus) => {
    const labels: Record<string, string> = {
      confirmed: 'Confirm',
      checked_in: 'Check in',
      completed: 'Complete',
      cancelled: 'Cancel',
      no_show: 'Mark no-show',
    };
    const action = labels[next] || 'Update';
    if (!window.confirm(`${action} appointment ${row.appointmentNumber}?`)) return;

    setBusyId(row.id);
    setError('');
    try {
      await appointmentsApi.updateStatus(row.id, { status: next });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update appointment'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Appointment',
        render: (row: Appointment) => (
          <div>
            <div className="ui-table__cell-title">{row.appointmentNumber}</div>
            <div className="ui-table__cell-sub">{typeLabel(row.appointmentType)}</div>
          </div>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (row: Appointment) => (
          <div>
            <div className="ui-table__cell-title">{row.patientName || '—'}</div>
            <div className="ui-table__cell-sub">
              {row.patientMrdNumber || '—'}
              {row.patientMobile ? ` · ${row.patientMobile}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'schedule',
        header: 'Date & Time',
        render: (row: Appointment) => (
          <div>
            <div className="ui-table__cell-title">{row.appointmentDate}</div>
            <div className="ui-table__cell-sub">{row.appointmentTime || '—'}</div>
          </div>
        ),
      },
      {
        key: 'doctor',
        header: 'Doctor',
        render: (row: Appointment) => (
          <div>
            <div className="ui-table__cell-title">{row.doctorName || '—'}</div>
            <div className="ui-table__cell-sub">{row.departmentName || '—'}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Appointment) => (
          <div>
            <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
            {row.opNumber ? <div className="appointment-op">OP {row.opNumber}</div> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: Appointment) => {
          if (!canUpdate || busyId === row.id) return null;
          const items: Array<{
            key: string;
            label: string;
            onClick: () => void;
            danger?: boolean;
          }> = [];

          if (row.status === 'booked' || row.status === 'rescheduled') {
            items.push({
              key: 'confirm',
              label: 'Confirm',
              onClick: () => void updateStatus(row, 'confirmed'),
            });
          }
          if (['booked', 'confirmed', 'rescheduled'].includes(row.status)) {
            items.push({
              key: 'checkin',
              label: 'Check-In',
              onClick: () => void updateStatus(row, 'checked_in'),
            });
            items.push({
              key: 'reschedule',
              label: 'Reschedule',
              onClick: () => navigate(`/appointments/${row.id}/reschedule`),
            });
            items.push({
              key: 'cancel',
              label: 'Cancel',
              onClick: () => void updateStatus(row, 'cancelled'),
              danger: true,
            });
            items.push({
              key: 'noshow',
              label: 'No-Show',
              onClick: () => void updateStatus(row, 'no_show'),
              danger: true,
            });
          }
          if (row.status === 'checked_in') {
            items.push({
              key: 'complete',
              label: 'Complete',
              onClick: () => void updateStatus(row, 'completed'),
            });
          }

          if (!items.length) return null;
          return <ActionMenu items={items} />;
        },
      },
    ],
    [busyId, canUpdate, navigate],
  );

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Book doctor slots, check in patients, and generate OP visits."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/appointments/new')}>
              Book Appointment
            </Button>
          ) : null
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="appointment-filters">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
        <Button
          variant={status === 'checked_in' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setStatus(status === 'checked_in' ? '' : 'checked_in')}
        >
          {status === 'checked_in' ? 'Show All' : 'OPD Queue'}
        </Button>
      </div>

      <div className="appointment-queue-summary" aria-label="OPD queue summary">
        <div className="appointment-queue-summary__card">
          <span>Waiting in OPD</span>
          <strong>{queueRows.length}</strong>
        </div>
        <div className="appointment-queue-summary__card appointment-queue-summary__card--info">
          <span>Appointments shown</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="appointment-queue-summary__card appointment-queue-summary__card--muted">
          <span>Queue date</span>
          <strong>{date || 'All dates'}</strong>
        </div>
      </div>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No appointments for the selected filters."
      />
    </div>
  );
}

export default AppointmentsPage;
