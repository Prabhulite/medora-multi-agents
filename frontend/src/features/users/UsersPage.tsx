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
import type { Role, User } from '../../types';
import { rolesApi } from '../roles/roles.api';
import { usersApi } from './users.api';
import './UsersPage.css';

const emptyForm = {
  username: '',
  email: '',
  fullName: '',
  password: '',
  isActive: true,
  roleIds: [] as number[],
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission(currentUser, 'users.create');
  const canUpdate = hasPermission(currentUser, 'users.update');
  const canDelete = hasPermission(currentUser, 'users.delete');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [userRows, roleRows] = await Promise.all([usersApi.list(), rolesApi.list()]);
      setUsers(userRows);
      setRoles(roleRows.filter((role) => role.isActive));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
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

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      password: '',
      isActive: user.isActive,
      roleIds: user.roleIds,
    });
    setFormError('');
    setModalOpen(true);
  };

  const toggleRole = (roleId: number) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError('Full name and email are required');
      return;
    }

    if (!editing && (!form.username.trim() || !form.password)) {
      setFormError('Username and password are required');
      return;
    }

    if (form.roleIds.length === 0 && !(editing?.isSuperAdmin)) {
      setFormError('Select at least one role');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          isActive: form.isActive,
          password: form.password || undefined,
          roleIds: editing.isSuperAdmin ? undefined : form.roleIds,
        });
      } else {
        await usersApi.create({
          username: form.username.trim(),
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          isActive: form.isActive,
          roleIds: form.roleIds,
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save user'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (user: User) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await usersApi.remove(user.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete user'));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        render: (row: User) => (
          <div>
            <strong>{row.fullName}</strong>
            <div className="muted">@{row.username}</div>
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        render: (row: User) => row.email,
      },
      {
        key: 'roles',
        header: 'Roles',
        render: (row: User) => (
          <div className="chip-row">
            {row.roleNames.length
              ? row.roleNames.map((name) => <Badge key={name}>{name}</Badge>)
              : <Badge tone="warning">No roles</Badge>}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: User) => (
          <Badge tone={row.isActive ? 'success' : 'danger'}>
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row: User) => (
          <div className="action-row">
            {canUpdate ? (
              <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                Edit
              </Button>
            ) : null}
            {canDelete && !row.isSuperAdmin ? (
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
        title="User Management"
        subtitle="Create and manage application users with assigned roles."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>Add User</Button>
          ) : undefined
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <p>Loading users...</p> : <Table columns={columns} rows={users} rowKey={(row) => row.id} />}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit User' : 'Create User'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="user-form" type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </>
        }
      >
        <form id="user-form" className="user-form" onSubmit={onSubmit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          {!editing ? (
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          ) : (
            <Input label="Username" value={form.username} disabled />
          )}

          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label={editing ? 'New Password (optional)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              disabled={Boolean(editing?.isSuperAdmin)}
            />
            Active
          </label>

          {!editing?.isSuperAdmin ? (
            <div className="role-picker">
              <span className="role-picker__label">Roles</span>
              <div className="role-picker__grid">
                {roles.map((role) => (
                  <label key={role.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <Alert tone="info">Super admin roles are managed by the system seed.</Alert>
          )}
        </form>
      </Modal>
    </div>
  );
}
