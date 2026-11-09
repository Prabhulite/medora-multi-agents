import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Permission, Role } from '../../types';
import { rolesApi } from './roles.api';
import './RolesPage.css';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  isActive: true,
  permissionIds: [] as number[],
};

export function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission(user, 'roles.create');
  const canUpdate = hasPermission(user, 'roles.update');
  const canDelete = hasPermission(user, 'roles.delete');

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      acc[permission.module] = acc[permission.module] || [];
      acc[permission.module].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [roleRows, permissionRows] = await Promise.all([
        rolesApi.list(),
        rolesApi.listPermissions(),
      ]);
      setRoles(roleRows);
      setPermissions(permissionRows);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load roles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      code: role.code,
      name: role.name,
      description: role.description || '',
      isActive: role.isActive,
      permissionIds: role.permissionIds,
    });
    setFormError('');
    setModalOpen(true);
  };

  const togglePermission = (permissionId: number) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Role name is required');
      return;
    }

    if (!editing && !form.code.trim()) {
      setFormError('Role code is required');
      return;
    }

    if (form.permissionIds.length === 0) {
      setFormError('Select at least one permission');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await rolesApi.update(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
          permissionIds: form.permissionIds,
        });
      } else {
        await rolesApi.create({
          code: form.code.trim().toLowerCase(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
          permissionIds: form.permissionIds,
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save role'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (role: Role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      await rolesApi.remove(role.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete role'));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Role',
        render: (row: Role) => (
          <div>
            <strong>{row.name}</strong>
            <div className="muted">{row.code}</div>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (row: Role) => row.description || '—',
      },
      {
        key: 'permissions',
        header: 'Permissions',
        render: (row: Role) => (
          <Badge tone="info">{row.permissionCodes.length} assigned</Badge>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: Role) => (
          <div className="chip-row">
            <Badge tone={row.isActive ? 'success' : 'danger'}>
              {row.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {row.isSystem ? <Badge>System</Badge> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row: Role) => (
          <div className="action-row">
            {canUpdate ? (
              <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                Edit
              </Button>
            ) : null}
            {canDelete && !row.isSystem ? (
              <Button size="sm" variant="danger" onClick={() => void onDelete(row)}>
                Delete
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate],
  );

  return (
    <div>
      <PageHeader
        title="Role Management"
        subtitle="Define roles and map database-driven permissions. No hardcoded access rules."
        actions={canCreate ? <Button onClick={openCreate}>Add Role</Button> : undefined}
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? (
        <p>Loading roles...</p>
      ) : (
        <Table columns={columns} rows={roles} rowKey={(row) => row.id} />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Role' : 'Create Role'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="role-form" type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Role'}
            </Button>
          </>
        }
      >
        <form id="role-form" className="role-form" onSubmit={onSubmit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          {!editing ? (
            <Input
              label="Role Code"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="e.g. hospital_admin"
            />
          ) : (
            <Input label="Role Code" value={form.code} disabled />
          )}

          <Input
            label="Role Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              disabled={Boolean(editing?.isSystem)}
            />
            Active
          </label>

          <div className="permission-picker">
            <span className="permission-picker__label">Permissions</span>
            {Object.entries(groupedPermissions).map(([module, items]) => (
              <div key={module} className="permission-group">
                <h4>{module}</h4>
                <div className="permission-group__grid">
                  {items.map((permission) => (
                    <label key={permission.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.permissionIds.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                      />
                      <span>
                        <strong>{permission.action}</strong>
                        <small>{permission.code}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}
