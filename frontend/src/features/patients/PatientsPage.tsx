import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { PatientAvatar } from '../../components/ui/PatientAvatar';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
  ViewIcon,
} from '../../components/ui/statusIcons';
import { Table } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Patient, PatientAuditLog } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { patientsApi } from './patients.api';
import './PatientsPage.css';

function formatDob(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function genderLabel(gender: Patient['gender']) {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  if (gender === 'transgender') return 'Transgender';
  return 'Other';
}

export function PatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Patient | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditPatient, setAuditPatient] = useState<Patient | null>(null);
  const [auditLogs, setAuditLogs] = useState<PatientAuditLog[]>([]);
  const [mrdLookup, setMrdLookup] = useState('');
  const [mrdMatches, setMrdMatches] = useState<Patient[] | null>(null);
  const [mrdLookupLoading, setMrdLookupLoading] = useState(false);

  const canCreate = hasPermission(user, 'patients.create');
  const canView = hasPermission(user, 'patients.view');
  const canUpdate = hasPermission(user, 'patients.update');
  const canDelete = hasPermission(user, 'patients.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await patientsApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load patients'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const raw = sessionStorage.getItem('medora.patient.registration.receipt');
    if (raw) {
      try {
        setReceipt(JSON.parse(raw) as Patient);
      } catch {
        // ignore invalid receipt payload
      }
      sessionStorage.removeItem('medora.patient.registration.receipt');
    }
  }, []);

  const onDeactivate = async (row: Patient) => {
    if (!window.confirm(`Deactivate patient "${row.fullName}" (${row.mrdNumber})?`)) return;
    try {
      await patientsApi.remove(row.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to deactivate patient'));
    }
  };

  const onViewAudit = async (row: Patient) => {
    setAuditPatient(row);
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditError('');
    setAuditLogs([]);
    try {
      setAuditLogs(await patientsApi.auditLogs(row.id));
    } catch (err) {
      setAuditError(getErrorMessage(err, 'Unable to load audit history'));
    } finally {
      setAuditLoading(false);
    }
  };

  const onMrdLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = mrdLookup.trim();
    if (!value) return;
    setMrdLookupLoading(true);
    setError('');
    try {
      setMrdMatches(await patientsApi.search({ mrdNumber: value }));
    } catch (err) {
      setMrdMatches(null);
      setError(getErrorMessage(err, 'Unable to search MRD numbers'));
    } finally {
      setMrdLookupLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (row: Patient) => (
          <div className="patient-cell">
            <PatientAvatar photo={row.photoData} name={row.fullName || 'Patient'} size={40} />
            <div>
              <div className="ui-table__cell-title">{row.fullName}</div>
              <button
                type="button"
                className="patient-mrd-link"
                onClick={() => navigate(`/patients/${row.id}`)}
                title="Open patient dashboard"
              >
                {row.mrdNumber}
              </button>
            </div>
          </div>
        ),
      },
      {
        key: 'mobile',
        header: 'Mobile',
        render: (row: Patient) => (
          <span className="ui-table__cell-title">{row.mobileNumber || '—'}</span>
        ),
      },
      {
        key: 'dobAge',
        header: 'DOB / Age',
        render: (row: Patient) => (
          <div>
            <div className="ui-table__cell-title">{formatDob(row.dateOfBirth)}</div>
            <div className="ui-table__cell-sub">
              {row.ageYears != null
                ? `${row.ageYears}${row.ageIsApproximate ? '~' : ''} yrs`
                : '—'}
            </div>
          </div>
        ),
      },
      {
        key: 'genderBlood',
        header: 'Gender / Blood Group',
        render: (row: Patient) => (
          <span className="ui-table__cell-title">
            {genderLabel(row.gender)} · {row.bloodGroup || '—'}
          </span>
        ),
      },
      {
        key: 'address',
        header: 'Address',
        render: (row: Patient) => {
          const locality = [row.city, row.district, row.state].filter(Boolean).join(', ');
          return (
            <div className="patient-address-cell">
              <div className="ui-table__cell-title">{row.addressLine || '—'}</div>
              {locality ? <div className="ui-table__cell-sub">{locality}</div> : null}
            </div>
          );
        },
      },
      {
        key: 'registeredBy',
        header: 'Registered By',
        render: (row: Patient) => (
          <div>
            <div className="ui-table__cell-title">{row.createdByName || '—'}</div>
            <div className="ui-table__cell-sub">
              {row.registrationAt
                ? new Date(row.registrationAt).toLocaleString()
                : row.createdAt
                  ? new Date(row.createdAt).toLocaleString()
                  : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'visit',
        header: 'Latest Visit',
        render: (row: Patient) => (
          <span className="ui-table__cell-title">
            {row.latestVisitAt ? new Date(row.latestVisitAt).toLocaleString() : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Patient) => (
          <Badge
            tone={row.isActive ? 'success' : 'danger'}
            icon={row.isActive ? <CheckCircleIcon /> : <AlertCircleIcon />}
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '88px',
        render: (row: Patient) => {
          const items = [
            ...(canView
              ? [
                  {
                    key: 'audit',
                    label: 'Edit History',
                    icon: <ViewIcon />,
                    onClick: () => void onViewAudit(row),
                  },
                ]
              : []),
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/patients/${row.id}/edit`),
                  },
                ]
              : []),
            ...(canDelete && row.isActive
              ? [
                  {
                    key: 'deactivate',
                    label: 'Deactivate',
                    icon: <DeleteIcon />,
                    danger: true,
                    onClick: () => void onDeactivate(row),
                  },
                ]
              : []),
          ];
          return items.length ? <ActionMenu items={items} /> : null;
        },
      },
    ],
    [canDelete, canUpdate, canView, navigate],
  );

  return (
    <div>
      <PageHeader
        title="Patient Registration"
        subtitle="Register patients, generate lifetime MRD numbers, and maintain visit identity."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/patients/new')}>
              Register Patient
            </Button>
          ) : undefined
        }
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="patient-mrd-lookup" onSubmit={(event) => void onMrdLookup(event)}>
        <label htmlFor="patient-mrd-lookup">Find current chart by MRD, including merged numbers</label>
        <div className="patient-mrd-lookup__controls">
          <input id="patient-mrd-lookup" value={mrdLookup} onChange={(event) => { setMrdLookup(event.target.value); setMrdMatches(null); }} placeholder="Enter an MRD number" />
          <Button type="submit" size="sm" disabled={mrdLookupLoading || !mrdLookup.trim()}>{mrdLookupLoading ? 'Searching...' : 'Find chart'}</Button>
        </div>
        {mrdMatches ? <div className="patient-mrd-lookup__results" aria-live="polite">
          {mrdMatches.length === 0 ? 'No matching chart found.' : mrdMatches.map((match) => (
            <button key={match.id} type="button" onClick={() => navigate(`/patients/${match.id}`)}>{match.fullName} · {match.mrdNumber}</button>
          ))}
        </div> : null}
      </form>
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search MRD, name, mobile, visit..."
        searchText={(row) =>
          `${row.fullName} ${row.mrdNumber} ${row.mobileNumber || ''} ${row.latestVisitNumber || ''} ${row.latestOpNumber || ''} ${row.bloodGroup || ''} ${row.createdByName || ''} ${row.gender} ${row.dateOfBirth || ''} ${row.addressLine || ''} ${row.city || ''} ${row.district || ''} ${row.state || ''}`
        }
      />

      <Modal
        open={Boolean(receipt)}
        title="Registration Successful"
        onClose={() => setReceipt(null)}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setReceipt(null)}>
            Close
          </Button>
        }
      >
        {receipt ? (
          <div className="patient-receipt">
            <div className="patient-receipt__mrd">{receipt.mrdNumber}</div>
            <p className="patient-receipt__name">{receipt.fullName}</p>
            <div className="patient-receipt__grid">
              <div>
                <span>Visit</span>
                <strong>{receipt.latestVisitNumber || '—'}</strong>
              </div>
              <div>
                <span>OP</span>
                <strong>{receipt.latestOpNumber || '—'}</strong>
              </div>
              <div>
                <span>Mobile</span>
                <strong>{receipt.mobileNumber || '—'}</strong>
              </div>
              <div>
                <span>Gender / Age</span>
                <strong>
                  {receipt.gender}
                  {receipt.ageYears != null ? ` · ${receipt.ageYears} yrs` : ''}
                </strong>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={auditOpen}
        title={auditPatient ? `Edit History · ${auditPatient.fullName}` : 'Edit History'}
        onClose={() => setAuditOpen(false)}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setAuditOpen(false)}>
            Close
          </Button>
        }
      >
        {auditLoading ? <p className="patient-empty">Loading history…</p> : null}
        {auditError ? <Alert tone="error">{auditError}</Alert> : null}
        {!auditLoading && !auditError ? (
          auditLogs.length ? (
            <div className="patient-audit-list">
              {auditLogs.map((log) => (
                <div key={log.id} className="patient-audit-row">
                  <div>
                    <div className="ui-table__cell-title">{log.changeSummary || log.action}</div>
                    <div className="ui-table__cell-sub">
                      {log.changedByName || 'System'} · {new Date(log.createdAt).toLocaleString()}{log.sourceMrdNumber ? ` · From ${log.sourceMrdNumber}` : ''}
                    </div>
                  </div>
                  <Badge tone="neutral">{log.action}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="patient-empty">No edit history yet.</p>
          )
        ) : null}
      </Modal>
    </div>
  );
}

export default PatientsPage;
