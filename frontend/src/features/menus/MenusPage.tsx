import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
} from '../../components/ui/statusIcons';
import { Table } from '../../components/ui/Table';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { MenuItem, Permission } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { rolesApi } from '../roles/roles.api';
import { MENU_ICON_OPTIONS } from './menuIcons';
import { menusApi } from './menus.api';
import './MenusPage.css';

const emptyForm = {
  code: '',
  label: '',
  route: '',
  icon: 'dashboard',
  permissionCode: '',
  sortOrder: 100,
  isActive: true,
};

type MenuField = 'code' | 'label' | 'route';

export function MenusPage() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<MenuField>();

  const canCreate = hasPermission(user, 'menus.create');
  const canUpdate = hasPermission(user, 'menus.update');
  const canDelete = hasPermission(user, 'menus.delete');

  const permissionOptions = useMemo(
    () => [
      { label: 'No permission (visible to all logged-in users)', value: '' },
      ...permissions.map((permission) => ({
        label: `${permission.code} — ${permission.description}`,
        value: permission.code,
      })),
    ],
    [permissions],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [menuRows, permissionRows] = await Promise.all([
        menusApi.list(),
        rolesApi.listPermissions(),
      ]);
      setMenus(menuRows);
      setPermissions(permissionRows);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load menus'));
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
    clearAllErrors();
    setModalOpen(true);
  };

  const openEdit = (menu: MenuItem) => {
    setEditing(menu);
    setForm({
      code: menu.code,
      label: menu.label,
      route: menu.route,
      icon: menu.icon,
      permissionCode: menu.permissionCode || '',
      sortOrder: menu.sortOrder,
      isActive: menu.isActive,
    });
    setFormError('');
    clearAllErrors();
    setModalOpen(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<MenuField, string>> = {};
    if (!editing && !form.code.trim()) nextErrors.code = 'Menu code is required';
    if (!form.label.trim()) nextErrors.label = 'Label is required';
    if (!form.route.trim()) nextErrors.route = 'Route is required';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await menusApi.update(editing.id, {
          label: form.label.trim(),
          route: form.route.trim(),
          icon: form.icon,
          permissionCode: form.permissionCode || null,
          sortOrder: Number(form.sortOrder),
          isActive: form.isActive,
        });
      } else {
        await menusApi.create({
          code: form.code.trim().toLowerCase(),
          label: form.label.trim(),
          route: form.route.trim(),
          icon: form.icon,
          permissionCode: form.permissionCode || null,
          sortOrder: Number(form.sortOrder),
          isActive: form.isActive,
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save menu'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (menu: MenuItem) => {
    if (!window.confirm(`Delete menu "${menu.label}"?`)) return;
    try {
      await menusApi.remove(menu.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete menu'));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'menu',
        header: 'Menu',
        render: (row: MenuItem) => (
          <div>
            <div className="ui-table__cell-title">{row.label}</div>
            <div className="ui-table__cell-sub">{row.code}</div>
          </div>
        ),
      },
      {
        key: 'route',
        header: 'Route',
        render: (row: MenuItem) => <span className="ui-table__cell-title">{row.route}</span>,
      },
      {
        key: 'permission',
        header: 'Permission',
        render: (row: MenuItem) =>
          row.permissionCode ? (
            <Badge tone="info" icon={<CheckCircleIcon />}>
              {row.permissionCode}
            </Badge>
          ) : (
            <Badge tone="neutral" icon={<AlertCircleIcon />}>
              Public (auth)
            </Badge>
          ),
      },
      {
        key: 'sort',
        header: 'Order',
        render: (row: MenuItem) => (
          <span className="ui-table__cell-title">{row.sortOrder}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: MenuItem) => (
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
        render: (row: MenuItem) => {
          const items = [
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => openEdit(row),
                  },
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
    [canDelete, canUpdate],
  );

  return (
    <div>
      <PageHeader
        title="Menu Management"
        subtitle="Manage sidebar menus, routes, icons, and access permissions from the database."
        actions={canCreate ? <Button size="sm" onClick={openCreate}>Add Menu</Button> : undefined}
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Table
        columns={columns}
        rows={menus}
        rowKey={(row) => row.id}
        loading={loading}
        onRefresh={() => void load()}
        searchPlaceholder="Search menu, code, route..."
        searchText={(row) =>
          `${row.label} ${row.code} ${row.route} ${row.permissionCode || ''} ${row.icon}`
        }
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Menu' : 'Create Menu'}
        squared
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="menu-form" type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Menu'}
            </Button>
          </>
        }
      >
        <form id="menu-form" className="menu-form" onSubmit={onSubmit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <div className="menu-form__row">
            {!editing ? (
              <Input
                label="Menu Code"
                fieldKey="code"
                value={form.code}
                error={errors.code}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, code: e.target.value }));
                  clearError('code');
                }}
                placeholder="e.g. appointments"
              />
            ) : (
              <Input label="Menu Code" value={form.code} disabled />
            )}
            <Input
              label="Label"
              fieldKey="label"
              value={form.label}
              error={errors.label}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, label: e.target.value }));
                clearError('label');
              }}
            />
            <Input
              label="Route"
              fieldKey="route"
              value={form.route}
              error={errors.route}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, route: e.target.value }));
                clearError('route');
              }}
              placeholder="e.g. /appointments"
            />
          </div>

          <div className="menu-form__row">
            <Select
              label="Icon"
              value={form.icon}
              onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
              options={MENU_ICON_OPTIONS}
            />
            <Select
              label="Permission"
              value={form.permissionCode}
              onChange={(e) => setForm((prev) => ({ ...prev, permissionCode: e.target.value }))}
              options={permissionOptions}
            />
            <Input
              label="Sort Order"
              type="number"
              value={String(form.sortOrder)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
              }
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              disabled={Boolean(editing?.isSystem)}
            />
            Active
          </label>
        </form>
      </Modal>
    </div>
  );
}
