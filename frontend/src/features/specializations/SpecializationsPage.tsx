import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
import type { Specialization } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { specializationsApi } from './specializations.api';

export function SpecializationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(user, 'specializations.create');
  const canUpdate = hasPermission(user, 'specializations.update');
  const canDelete = hasPermission(user, 'specializations.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await specializationsApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load specializations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (row: Specialization) => {
    if (!window.confirm(`Delete specialization "${row.name}"?`)) return;
    try {
      await specializationsApi.remove(row.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete specialization'));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'specialization',
        header: 'Specialization',
        render: (row: Specialization) => (
          <div>
            <div className="ui-table__cell-title">{row.name}</div>
            <div className="ui-table__cell-sub">{row.code}</div>
          </div>
        ),
      },
      {
        key: 'doctors',
        header: 'Doctors',
        render: (row: Specialization) => (
          <span className="ui-table__cell-title">{row.doctorCount ?? 0}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Specialization) => (
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
        render: (row: Specialization) => {
          const items = [
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/specializations/${row.id}/edit`),
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
    [canDelete, canUpdate, navigate],
  );

  return (
    <div>
      <PageHeader
        title="Specialization Master"
        subtitle="Maintain specializations used in Doctor Master."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/specializations/new')}>
              Add Specialization
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
        searchPlaceholder="Search specialization name or code..."
        searchText={(row) => `${row.name} ${row.code}`}
      />
    </div>
  );
}

export default SpecializationsPage;
