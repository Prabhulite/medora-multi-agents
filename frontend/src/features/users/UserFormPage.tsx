import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Loader';
import { MultiSelectSearch } from '../../components/ui/MultiSelectSearch';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Department, Role, User, UserGender } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { departmentsApi } from '../departments/departments.api';
import { rolesApi } from '../roles/roles.api';
import { usersApi } from './users.api';
import './UserFormPage.css';

type UserField =
  | 'employeeId'
  | 'fullName'
  | 'mobileNumber'
  | 'username'
  | 'password'
  | 'departmentId'
  | 'roleIds';

export function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEdit = Boolean(id);
  const userId = id ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<UserField>();
  const [editing, setEditing] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<UserGender>(null);
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roleIds, setRoleIds] = useState<number[]>([]);

  const canSave = isEdit
    ? hasPermission(currentUser, 'users.update')
    : hasPermission(currentUser, 'users.create');

  const departmentOptions = useMemo(
    () => [
      { label: 'Select department', value: '' },
      ...departments.map((department) => ({
        label: department.name,
        value: department.id,
      })),
    ],
    [departments],
  );

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.id,
        label: role.name,
        subLabel: role.code,
      })),
    [roles],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [roleRows, departmentRows] = await Promise.all([
        rolesApi.list(),
        departmentsApi.listActive(),
      ]);
      setRoles(roleRows.filter((role) => role.isActive));
      setDepartments(departmentRows);

      if (isEdit && userId) {
        if (!hasPermission(currentUser, 'users.update')) {
          setError('You do not have permission to edit users');
          return;
        }
        const user = await usersApi.getById(userId);
        setEditing(user);
        setEmployeeId(user.employeeId || '');
        setFullName(user.fullName);
        setMobileNumber(user.mobileNumber || '');
        setEmail(user.email || '');
        setGender(user.gender);
        setDesignation(user.designation || '');
        setDepartmentId(user.departmentId ?? '');
        setUsername(user.username);
        setPassword('');
        setIsActive(user.isActive);
        setRoleIds(user.roleIds);
      } else if (!hasPermission(currentUser, 'users.create')) {
        setError('You do not have permission to create users');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user form'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<UserField, string>> = {};
    if (!employeeId.trim()) nextErrors.employeeId = 'Employee ID is required';
    if (!fullName.trim()) nextErrors.fullName = 'Employee name is required';
    if (!mobileNumber.trim()) nextErrors.mobileNumber = 'Mobile number is required';
    if (!departmentId) nextErrors.departmentId = 'Department is required';
    if (!isEdit && !username.trim()) nextErrors.username = 'Username is required';
    if (!isEdit && !password) nextErrors.password = 'Password is required';
    if (!editing?.isSuperAdmin && roleIds.length === 0) {
      nextErrors.roleIds = 'Select at least one role';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editing) {
        await usersApi.update(editing.id, {
          employeeId: employeeId.trim(),
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          email: email.trim() || null,
          gender,
          designation: designation.trim() || null,
          departmentId: Number(departmentId),
          password: password || undefined,
          isActive,
          roleIds: editing.isSuperAdmin ? undefined : roleIds,
        });
      } else {
        await usersApi.create({
          employeeId: employeeId.trim(),
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          email: email.trim() || null,
          gender,
          designation: designation.trim() || null,
          departmentId: Number(departmentId),
          username: username.trim(),
          password,
          isActive,
          roleIds,
        });
      }
      navigate('/users');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save user'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading user form…" />;
  }

  if (error) {
    return (
      <div className="um-form-page">
        <Alert tone="error">{error}</Alert>
        <div className="um-form-footer">
          <Button variant="back" size="sm" onClick={() => navigate('/users')}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="um-form-page" onSubmit={onSubmit}>
      <header className="um-form-header">
        <div>
          <h1>{isEdit ? 'Edit User' : 'Create User'}</h1>
          <p>
            {isEdit
              ? 'Update employee profile, login status, department, and assigned roles.'
              : 'Add a new employee account with personal details, login access, department, and roles.'}
          </p>
        </div>
      </header>

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <section className="um-form-card">
        <div className="um-form-card__head">
          <h2>1. Personal Details</h2>
          <p>Employee identity and contact information</p>
        </div>
        <div className="um-form-grid">
          <Input
            label="Employee ID *"
            fieldKey="employeeId"
            value={employeeId}
            error={errors.employeeId}
            onChange={(event) => {
              setEmployeeId(event.target.value);
              clearError('employeeId');
            }}
            placeholder="e.g. EMP-1024"
          />
          <Input
            label="Employee Name *"
            fieldKey="fullName"
            value={fullName}
            error={errors.fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              clearError('fullName');
            }}
            placeholder="Full name"
          />
          <Input
            label="Mobile Number *"
            fieldKey="mobileNumber"
            value={mobileNumber}
            error={errors.mobileNumber}
            onChange={(event) => {
              setMobileNumber(event.target.value);
              clearError('mobileNumber');
            }}
            placeholder="e.g. 9876543210"
          />
          <Input
            label="Email ID"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="optional@company.com"
          />
          <Select
            label="Gender"
            value={gender ?? ''}
            onChange={(event) =>
              setGender((event.target.value || null) as UserGender)
            }
            options={[
              { label: 'Select gender', value: '' },
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <Input
            label="Designation"
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            placeholder="e.g. Staff Nurse"
          />
        </div>
      </section>

      <section className="um-form-card">
        <div className="um-form-card__head">
          <h2>2. Login Credentials</h2>
          <p>Account login and status</p>
        </div>
        <div className="um-form-grid">
          {isEdit ? (
            <Input label="Username *" value={username} disabled />
          ) : (
            <Input
              label="Username *"
              fieldKey="username"
              value={username}
              error={errors.username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearError('username');
              }}
              placeholder="login username"
            />
          )}
          <Input
            label={isEdit ? 'Password (optional)' : 'Password *'}
            fieldKey="password"
            type="password"
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError('password');
            }}
            placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 chars, letter + number'}
            passwordToggle
          />
          <Select
            label="Login Status *"
            value={isActive ? 'active' : 'inactive'}
            onChange={(event) => setIsActive(event.target.value === 'active')}
            disabled={Boolean(editing?.isSuperAdmin)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </div>
      </section>

      <section className="um-form-card">
        <div className="um-form-card__head">
          <h2>3. Organization Access</h2>
          <p>Assign department and one or more roles from the searchable role list.</p>
        </div>

        <div className="um-form-grid um-form-grid--2">
          <Select
            label="Department *"
            fieldKey="departmentId"
            value={departmentId}
            error={errors.departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value ? Number(event.target.value) : '');
              clearError('departmentId');
            }}
            options={departmentOptions}
          />

          {!editing?.isSuperAdmin ? (
            <MultiSelectSearch
              label="Role(s)"
              requiredMark
              fieldKey="roleIds"
              values={roleIds}
              options={roleOptions}
              error={errors.roleIds}
              placeholder="Select roles... (multi-select)"
              searchPlaceholder="Search..."
              onChange={(values) => {
                setRoleIds(values.map(Number));
                clearError('roleIds');
              }}
            />
          ) : (
            <div className="um-form-note">
              <Alert tone="info">Super admin roles are managed by the system seed.</Alert>
            </div>
          )}
        </div>

        {!editing?.isSuperAdmin && !roles.length ? (
          <p className="um-form-muted um-form-muted--pad">
            No active roles available. Create a role first.
          </p>
        ) : null}
      </section>

      <footer className="um-form-footer">
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/users')}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          {isEdit ? 'Save User' : 'Create User'}
        </Button>
      </footer>
    </form>
  );
}

export default UserFormPage;
