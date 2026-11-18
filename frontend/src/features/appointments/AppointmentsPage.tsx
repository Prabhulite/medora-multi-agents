import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionMenu, type ActionMenuItem } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
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

function statusLabel(status: AppointmentStatus) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function StatusIcon({ status }: { status: AppointmentStatus }) {
  if (status === 'booked') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
        />
      </svg>
    );
  }
  if (status === 'confirmed') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1.1 14.2-3.6-3.6 1.4-1.4 2.2 2.2 4.7-4.7 1.4 1.4z"
        />
      </svg>
    );
  }
  if (status === 'checked_in') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 5v4.59l2.7 2.7-1.4 1.42L11 12.41V7h2z"
        />
      </svg>
    );
  }
  if (status === 'completed') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
        />
      </svg>
    );
  }
  if (status === 'cancelled') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12z"
        />
      </svg>
    );
  }
  if (status === 'no_show') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 6v3l4-4-4-4v3a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6z"
      />
    </svg>
  );
}

function typeLabel(type: Appointment['appointmentType']) {
  if (type === 'new_consultation') return 'New Consultation';
  if (type === 'follow_up') return 'Follow-up';
  return 'Review';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const linkedPatientId = (() => { const value = searchParams.get('patientId'); return value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined; })();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'danger' | 'primary';
    run: () => Promise<void>;
  } | null>(null);

  const canCreate = hasPermission(user, 'appointments.create');
  const canUpdate = hasPermission(user, 'appointments.update');
  const canViewVisits = hasPermission(user, 'visits.view');

  const stats = useMemo(() => {
    const count = (value: AppointmentStatus | AppointmentStatus[]) => {
      const set = Array.isArray(value) ? value : [value];
      return rows.filter((row) => set.includes(row.status)).length;
    };
    const uniquePatients = new Set(
      rows.map((row) => row.patientId).filter((id): id is number => Number.isFinite(id)),
    ).size;

    return {
      total: rows.length,
      patients: uniquePatients,
      booked: count('booked'),
      confirmed: count('confirmed'),
      checkedIn: count('checked_in'),
      completed: count('completed'),
      cancelled: count(['cancelled', 'no_show']),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!status) return rows;
    return rows.filter((row) => row.status === status);
  }, [rows, status]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const from = fromDate || undefined;
      const to = toDate || undefined;
      if (from && to && from > to) {
        setError('From date cannot be after To date.');
        setRows([]);
        return;
      }
      setRows(
        await appointmentsApi.list({
          fromDate: from,
          toDate: to,
          patientId: linkedPatientId,
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
  }, [fromDate, toDate, linkedPatientId]);

  const updateStatus = (row: Appointment, next: AppointmentStatus) => {
    const labels: Record<string, string> = {
      confirmed: 'Confirm',
      checked_in: 'Check in',
      completed: 'Complete',
      cancelled: 'Cancel',
      no_show: 'Mark no-show',
    };
    const action = labels[next] || 'Update';
    const destructive = next === 'cancelled' || next === 'no_show';

    setConfirmAction({
      title: `${action} appointment`,
      message: `Are you sure you want to ${action.toLowerCase()} appointment ${row.appointmentNumber}?`,
      confirmLabel: action,
      tone: destructive ? 'danger' : 'primary',
      run: async () => {
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
      },
    });
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
        key: 'reason',
        header: 'Reason for Visit',
        render: (row: Appointment) => (
          <div className="appointment-reason-cell" title={row.reason || undefined}>
            {row.reason?.trim() || '—'}
          </div>
        ),
      },
      {
        key: 'bookedFor',
        header: 'Booked For',
        render: (row: Appointment) => (
          <div>
            <div className="ui-table__cell-title">{formatDate(row.appointmentDate)}</div>
            <div className="ui-table__cell-sub">{row.appointmentTime || '—'}</div>
          </div>
        ),
      },
      {
        key: 'bookedBy',
        header: 'Booked By',
        render: (row: Appointment) => (
          <div>
            <div className="ui-table__cell-title">{row.createdByName || '—'}</div>
            <div className="ui-table__cell-sub">{formatDateTime(row.createdAt)}</div>
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
          <div className="appointment-status-cell">
            <span className={`appointment-status-badge appointment-status-badge--${row.status}`}>
              <span className="appointment-status-badge__icon">
                <StatusIcon status={row.status} />
              </span>
              {statusLabel(row.status)}
            </span>
            {row.opNumber ? <div className="appointment-op">OP {row.opNumber}</div> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: Appointment) => {
          if (!canUpdate || busyId === row.id) return null;
          const items: ActionMenuItem[] = [];

          if (row.status === 'booked' || row.status === 'rescheduled') {
            items.push({
              key: 'confirm',
              label: 'Confirm',
              icon: <StatusIcon status="confirmed" />,
              onClick: () => updateStatus(row, 'confirmed'),
            });
          }
          if (['booked', 'confirmed', 'rescheduled'].includes(row.status)) {
            items.push({
              key: 'checkin',
              label: 'Check-In',
              icon: <StatusIcon status="checked_in" />,
              onClick: () => updateStatus(row, 'checked_in'),
            });
            items.push({
              key: 'reschedule',
              label: 'Reschedule',
              icon: <StatusIcon status="rescheduled" />,
              onClick: () => navigate(`/appointments/${row.id}/reschedule`),
            });
            items.push({
              key: 'cancel',
              label: 'Cancel',
              icon: <StatusIcon status="cancelled" />,
              onClick: () => updateStatus(row, 'cancelled'),
              danger: true,
            });
            items.push({
              key: 'noshow',
              label: 'No-Show',
              icon: <StatusIcon status="no_show" />,
              onClick: () => updateStatus(row, 'no_show'),
              danger: true,
            });
          }
          if (row.status === 'checked_in') {
            if (row.visitId && canViewVisits) {
              items.push({ key: 'queue', label: 'Open OP queue', icon: <StatusIcon status="checked_in" />, onClick: () => navigate('/checkin') });
            } else if (!row.visitId) {
              items.push({ key: 'complete', label: 'Complete', icon: <StatusIcon status="completed" />, onClick: () => updateStatus(row, 'completed') });
            }
          }

          if (!items.length) return null;
          return <ActionMenu items={items} />;
        },
      },
    ],
    [busyId, canUpdate, canViewVisits, navigate],
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
          label="From date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          label="To date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="appointment-stats" aria-label="Appointment stats for selected period">
        <button
          type="button"
          className={`appointment-stat-card${status === '' ? ' is-active' : ''}`}
          onClick={() => setStatus('')}
        >
          <span className="appointment-stat-card__icon appointment-stat-card__icon--total" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </span>
          <span className="appointment-stat-card__body">
            <span className="appointment-stat-card__label">Total booked</span>
            <strong className="appointment-stat-card__value">{stats.total}</strong>
            <span className="appointment-stat-card__meta">{stats.patients} patients</span>
          </span>
        </button>

        <button
          type="button"
          className={`appointment-stat-card${status === 'booked' ? ' is-active' : ''}`}
          onClick={() => setStatus(status === 'booked' ? '' : 'booked')}
        >
          <span className="appointment-stat-card__icon appointment-stat-card__icon--booked" aria-hidden="true">
            <StatusIcon status="booked" />
          </span>
          <span className="appointment-stat-card__body">
            <span className="appointment-stat-card__label">Booked</span>
            <strong className="appointment-stat-card__value">{stats.booked}</strong>
          </span>
        </button>

        <button
          type="button"
          className={`appointment-stat-card${status === 'confirmed' ? ' is-active' : ''}`}
          onClick={() => setStatus(status === 'confirmed' ? '' : 'confirmed')}
        >
          <span className="appointment-stat-card__icon appointment-stat-card__icon--confirmed" aria-hidden="true">
            <StatusIcon status="confirmed" />
          </span>
          <span className="appointment-stat-card__body">
            <span className="appointment-stat-card__label">Confirmed</span>
            <strong className="appointment-stat-card__value">{stats.confirmed}</strong>
          </span>
        </button>

        <button
          type="button"
          className={`appointment-stat-card${status === 'checked_in' ? ' is-active' : ''}`}
          onClick={() => setStatus(status === 'checked_in' ? '' : 'checked_in')}
        >
          <span className="appointment-stat-card__icon appointment-stat-card__icon--checked" aria-hidden="true">
            <StatusIcon status="checked_in" />
          </span>
          <span className="appointment-stat-card__body">
            <span className="appointment-stat-card__label">Checked-In</span>
            <strong className="appointment-stat-card__value">{stats.checkedIn}</strong>
          </span>
        </button>

        <button
          type="button"
          className={`appointment-stat-card${status === 'completed' ? ' is-active' : ''}`}
          onClick={() => setStatus(status === 'completed' ? '' : 'completed')}
        >
          <span className="appointment-stat-card__icon appointment-stat-card__icon--completed" aria-hidden="true">
            <StatusIcon status="completed" />
          </span>
          <span className="appointment-stat-card__body">
            <span className="appointment-stat-card__label">Completed</span>
            <strong className="appointment-stat-card__value">{stats.completed}</strong>
          </span>
        </button>

        <button
          type="button"
          className={`appointment-stat-card${status === 'cancelled' || status === 'no_show' ? ' is-active' : ''}`}
          onClick={() =>
            setStatus(status === 'cancelled' || status === 'no_show' ? '' : 'cancelled')
          }
        >
          <span className="appointment-stat-card__icon appointment-stat-card__icon--cancelled" aria-hidden="true">
            <StatusIcon status="cancelled" />
          </span>
          <span className="appointment-stat-card__body">
            <span className="appointment-stat-card__label">Cancelled / No-Show</span>
            <strong className="appointment-stat-card__value">{stats.cancelled}</strong>
            <span className="appointment-stat-card__meta">
              {rows.filter((row) => row.status === 'cancelled').length} cancelled
              {' · '}
              {rows.filter((row) => row.status === 'no_show').length} no-show
            </span>
          </span>
        </button>
      </div>

      <div className="appointments-table-panel">
        <Table
          columns={columns}
          rows={filteredRows}
          rowKey={(row) => row.id}
          loading={loading}
          onRefresh={() => void load()}
          searchPlaceholder="Search appointment, patient, doctor..."
          searchText={(row) =>
            [
              row.appointmentNumber,
              row.patientName,
              row.patientMrdNumber,
              row.patientMobile,
              row.reason,
              row.doctorName,
              row.departmentName,
              row.createdByName,
              row.status,
              row.opNumber,
              row.visitNumber,
              typeLabel(row.appointmentType),
            ]
              .filter(Boolean)
              .join(' ')
          }
          emptyMessage="No appointments for the selected filters."
        />
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title || 'Confirm'}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        tone={confirmAction?.tone || 'primary'}
        confirming={busyId != null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action) void action.run();
        }}
      />
    </div>
  );
}

export default AppointmentsPage;
