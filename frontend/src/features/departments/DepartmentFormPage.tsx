import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { departmentsApi } from './departments.api';
import './DepartmentFormPage.css';

type DepartmentField = 'code' | 'name';

export function DepartmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const departmentId = id ? Number(id) : null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } =
    useFieldErrors<DepartmentField>();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const canSave = isEdit
    ? hasPermission(user, 'departments.update')
    : hasPermission(user, 'departments.create');

  useEffect(() => {
    if (!isEdit || !departmentId) return;

    let active = true;
    setLoading(true);
    departmentsApi
      .getById(departmentId)
      .then((department) => {
        if (!active) return;
        setCode(department.code);
        setName(department.name);
        setIsActive(department.isActive);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load department'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [departmentId, isEdit]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<DepartmentField, string>> = {};
    if (!code.trim()) nextErrors.code = 'Department code is required';
    if (!name.trim()) nextErrors.name = 'Department name is required';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && departmentId) {
        await departmentsApi.update(departmentId, {
          code: code.trim(),
          name: name.trim(),
          isActive,
        });
      } else {
        await departmentsApi.create({
          code: code.trim(),
          name: name.trim(),
          isActive,
        });
      }
      navigate('/departments');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save department'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="dm-form-loading">Loading department…</div>;
  }

  if (error) {
    return (
      <div className="dm-form-page">
        <Alert tone="error">{error}</Alert>
        <div className="dm-form-footer">
          <Button variant="secondary" size="sm" onClick={() => navigate('/departments')}>
            Back to Departments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="dm-form-page" onSubmit={onSubmit}>
      <header className="dm-form-header">
        <div>
          <h1>{isEdit ? 'Edit Department' : 'Create Department'}</h1>
          <p>
            {isEdit
              ? 'Update department details used in user organization access.'
              : 'Add a department that can be selected when creating users.'}
          </p>
        </div>
      </header>

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <section className="dm-form-card">
        <div className="dm-form-grid">
          <Input
            label="Department Code *"
            fieldKey="code"
            value={code}
            error={errors.code}
            onChange={(event) => {
              setCode(event.target.value);
              clearError('code');
            }}
            placeholder="e.g. clinical"
            disabled={isEdit}
          />
          <Input
            label="Department Name *"
            fieldKey="name"
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
            placeholder="e.g. Clinical"
          />
          <Select
            label="Status *"
            value={isActive ? 'active' : 'inactive'}
            onChange={(event) => setIsActive(event.target.value === 'active')}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </div>
      </section>

      <footer className="dm-form-footer">
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/departments')}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          {isEdit ? 'Save Department' : 'Create Department'}
        </Button>
      </footer>
    </form>
  );
}

export default DepartmentFormPage;
