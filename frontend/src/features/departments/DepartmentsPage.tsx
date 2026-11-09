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
import type { Department } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { departmentsApi } from './departments.api';

export function DepartmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(user, 'departments.create');
  const canUpdate = hasPermission(user, 'departments.update');
  const canDelete = hasPermission(user, 'departments.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setDepartments(await departmentsApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load departments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (department: Department) => {
    if (!window.confirm(`Delete department "${department.name}"?`)) return;
    try {
      await departmentsApi.remove(department.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete department'));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'department',
        header: 'Department',
        render: (row: Department) => (
          <div>
            <div className="ui-table__cell-title">{row.name}</div>
            <div className="ui-table__cell-sub">{row.code}</div>
          </div>
        ),
      },
      {
        key: 'users',
        header: 'Users',
        render: (row: Department) => (
          <span className="ui-table__cell-title">{row.userCount ?? 0}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Department) => (
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
        render: (row: Department) => {
          const items = [
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/departments/${row.id}/edit`),
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
        title="Department Master"
        subtitle="Maintain departments used when creating users."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/departments/new')}>
              Add Department
            </Button>
          ) : undefined
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Table
        columns={columns}
        rows={departments}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search department name or code..."
        searchText={(row) => `${row.name} ${row.code}`}
      />
    </div>
  );
}

export default DepartmentsPage;
