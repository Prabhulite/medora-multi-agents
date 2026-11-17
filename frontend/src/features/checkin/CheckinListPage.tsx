import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Doctor, OpCheckinVisit } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { doctorsApi } from '../doctors/doctors.api';
import { checkinApi } from './checkin.api';
import './CheckinPage.css';

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '₹ 0.00';
  return `₹ ${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CheckinListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<OpCheckinVisit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(todayIso());
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState<'all' | 'inside' | 'done'>('all');
  const [showCheckoutOnly, setShowCheckoutOnly] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<OpCheckinVisit | null>(null);

  const canCheckin = hasPermission(user, 'visits.checkin');
  const canCheckout = hasPermission(user, 'visits.checkout');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(
        await checkinApi.list({
          date: date || undefined,
          doctorId: doctorId ? Number(doctorId) : undefined,
          status: showCheckoutOnly ? 'inside' : status === 'all' ? undefined : status,
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check-in list'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doctorsApi
      .list()
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    void load();
  }, [date, doctorId, status, showCheckoutOnly]);

  const requestCheckout = (row: OpCheckinVisit) => {
    setCheckoutTarget(row);
  };

  const checkout = async (row: OpCheckinVisit) => {
    setBusyId(row.id);
    setError('');
    try {
      await checkinApi.checkout(row.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to check out'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (row: OpCheckinVisit) => (
          <div className="checkin-patient-cell">
            <div className="ui-table__cell-title">{row.patientName || '—'}</div>
            <div className="checkin-patient-cell__mrd">{row.patientMrdNumber || '—'}</div>
            <div className="checkin-patient-cell__mobile">{row.patientMobile || '—'}</div>
          </div>
        ),
      },
      {
        key: 'doctor',
        header: 'Doctor',
        render: (row: OpCheckinVisit) => (
          <div>
            <div className="ui-table__cell-title">{row.doctorName || '—'}</div>
            <div className="ui-table__cell-sub">{row.departmentName || '—'}</div>
          </div>
        ),
      },
      {
        key: 'checkin',
        header: 'Check In',
        render: (row: OpCheckinVisit) => (
          <div>
            <div className="ui-table__cell-title">{formatDateTime(row.checkedInAt)}</div>
            <div className="ui-table__cell-sub">{row.checkedInByName || '—'}</div>
          </div>
        ),
      },
      {
        key: 'checkout',
        header: 'Check Out',
        render: (row: OpCheckinVisit) => (
          <div>
            <div className="ui-table__cell-title">{formatDateTime(row.checkedOutAt)}</div>
            <div className="ui-table__cell-sub">{row.checkedOutByName || '—'}</div>
          </div>
        ),
      },
      {
        key: 'duration',
        header: 'Visit Duration',
        render: (row: OpCheckinVisit) => (
          <div>
            <div className="ui-table__cell-title">{row.visitDuration}</div>
            <span className={`checkin-state checkin-state--${row.visitState}`}>
              {row.visitState === 'inside' ? 'Inside' : 'Done'}
            </span>
          </div>
        ),
      },
      {
        key: 'token',
        header: 'Token',
        render: (row: OpCheckinVisit) => (
          <span className="checkin-token">{row.tokenNumber ?? '—'}</span>
        ),
      },
      {
        key: 'bill',
        header: 'Bill',
        render: (row: OpCheckinVisit) => (
          <div className="checkin-bill">
            <button
              type="button"
              className="checkin-bill__amount"
              onClick={() => navigate(`/billing?patientId=${row.patientId}`)}
            >
              {money(row.billAmount)}
            </button>
            <button
              type="button"
              className="checkin-bill__quick"
              onClick={() => navigate(`/billing?patientId=${row.patientId}`)}
            >
              Quick Bill
            </button>
          </div>
        ),
      },
      {
        key: 'next',
        header: 'Next Appointment',
        render: (row: OpCheckinVisit) => (
          <div className="checkin-followup">
            <button
              type="button"
              className="checkin-followup__btn"
              onClick={() => navigate('/appointments/new')}
            >
              Follow-up
            </button>
            {row.nextAppointmentAt ? (
              <span className="checkin-followup__date">{row.nextAppointmentAt}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row: OpCheckinVisit) => {
          const items: ActionMenuItem[] = [
            {
              key: 'patient',
              label: 'Open patient',
              onClick: () => navigate(`/patients/${row.patientId}`),
            },
          ];
          if (canCheckout && row.visitState === 'inside' && busyId !== row.id) {
            items.unshift({
              key: 'checkout',
              label: 'Check Out',
              onClick: () => requestCheckout(row),
            });
          }
          return (
            <div className="checkin-actions-cell">
              {canCheckout && row.visitState === 'inside' && busyId !== row.id ? (
                <button
                  type="button"
                  className="checkin-checkout-btn"
                  onClick={() => requestCheckout(row)}
                >
                  Check Out
                </button>
              ) : null}
              <ActionMenu items={items} />
            </div>
          );
        },
      },
    ],
    [busyId, canCheckout, navigate],
  );

  return (
    <div className="checkin-page">
      <PageHeader
        title="Check-in List"
        subtitle="Track today's OP check-ins, tokens, and check-outs."
        actions={
          canCheckin ? (
            <Button size="sm" onClick={() => navigate('/checkin')}>
              New Checkin
            </Button>
          ) : null
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="checkin-list-filters">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select
          label="Doctor"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          options={[
            { value: '', label: 'All doctors' },
            ...doctors.map((row) => ({ value: String(row.id), label: row.name })),
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | 'inside' | 'done')}
          options={[
            { value: 'all', label: 'All' },
            { value: 'inside', label: 'Inside' },
            { value: 'done', label: 'Done' },
          ]}
        />
        <Button
          variant={showCheckoutOnly ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowCheckoutOnly((value) => !value)}
        >
          {showCheckoutOnly ? 'Show All' : 'Show Checkout'}
        </Button>
      </div>

      <div className="checkin-list-table appointments-table-panel">
        <Table
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          onRefresh={() => void load()}
          searchPlaceholder="Search name, MRD, OP no, mobile..."
          searchText={(row) =>
            [
              row.patientName,
              row.patientMrdNumber,
              row.patientMobile,
              row.opNumber,
              row.visitNumber,
              row.doctorName,
              row.tokenNumber,
              row.visitState,
            ]
              .filter(Boolean)
              .join(' ')
          }
          emptyMessage="No check-ins for the selected filters."
        />
      </div>

      <ConfirmDialog
        open={Boolean(checkoutTarget)}
        title="Confirm check out"
        message={
          checkoutTarget
            ? `Are you sure you want to check out ${checkoutTarget.patientName}?`
            : ''
        }
        confirmLabel="Check Out"
        tone="primary"
        confirming={busyId != null}
        onCancel={() => setCheckoutTarget(null)}
        onConfirm={() => {
          const target = checkoutTarget;
          setCheckoutTarget(null);
          if (target) void checkout(target);
        }}
      />
    </div>
  );
}

export default CheckinListPage;
