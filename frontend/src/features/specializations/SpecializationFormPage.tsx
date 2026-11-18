import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Loader';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { specializationsApi } from './specializations.api';
import '../departments/DepartmentFormPage.css';

type Field = 'code' | 'name';

export function SpecializationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const specializationId = id ? Number(id) : null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<Field>();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const canSave = isEdit
    ? hasPermission(user, 'specializations.update')
    : hasPermission(user, 'specializations.create');

  useEffect(() => {
    if (!isEdit || !specializationId) return;
    let active = true;
    setLoading(true);
    specializationsApi
      .getById(specializationId)
      .then((row) => {
        if (!active) return;
        setCode(row.code);
        setName(row.name);
        setIsActive(row.isActive);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load specialization'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, specializationId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();
    const nextErrors: Partial<Record<Field, string>> = {};
    if (!code.trim()) nextErrors.code = 'Specialization code is required';
    if (!name.trim()) nextErrors.name = 'Specialization name is required';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && specializationId) {
        await specializationsApi.update(specializationId, {
          code: code.trim(),
          name: name.trim(),
          isActive,
        });
      } else {
        await specializationsApi.create({
          code: code.trim(),
          name: name.trim(),
          isActive,
        });
      }
      navigate('/specializations');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save specialization'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading specialization…" />;

  if (error) {
    return (
      <div className="dm-form-page">
        <Alert tone="error">{error}</Alert>
        <div className="dm-form-footer">
          <Button variant="back" size="sm" onClick={() => navigate('/specializations')}>
            Back to Specializations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="dm-form-page" onSubmit={onSubmit}>
      <header className="dm-form-header">
        <div>
          <h1>{isEdit ? 'Edit Specialization' : 'Create Specialization'}</h1>
          <p>Specialization values are selected when creating doctors.</p>
        </div>
      </header>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <section className="dm-form-card">
        <div className="dm-form-grid">
          <Input
            label="Specialization Code *"
            fieldKey="code"
            value={code}
            error={errors.code}
            onChange={(event) => {
              setCode(event.target.value);
              clearError('code');
            }}
            placeholder="e.g. cardiology"
            disabled={isEdit}
          />
          <Input
            label="Specialization Name *"
            fieldKey="name"
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
            placeholder="e.g. Cardiology"
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
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/specializations')}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          {isEdit ? 'Save Specialization' : 'Create Specialization'}
        </Button>
      </footer>
    </form>
  );
}

export default SpecializationFormPage;
