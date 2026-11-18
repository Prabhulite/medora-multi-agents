import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { openMasterDocument } from '../../components/ui/DocumentUploadField';
import { Loader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
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
import type { Doctor, MasterDocument } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { doctorsApi } from './doctors.api';
import './DoctorsPage.css';

export function DoctorsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [docsDoctor, setDocsDoctor] = useState<Doctor | null>(null);
  const [documents, setDocuments] = useState<MasterDocument[]>([]);

  const canCreate = hasPermission(user, 'doctors.create');
  const canView = hasPermission(user, 'doctors.view');
  const canUpdate = hasPermission(user, 'doctors.update');
  const canDelete = hasPermission(user, 'doctors.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await doctorsApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load doctors'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (row: Doctor) => {
    if (!window.confirm(`Delete doctor "${row.name}" (${row.doctorCode})?`)) return;
    try {
      await doctorsApi.remove(row.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete doctor'));
    }
  };

  const onViewDocuments = async (row: Doctor) => {
    setDocsDoctor(row);
    setDocsOpen(true);
    setDocsLoading(true);
    setDocsError('');
    setDocuments([]);
    try {
      const detail = await doctorsApi.getById(row.id);
      setDocuments(detail.documents || []);
    } catch (err) {
      setDocsError(getErrorMessage(err, 'Unable to load documents'));
    } finally {
      setDocsLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'doctor',
        header: 'Doctor',
        render: (row: Doctor) => (
          <div>
            <div className="ui-table__cell-title">{row.name}</div>
            <div className="ui-table__cell-sub">{row.doctorCode}</div>
          </div>
        ),
      },
      {
        key: 'specialization',
        header: 'Specialization',
        render: (row: Doctor) => (
          <span className="ui-table__cell-title">{row.specializationName || '—'}</span>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (row: Doctor) => (
          <span className="ui-table__cell-title">{row.departmentName || '—'}</span>
        ),
      },
      {
        key: 'mobile',
        header: 'Mobile',
        render: (row: Doctor) => <span className="ui-table__cell-title">{row.mobileNumber}</span>,
      },
      {
        key: 'documents',
        header: 'Documents',
        render: (row: Doctor) => (
          <span className="ui-table__cell-title">{row.documentCount ?? 0}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Doctor) => (
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
        render: (row: Doctor) => {
          const items = [
            ...(canView
              ? [
                  {
                    key: 'view-docs',
                    label: 'View Document',
                    icon: <ViewIcon />,
                    onClick: () => void onViewDocuments(row),
                  },
                ]
              : []),
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/doctors/${row.id}/edit`),
                  },
                ]
              : []),
            ...(canDelete
              ? [
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <DeleteIcon />,
                    danger: true,
                    onClick: () => void onDelete(row),
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
        title="Doctor Master"
        subtitle="Maintain doctor profiles, fees, schedule, and documents for the hospital."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/doctors/new')}>
              Add Doctor
            </Button>
          ) : undefined
        }
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search doctor name, code, mobile..."
        searchText={(row) =>
          `${row.name} ${row.doctorCode} ${row.mobileNumber} ${row.specializationName || ''} ${row.departmentName || ''}`
        }
      />

      <Modal
        open={docsOpen}
        title={docsDoctor ? `Documents · ${docsDoctor.name}` : 'Documents'}
        onClose={() => setDocsOpen(false)}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setDocsOpen(false)}>
            Close
          </Button>
        }
      >
        {docsLoading ? <Loader size="sm" variant="block" label="Loading documents…" /> : null}
        {docsError ? <Alert tone="error">{docsError}</Alert> : null}
        {!docsLoading && !docsError ? (
          documents.length ? (
            <div className="doc-docs-list">
              {documents.map((document) => (
                <div key={document.id || `${document.name}-${document.fileName}`} className="doc-docs-row">
                  <div>
                    <div className="ui-table__cell-title">{document.name}</div>
                    <div className="ui-table__cell-sub">{document.fileName}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openMasterDocument(document)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="doc-docs-empty">No documents uploaded for this doctor.</p>
          )
        ) : null}
      </Modal>
    </div>
  );
}

export default DoctorsPage;
