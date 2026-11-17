import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Loader';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { MenuItem, Permission, Role } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { menusApi } from '../menus/menus.api';
import { rolesApi } from './roles.api';
import './RoleFormPage.css';

type RoleField = 'name' | 'code' | 'permissions';

const CRUD_ORDER = ['view', 'create', 'update', 'delete'] as const;

const CRUD_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
};

function titleCase(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function moduleFromPermissionCode(code: string | null | undefined) {
  if (!code) return null;
  const [moduleName] = code.split('.');
  return moduleName || null;
}

export function RoleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const roleId = id ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<RoleField>();
  const [editing, setEditing] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissionIds, setPermissionIds] = useState<number[]>([]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');

  const canSave = isEdit
    ? hasPermission(user, 'roles.update')
    : hasPermission(user, 'roles.create');

  const permissionsById = useMemo(
    () => Object.fromEntries(permissions.map((permission) => [permission.id, permission])),
    [permissions],
  );

  const permissionsByModule = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      acc[permission.module] = acc[permission.module] || [];
      acc[permission.module].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  type ExplorerItem = {
    key: string;
    kind: 'menu' | 'module';
    id: number | string;
    label: string;
    sub: string;
    module: string;
    permissionCode: string | null;
  };

  const explorerItems = useMemo(() => {
    const menuModules = new Set<string>();
    const items: ExplorerItem[] = menus
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map((menu) => {
        const moduleName = moduleFromPermissionCode(menu.permissionCode) || menu.code;
        if (menu.permissionCode) menuModules.add(moduleName);
        return {
          key: `menu:${menu.id}`,
          kind: 'menu' as const,
          id: menu.id,
          label: menu.label,
          sub: menu.route || menu.code,
          module: moduleName,
          permissionCode: menu.permissionCode,
        };
      });

    Object.keys(permissionsByModule)
      .filter((moduleName) => !menuModules.has(moduleName))
      .sort()
      .forEach((moduleName) => {
        items.push({
          key: `module:${moduleName}`,
          kind: 'module',
          id: moduleName,
          label: titleCase(moduleName),
          sub: `${permissionsByModule[moduleName].length} permissions`,
          module: moduleName,
          permissionCode: null,
        });
      });

    return items;
  }, [menus, permissionsByModule]);

  const filteredExplorer = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    if (!query) return explorerItems;
    return explorerItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.sub.toLowerCase().includes(query) ||
        item.module.toLowerCase().includes(query),
    );
  }, [explorerItems, menuSearch]);

  const selectedItem = useMemo(
    () => explorerItems.find((item) => item.key === selectedKey) || null,
    [explorerItems, selectedKey],
  );

  const selectedModulePermissions = useMemo(() => {
    if (!selectedItem) return [];
    const rows = permissionsByModule[selectedItem.module] || [];
    const query = permSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (permission) =>
        permission.action.toLowerCase().includes(query) ||
        permission.code.toLowerCase().includes(query) ||
        permission.description.toLowerCase().includes(query),
    );
  }, [permissionsByModule, permSearch, selectedItem]);

  const selectedIds = useMemo(() => new Set(permissionIds), [permissionIds]);

  const modulesSelected = useMemo(() => {
    const modules = new Set<string>();
    permissionIds.forEach((permissionId) => {
      const permission = permissionsById[permissionId];
      if (permission) modules.add(permission.module);
    });
    return modules.size;
  }, [permissionIds, permissionsById]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [permissionRows, menuRows, roleRows] = await Promise.all([
        rolesApi.listPermissions(),
        menusApi.list().catch(() => [] as MenuItem[]),
        isEdit ? rolesApi.list() : Promise.resolve([] as Role[]),
      ]);

      setPermissions(permissionRows);
      setMenus(menuRows);

      if (isEdit) {
        const role = roleRows.find((row) => row.id === roleId);
        if (!role) {
          setError('Role not found');
          return;
        }
        if (!hasPermission(user, 'roles.update')) {
          setError('You do not have permission to edit roles');
          return;
        }
        setEditing(role);
        setCode(role.code);
        setName(role.name);
        setDescription(role.description || '');
        setIsActive(role.isActive);
        setPermissionIds(role.permissionIds);
      } else if (!hasPermission(user, 'roles.create')) {
        setError('You do not have permission to create roles');
        return;
      }

      const firstMenu = menuRows[0];
      if (firstMenu) setSelectedKey(`menu:${firstMenu.id}`);
      else if (permissionRows[0]) setSelectedKey(`module:${permissionRows[0].module}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load role form'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const togglePermission = (permissionId: number) => {
    setPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((idValue) => idValue !== permissionId)
        : [...prev, permissionId],
    );
    clearError('permissions');
  };

  const setModulePermissions = (moduleName: string, nextIds: number[]) => {
    const moduleIdSet = new Set((permissionsByModule[moduleName] || []).map((row) => row.id));
    setPermissionIds((prev) => [
      ...prev.filter((idValue) => !moduleIdSet.has(idValue)),
      ...nextIds,
    ]);
    clearError('permissions');
  };

  const moduleHasAny = (moduleName: string) => {
    const rows = permissionsByModule[moduleName] || [];
    return rows.some((row) => selectedIds.has(row.id));
  };

  const toggleModule = (moduleName: string, enabled: boolean) => {
    const rows = permissionsByModule[moduleName] || [];
    if (!rows.length) return;
    if (enabled) {
      const view = rows.find((row) => row.action === 'view');
      setModulePermissions(moduleName, view ? [view.id] : [rows[0].id]);
    } else {
      setModulePermissions(moduleName, []);
    }
  };

  const applyPreset = (preset: 'all' | 'readonly' | 'full' | 'clear') => {
    if (!selectedItem) return;
    const rows = permissionsByModule[selectedItem.module] || [];
    if (preset === 'clear') {
      setModulePermissions(selectedItem.module, []);
      return;
    }
    if (preset === 'readonly') {
      setModulePermissions(
        selectedItem.module,
        rows.filter((row) => row.action === 'view').map((row) => row.id),
      );
      return;
    }
    setModulePermissions(
      selectedItem.module,
      rows.map((row) => row.id),
    );
  };

  const selectAllModules = () => {
    setPermissionIds(permissions.map((permission) => permission.id));
    clearError('permissions');
  };

  const clearAllModules = () => {
    setPermissionIds([]);
    clearError('permissions');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<RoleField, string>> = {};
    if (!name.trim()) nextErrors.name = 'Role name is required';
    if (!isEdit && !code.trim()) nextErrors.code = 'Role code is required';
    if (permissionIds.length === 0) nextErrors.permissions = 'Select at least one permission';

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editing) {
        await rolesApi.update(editing.id, {
          name: name.trim(),
          description: description.trim() || null,
          isActive,
          permissionIds,
        });
      } else {
        await rolesApi.create({
          code: code.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim() || null,
          isActive,
          permissionIds,
        });
      }
      navigate('/roles');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save role'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading role master…" />;
  }

  if (error) {
    return (
      <div className="rm-form-page">
        <Alert tone="error">{error}</Alert>
        <div className="rm-form-footer">
          <Button variant="back" size="sm" onClick={() => navigate('/roles')}>
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="rm-form-page" onSubmit={onSubmit}>
      <header className="rm-form-header">
        <div>
          <h1>{isEdit ? 'Edit Role' : 'Create Role'}</h1>
          <p>
            {isEdit
              ? 'Update role details and map menu permissions.'
              : 'Define a role and assign permissions by menu / module.'}
          </p>
        </div>
      </header>

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <section className="rm-form-details">
        <div className="rm-form-details-grid">
          <Input
            label="Role Name *"
            fieldKey="name"
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
            placeholder="e.g. Front Office Staff"
          />
          {isEdit ? (
            <Input label="Role Code" value={code} disabled />
          ) : (
            <Input
              label="Role Code *"
              fieldKey="code"
              error={errors.code}
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                clearError('code');
              }}
              placeholder="e.g. front_office"
            />
          )}
          <Select
            label="Status"
            value={isActive ? 'active' : 'inactive'}
            onChange={(event) => setIsActive(event.target.value === 'active')}
            disabled={Boolean(editing?.isSystem)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </div>

        <div className="rm-form-details-grid rm-form-details-grid--desc">
          <label className="ui-field rm-form-description">
            <span className="ui-field__label">Description</span>
            <textarea
              className="ui-field__input rm-form-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short summary of what this role can do"
              rows={3}
            />
          </label>
        </div>
      </section>

      {errors.permissions ? (
        <p className="ui-field__error rm-form-perm-error" data-field="permissions" tabIndex={-1}>
          {errors.permissions}
        </p>
      ) : null}

      <section className="rm-form-body" data-field="permissions" tabIndex={-1}>
        <aside className="rm-form-left">
          <div className="rm-form-left-head">
            <div className="rm-form-left-head-row">
              <h3>Menu Explorer</h3>
              <div className="rm-form-bulk">
                <button type="button" className="rm-ghost-btn" onClick={selectAllModules}>
                  Select All
                </button>
                <button type="button" className="rm-ghost-btn" onClick={clearAllModules}>
                  Clear All
                </button>
              </div>
            </div>
            <div className="rm-form-search">
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
              <input
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                placeholder="Search menus"
              />
            </div>
          </div>

          <div className="rm-form-tree">
            {filteredExplorer.map((item) => {
              const granted = moduleHasAny(item.module);
              const selected = item.key === selectedKey;
              return (
                <div
                  key={item.key}
                  className={`rm-form-tree-row ${selected ? 'is-selected' : ''} ${granted ? 'is-granted' : ''}`}
                  onClick={() => setSelectedKey(item.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedKey(item.key);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    type="checkbox"
                    checked={granted}
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleModule(item.module, event.target.checked);
                    }}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="rm-form-tree-text">
                    <span className="rm-form-tree-label">{item.label}</span>
                    <span className="rm-form-tree-sub">{item.sub}</span>
                  </div>
                  {(permissionsByModule[item.module] || []).length ? (
                    <span className="rm-form-tree-badge">
                      {(permissionsByModule[item.module] || []).filter((row) => selectedIds.has(row.id))
                        .length}
                      /
                      {(permissionsByModule[item.module] || []).length}
                    </span>
                  ) : null}
                </div>
              );
            })}
            {!filteredExplorer.length ? (
              <div className="rm-form-empty">No menus match your search.</div>
            ) : null}
          </div>

          <div className="rm-form-left-foot">
            <strong>{modulesSelected}</strong> menus selected · <strong>{permissionIds.length}</strong>{' '}
            permissions granted
          </div>
        </aside>

        <div className="rm-form-right">
          {!selectedItem ? (
            <div className="rm-form-right-empty">
              <p>Select a menu from the explorer to configure permissions.</p>
            </div>
          ) : (
            <>
              <div className="rm-form-right-head">
                <div>
                  <h3>{selectedItem.label}</h3>
                  <p>
                    {selectedItem.kind === 'menu'
                      ? `Configure access for ${selectedItem.label}`
                      : `Module permissions for ${selectedItem.label}`}
                  </p>
                </div>
                <div className="rm-form-perm-pill">
                  <strong>
                    {
                      (permissionsByModule[selectedItem.module] || []).filter((row) =>
                        selectedIds.has(row.id),
                      ).length
                    }
                  </strong>
                  <span>/</span>
                  {(permissionsByModule[selectedItem.module] || []).length}
                  <em>selected</em>
                </div>
              </div>

              <div className="rm-form-right-controls">
                <div className="rm-form-controls-row">
                  <span className="rm-form-controls-label">Access</span>
                  <div className="rm-form-crud">
                    {CRUD_ORDER.map((action) => {
                      const permission = (permissionsByModule[selectedItem.module] || []).find(
                        (row) => row.action === action,
                      );
                      if (!permission) return null;
                      return (
                        <label key={action} className="rm-form-crud-item">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                          />
                          {CRUD_LABELS[action]}
                        </label>
                      );
                    })}
                    {!(permissionsByModule[selectedItem.module] || []).length ? (
                      <span className="rm-form-muted">No restricted permissions</span>
                    ) : null}
                  </div>
                </div>

                <div className="rm-form-controls-row">
                  <span className="rm-form-controls-label">Actions</span>
                  <div className="rm-form-presets">
                    <button type="button" className="rm-ghost-btn" onClick={() => applyPreset('all')}>
                      Select All
                    </button>
                    <button
                      type="button"
                      className="rm-ghost-btn"
                      onClick={() => applyPreset('readonly')}
                    >
                      Read Only
                    </button>
                    <button type="button" className="rm-ghost-btn" onClick={() => applyPreset('full')}>
                      Full Access
                    </button>
                    <button type="button" className="rm-ghost-btn" onClick={() => applyPreset('clear')}>
                      Clear
                    </button>
                  </div>
                  <div className="rm-form-search rm-form-search--sm">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                      />
                    </svg>
                    <input
                      value={permSearch}
                      onChange={(event) => setPermSearch(event.target.value)}
                      placeholder="Search permissions"
                    />
                  </div>
                </div>
              </div>

              <div className="rm-form-right-scroll">
                <div className="rm-form-card">
                  <div className="rm-form-card-head">
                    <span className="rm-form-card-icon">P</span>
                    <div>
                      <h4>Page Access</h4>
                      <span>
                        {selectedItem.permissionCode
                          ? `Linked permission: ${selectedItem.permissionCode}`
                          : selectedItem.kind === 'menu'
                            ? 'Public to authenticated users (no permission code)'
                            : 'Module-level permission set'}
                      </span>
                    </div>
                  </div>
                  <div className="rm-form-card-body">
                    {selectedModulePermissions.length ? (
                      selectedModulePermissions.map((permission) => (
                        <label key={permission.id} className="rm-form-perm-item">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                          />
                          <span>
                            <strong>{CRUD_LABELS[permission.action] || titleCase(permission.action)}</strong>
                            <small>{permission.code}</small>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="rm-form-muted">
                        {permSearch
                          ? 'No permissions match this search.'
                          : 'This menu has no restricted permissions.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="rm-form-footer">
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/roles')}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          {isEdit ? 'Save Role' : 'Save Role'}
        </Button>
      </footer>
    </form>
  );
}
