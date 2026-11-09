import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  AlertCircleIcon,
  BanIcon,
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
} from '../../components/ui/statusIcons';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { User } from '../../types';
import { usersApi } from './users.api';
import './UsersPage.css';

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(currentUser, 'users.create');
  const canUpdate = hasPermission(currentUser, 'users.update');
  const canDelete = hasPermission(currentUser, 'users.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (user: User) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await usersApi.remove(user.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete user'));
    }
  };

  const onToggleActive = async (user: User) => {
    const nextActive = !user.isActive;
    const actionLabel = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm(`${nextActive ? 'Activate' : 'Deactivate'} user "${user.fullName}"?`)) {
      return;
    }
    try {
      await usersApi.update(user.id, { isActive: nextActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, `Unable to ${actionLabel} user`));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        render: (row: User) => (
          <div>
            <div className="ui-table__cell-title">{row.fullName}</div>
            <div className="ui-table__cell-sub">
              {row.employeeId || '—'} · @{row.username}
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact',
        render: (row: User) => (
          <div>
            <div className="ui-table__cell-title">{row.mobileNumber || '—'}</div>
            <div className="ui-table__cell-sub">{row.email || '—'}</div>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (row: User) => (
          <span className="ui-table__cell-title">{row.departmentName || '—'}</span>
        ),
      },
      {
        key: 'roles',
        header: 'Roles',
        render: (row: User) => (
          <div className="chip-row">
            {row.roleNames.length
              ? row.roleNames.map((name) => (
                  <Badge key={name} tone="info" icon={<CheckCircleIcon />}>
                    {name}
                  </Badge>
                ))
              : (
                  <Badge tone="warning" icon={<AlertCircleIcon />}>
                    No roles
                  </Badge>
                )}
          </div>
        ),
      },
      {
        key: 'createdBy',
        header: 'Created By',
        render: (row: User) => (
          <span className="ui-table__cell-title">{row.createdByName || '—'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Login Status',
        render: (row: User) => (
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
        render: (row: User) => {
          const items = [
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/users/${row.id}/edit`),
                  },
                  ...(!row.isSuperAdmin
                    ? [
                        {
                          key: 'quick-status',
                          label: row.isActive ? 'Quick Inactive' : 'Quick Active',
                          icon: row.isActive ? <BanIcon /> : <CheckCircleIcon />,
                          danger: row.isActive,
                          onClick: () => void onToggleActive(row),
                        },
                      ]
                    : []),
                ]
              : []),
            ...(canDelete && !row.isSuperAdmin
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
        title="User Management"
        subtitle="Create users with personal details, department, and multi-role access. Menus follow role permissions."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/users/new')}>
              Add User
            </Button>
          ) : undefined
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Table
        columns={columns}
        rows={users}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search employee, mobile, department, role..."
        searchText={(row) =>
          `${row.fullName} ${row.username} ${row.employeeId || ''} ${row.email || ''} ${row.mobileNumber || ''} ${row.departmentName || ''} ${row.roleNames.join(' ')} ${row.createdByName || ''}`
        }
      />
    </div>
  );
}

export default UsersPage;
