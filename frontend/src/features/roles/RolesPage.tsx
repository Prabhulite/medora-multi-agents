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
import type { Role } from '../../types';
import { rolesApi } from './roles.api';
import './RolesPage.css';

export function RolesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(user, 'roles.create');
  const canUpdate = hasPermission(user, 'roles.update');
  const canDelete = hasPermission(user, 'roles.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRoles(await rolesApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load roles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (role: Role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      await rolesApi.remove(role.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete role'));
    }
  };

  const onToggleActive = async (role: Role) => {
    const nextActive = !role.isActive;
    if (!window.confirm(`${nextActive ? 'Activate' : 'Deactivate'} role "${role.name}"?`)) {
      return;
    }
    try {
      await rolesApi.update(role.id, { isActive: nextActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, `Unable to ${nextActive ? 'activate' : 'deactivate'} role`));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Role',
        render: (row: Role) => (
          <div>
            <div className="ui-table__cell-title">{row.name}</div>
            <div className="ui-table__cell-sub">{row.code}</div>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (row: Role) => (
          <span className="ui-table__cell-title">{row.description || '—'}</span>
        ),
      },
      {
        key: 'permissions',
        header: 'Permissions',
        render: (row: Role) => (
          <Badge tone="info" icon={<CheckCircleIcon />}>
            {row.permissionCodes.length} assigned
          </Badge>
        ),
      },
      {
        key: 'createdBy',
        header: 'Created By',
        render: (row: Role) => (
          <span className="ui-table__cell-title">{row.createdByName || '—'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Role) => (
          <div className="chip-row">
            <Badge
              tone={row.isActive ? 'success' : 'danger'}
              icon={row.isActive ? <CheckCircleIcon /> : <AlertCircleIcon />}
            >
              {row.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {row.isSystem ? <Badge tone="neutral">System</Badge> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '88px',
        render: (row: Role) => {
          const items = [
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/roles/${row.id}/edit`),
                  },
                  ...(!row.isSystem
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
            ...(canDelete && !row.isSystem
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
        title="Role Management"
        subtitle="Define roles and map database-driven permissions. No hardcoded access rules."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => navigate('/roles/new')}>
              Add Role
            </Button>
          ) : undefined
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Table
        columns={columns}
        rows={roles}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search role, code, permission..."
        searchText={(row) =>
          `${row.name} ${row.code} ${row.description || ''} ${row.permissionCodes.join(' ')} ${row.createdByName || ''}`
        }
      />
    </div>
  );
}
