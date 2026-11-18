import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
} from '../../components/ui/statusIcons';
import { Table } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { ServiceMaster } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { servicesApi } from './services.api';

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function ServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ServiceMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission(user, 'services.create');
  const canUpdate = hasPermission(user, 'services.update');
  const canDelete = hasPermission(user, 'services.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setServices(await servicesApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load services'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await servicesApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete service'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'service',
        header: 'Service',
        render: (row: ServiceMaster) => (
          <div>
            <div className="ui-table__cell-title">{row.serviceName}</div>
            <div className="ui-table__cell-sub">{row.serviceCode}</div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (row: ServiceMaster) => (
          <span className="ui-table__cell-title">{row.categoryName || '—'}</span>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (row: ServiceMaster) => (
          <span className="ui-table__cell-title">{row.departmentName || '—'}</span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row: ServiceMaster) => (
          <span className="ui-table__cell-title">{row.serviceType}</span>
        ),
      },
      {
        key: 'price',
        header: 'Default Price',
        render: (row: ServiceMaster) => (
          <span className="ui-table__cell-title">{formatPrice(row.defaultPrice)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: ServiceMaster) => (
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
        render: (row: ServiceMaster) => {
          const items = [
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/services/${row.id}/edit`),
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
                    onClick: () => setDeleteTarget(row),
                  },
                ]
              : []),
          ];
          return items.length ? <ActionMenu items={items} /> : null;
        },
      },
    ],
    [canDelete, canUpdate, navigate],
  );

  return (
    <div>
      <PageHeader
        title="Service Master"
        subtitle="Maintain billable hospital services, categories, and pricing."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/services/new')}>
              Add Service
            </Button>
          ) : undefined
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Table
        columns={columns}
        rows={services}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search service name, code, category..."
        searchText={(row) =>
          `${row.serviceName} ${row.serviceCode} ${row.categoryName || ''} ${row.departmentName || ''}`
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete service"
        message={`Delete service "${deleteTarget?.serviceName}"? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        confirming={deleting}
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ServicesPage;
