import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { PatientAvatar } from '../../components/ui/PatientAvatar';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { OpCheckinVisit } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { billingApi, type BillingInvoice } from '../billing/billing.api';
import { PatientBillPanel } from '../billing/PatientBillPanel';
import '../billing/BillingDashboardPage.css';
import { doctorsApi, type ConsultantOption } from '../doctors/doctors.api';
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
  const location = useLocation();
  const { user } = useAuth();
  const [rows, setRows] = useState<OpCheckinVisit[]>([]);
  const [doctors, setDoctors] = useState<ConsultantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState<'all' | 'inside' | 'waiting' | 'consulting' | 'done'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<OpCheckinVisit | null>(null);
  const [notice, setNotice] = useState('');
  const [billPicker, setBillPicker] = useState<{ patientName: string; invoices: BillingInvoice[] } | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [billLoadingId, setBillLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const message = (location.state as { notice?: string } | null)?.notice;
    if (!message) return;
    setNotice(message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const canCheckin = hasPermission(user, 'visits.checkin');
  const canCheckout = hasPermission(user, 'visits.checkout');
  const canConsult = hasPermission(user, 'visits.consult');
  const canOpenChart = hasPermission(user, 'clinical.view') && hasPermission(user, 'patients.view');
  const canBill = hasPermission(user, 'billing.create');
  const canPrintBill = hasPermission(user, 'billing.view');

  const openBills = async (row: OpCheckinVisit) => {
    setBillLoadingId(row.id);
    setError('');
    try {
      const invoices = await billingApi.listInvoices(row.patientId);
      setBillPicker({ patientName: row.patientName || 'Patient', invoices });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load patient bills'));
    } finally {
      setBillLoadingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (fromDate && toDate && fromDate > toDate) {
        setError('From date cannot be after To date.');
        setRows([]);
        return;
      }
      setRows(
        await checkinApi.list({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          doctorId: doctorId ? Number(doctorId) : undefined,
          status: status === 'all' ? undefined : status,
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
      .consultants()
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    void load();
  }, [fromDate, toDate, doctorId, status]);

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

  const startConsultation = async (row: OpCheckinVisit) => {
    setBusyId(row.id); setError('');
    try { await checkinApi.startConsultation(row.id); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to start consultation')); }
    finally { setBusyId(null); }
  };

  const columns = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (row: OpCheckinVisit) => (
          <div className="checkin-patient-cell">
            <PatientAvatar
              photo={row.patientPhotoData}
              name={row.patientName || 'Patient'}
              size={40}
            />
            <div className="checkin-patient-cell__meta">
              <div className="ui-table__cell-title">{row.patientName || '—'}</div>
              <div className="checkin-patient-cell__mrd">{row.patientMrdNumber || '—'}</div>
              <div className="checkin-patient-cell__mobile">{row.patientMobile || '—'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'doctor',
        header: 'Doctor',
        render: (row: OpCheckinVisit) => (
          <div>
            <div className="ui-table__cell-title">{row.doctorName || '—'}</div>
            <div className="ui-table__cell-sub">
              {row.doctorQualification || row.departmentName || '—'}
            </div>
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
              {row.visitState === 'done' ? 'Done' : row.status === 'consulting' ? 'Consulting' : 'Waiting'}
            </span>
            {row.consultationStartedAt && <div className="ui-table__cell-sub">Called {formatDateTime(row.consultationStartedAt)}{row.consultationStartedByName ? ` by ${row.consultationStartedByName}` : ''}</div>}
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
              onClick={() => {
                if (canBill) {
                  navigate(`/checkin/${row.id}/bill`, { state: { visit: row } });
                }
              }}
            >
              {money(row.billAmount)}
            </button>
            {canBill ? (
              <button
                type="button"
                className="checkin-bill__quick"
                onClick={() =>
                  navigate(`/checkin/${row.id}/bill`, { state: { visit: row } })
                }
              >
                Quick Bill
              </button>
            ) : null}
            {canPrintBill ? (
              <button type="button" className="checkin-bill__quick" disabled={billLoadingId === row.id}
                onClick={() => void openBills(row)}>
                {billLoadingId === row.id ? 'Loading…' : 'Print bill'}
              </button>
            ) : null}
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
          const canStart = canConsult && row.status === 'in_progress' && row.visitState === 'inside' && busyId !== row.id;
          const canFinish = canCheckout && row.visitState === 'inside' && busyId !== row.id;
          const canChart = canOpenChart && row.status === 'consulting';
          if (!canStart && !canFinish && !canChart) return <span className="checkin-actions-empty">—</span>;
          return (
            <div className="checkin-actions-cell">
              {canChart && <button type="button" className="checkin-consult-btn" onClick={() => navigate(`/patients/${row.patientId}?visitId=${row.id}`)}>Open chart</button>}
              {canStart && <button type="button" className="checkin-consult-btn" onClick={() => void startConsultation(row)}>Start consultation</button>}
              {canFinish && <button
                type="button"
                className="checkin-checkout-btn"
                onClick={() => requestCheckout(row)}
              >
                Check Out
              </button>}
            </div>
          );
        },
      },
    ],
    [busyId, billLoadingId, canBill, canPrintBill, canCheckout, canConsult, canOpenChart, navigate],
  );

  return (
    <div className="checkin-page">
      <PageHeader
        title="Check-in"
        subtitle="Track today's OP check-ins, tokens, and check-outs."
        actions={
          canCheckin ? (
            <Button size="sm" onClick={() => navigate('/checkin/new')}>
              Create New
            </Button>
          ) : null
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="checkin-list-filters">
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
          onChange={(e) => setStatus(e.target.value as 'all' | 'inside' | 'waiting' | 'consulting' | 'done')}
          options={[
            { value: 'all', label: 'All' },
            { value: 'inside', label: 'Inside' },
            { value: 'waiting', label: 'Waiting by token' },
            { value: 'consulting', label: 'In consultation' },
            { value: 'done', label: 'Done' },
          ]}
        />
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

      {billPicker ? (
        <div className="billing-modal-backdrop" role="presentation" onClick={() => setBillPicker(null)}>
          <section className="billing-modal" role="dialog" aria-modal="true" aria-labelledby="checkin-bills-title"
            onClick={(event) => event.stopPropagation()}>
            <h2 id="checkin-bills-title">Bills for {billPicker.patientName}</h2>
            {billPicker.invoices.length ? (
              <div className="checkin-bill-picker__list">
                {billPicker.invoices.map((invoice) => (
                  <button key={invoice.id} type="button" className="checkin-bill-picker__item"
                    onClick={() => { setSelectedInvoice(invoice); setBillPicker(null); }}>
                    <span>{invoice.invoiceNumber} · {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 'Date unavailable'}</span>
                    <strong>{money(invoice.totalAmount)}</strong>
                  </button>
                ))}
              </div>
            ) : <p>No bills found for this patient.</p>}
            <div className="billing-modal__footer"><Button variant="secondary" onClick={() => setBillPicker(null)}>Close</Button></div>
          </section>
        </div>
      ) : null}
      {selectedInvoice ? <PatientBillPanel invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} /> : null}

    </div>
  );
}

export default CheckinListPage;
