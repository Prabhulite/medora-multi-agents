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
import type { Department, ServiceCareType, ServiceCategory } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { departmentsApi } from '../departments/departments.api';
import { serviceCategoriesApi, servicesApi } from './services.api';
import './ServiceFormPage.css';

type ServiceField =
  | 'serviceName'
  | 'categoryId'
  | 'departmentId'
  | 'serviceType'
  | 'defaultPrice'
  | 'taxPercent'
  | 'defaultDiscountPercent'
  | 'defaultQuantity'
  | 'effectiveFrom'
  | 'description'
  | 'branchName';

const CARE_TYPE_OPTIONS: { label: string; value: ServiceCareType }[] = [
  { label: 'OP', value: 'OP' },
  { label: 'IP', value: 'IP' },
  { label: 'Both', value: 'Both' },
];

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ServiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const serviceId = id ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } =
    useFieldErrors<ServiceField>();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [serviceName, setServiceName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceCareType>('Both');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [billingApplicable, setBillingApplicable] = useState<ServiceCareType>('Both');
  const [allowDiscount, setAllowDiscount] = useState(true);
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState('');
  const [allowQuantity, setAllowQuantity] = useState(true);
  const [defaultQuantity, setDefaultQuantity] = useState('1');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIsoDate());
  const [branchName, setBranchName] = useState('');

  const canSave = isEdit
    ? hasPermission(user, 'services.update')
    : hasPermission(user, 'services.create');

  const categoryOptions = useMemo(
    () => [
      { label: 'Select category', value: '' },
      ...categories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    ],
    [categories],
  );

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

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [activeCategories, activeDepartments] = await Promise.all([
          serviceCategoriesApi.listActive(),
          departmentsApi.listActive(),
        ]);
        if (!active) return;
        setCategories(activeCategories);
        setDepartments(activeDepartments);

        if (isEdit && serviceId) {
          const service = await servicesApi.getById(serviceId);
          if (!active) return;
          setServiceName(service.serviceName);
          setCategoryId(String(service.categoryId));
          setDepartmentId(String(service.departmentId));
          setServiceType(service.serviceType);
          setDefaultPrice(String(service.defaultPrice));
          setTaxPercent(service.taxPercent == null ? '' : String(service.taxPercent));
          setDescription(service.description || '');
          setIsActive(service.isActive);
          setBillingApplicable(service.billingApplicable);
          setAllowDiscount(service.allowDiscount);
          setDefaultDiscountPercent(
            service.defaultDiscountPercent == null
              ? ''
              : String(service.defaultDiscountPercent),
          );
          setAllowQuantity(service.allowQuantity);
          setDefaultQuantity(String(service.defaultQuantity));
          setEffectiveFrom(service.effectiveFrom.slice(0, 10));
          setBranchName(service.branchName || '');
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Failed to load service form'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [isEdit, serviceId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<ServiceField, string>> = {};
    if (!serviceName.trim()) nextErrors.serviceName = 'Service name is required';
    if (!categoryId) nextErrors.categoryId = 'Service category is required';
    if (!departmentId) nextErrors.departmentId = 'Department is required';
    if (!serviceType) nextErrors.serviceType = 'Service type is required';

    const priceValue = Number(defaultPrice);
    if (!defaultPrice.trim() || Number.isNaN(priceValue) || priceValue < 0) {
      nextErrors.defaultPrice = 'Valid default price is required';
    }

    let taxValue: number | null = null;
    if (taxPercent.trim()) {
      taxValue = Number(taxPercent);
      if (Number.isNaN(taxValue) || taxValue < 0 || taxValue > 100) {
        nextErrors.taxPercent = 'Tax must be between 0 and 100';
      }
    }

    let discountValue: number | null = null;
    if (allowDiscount) {
      discountValue = Number(defaultDiscountPercent);
      if (
        !defaultDiscountPercent.trim() ||
        Number.isNaN(discountValue) ||
        discountValue < 0 ||
        discountValue > 100
      ) {
        nextErrors.defaultDiscountPercent = 'Default discount % is required (0–100)';
      }
    }

    const quantityValue = Number(defaultQuantity || '1');
    if (Number.isNaN(quantityValue) || quantityValue < 0.01) {
      nextErrors.defaultQuantity = 'Default quantity must be at least 0.01';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      nextErrors.effectiveFrom = 'Effective from date is required';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        serviceName: serviceName.trim(),
        categoryId: Number(categoryId),
        departmentId: Number(departmentId),
        serviceType,
        defaultPrice: priceValue,
        taxPercent: taxValue,
        description: description.trim() || null,
        isActive,
        billingApplicable,
        allowDiscount,
        defaultDiscountPercent: allowDiscount ? discountValue : null,
        allowQuantity,
        defaultQuantity: quantityValue,
        effectiveFrom,
        branchName: branchName.trim() || null,
      };

      if (isEdit && serviceId) {
        await servicesApi.update(serviceId, payload);
      } else {
        await servicesApi.create(payload);
      }
      navigate('/services');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save service'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading service…" />;
  }

  if (error) {
    return (
      <div className="sm-form-page">
        <Alert tone="error">{error}</Alert>
        <div className="sm-form-footer">
          <Button variant="back" size="sm" onClick={() => navigate('/services')}>
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="sm-form-page" onSubmit={onSubmit}>
      <header className="sm-form-header">
        <div>
          <h1>{isEdit ? 'Edit Service' : 'Create Service'}</h1>
          <p>
            {isEdit
              ? 'Update service master details used in OP/IP billing.'
              : 'Add a billable service with category, department, and pricing.'}
          </p>
        </div>
      </header>

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <section className="sm-form-card">
        <h2 className="sm-form-card__title">Service Details</h2>
        <div className="sm-form-grid">
          <Input
            label="Service Name *"
            fieldKey="serviceName"
            value={serviceName}
            error={errors.serviceName}
            onChange={(event) => {
              setServiceName(event.target.value);
              clearError('serviceName');
            }}
            placeholder="e.g. Consultation, ECG"
          />
          <Select
            label="Service Category *"
            fieldKey="categoryId"
            value={categoryId}
            error={errors.categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              clearError('categoryId');
            }}
            options={categoryOptions}
          />
          <Select
            label="Department *"
            fieldKey="departmentId"
            value={departmentId}
            error={errors.departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value);
              clearError('departmentId');
            }}
            options={departmentOptions}
          />
          <Select
            label="Service Type *"
            fieldKey="serviceType"
            value={serviceType}
            error={errors.serviceType}
            onChange={(event) => {
              setServiceType(event.target.value as ServiceCareType);
              clearError('serviceType');
            }}
            options={CARE_TYPE_OPTIONS}
          />
          <Input
            label="Default Price *"
            fieldKey="defaultPrice"
            type="number"
            min={0}
            step="0.01"
            value={defaultPrice}
            error={errors.defaultPrice}
            onChange={(event) => {
              setDefaultPrice(event.target.value);
              clearError('defaultPrice');
            }}
            placeholder="0.00"
          />
          <Input
            label="Tax (%)"
            fieldKey="taxPercent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={taxPercent}
            error={errors.taxPercent}
            onChange={(event) => {
              setTaxPercent(event.target.value);
              clearError('taxPercent');
            }}
            placeholder="Optional GST %"
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
          <label className={`ui-field sm-form-span-3 ${errors.description ? 'ui-field--error' : ''}`}>
            <span className="ui-field__label">Description</span>
            <textarea
              className="ui-field__input sm-form-textarea"
              value={description}
              rows={3}
              maxLength={2000}
              placeholder="Short service description"
              onChange={(event) => {
                setDescription(event.target.value);
                clearError('description');
              }}
            />
            {errors.description ? (
              <span className="ui-field__error">{errors.description}</span>
            ) : null}
          </label>
        </div>
      </section>

      <section className="sm-form-card">
        <h2 className="sm-form-card__title">Billing Configuration</h2>
        <div className="sm-form-grid">
          <Select
            label="Billing Applicable *"
            value={billingApplicable}
            onChange={(event) =>
              setBillingApplicable(event.target.value as ServiceCareType)
            }
            options={CARE_TYPE_OPTIONS}
          />
          <Select
            label="Allow Discount *"
            value={allowDiscount ? 'yes' : 'no'}
            onChange={(event) => {
              const enabled = event.target.value === 'yes';
              setAllowDiscount(enabled);
              if (!enabled) {
                setDefaultDiscountPercent('');
                clearError('defaultDiscountPercent');
              }
            }}
            options={[
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ]}
          />
          {allowDiscount ? (
            <Input
              label="Default Discount (%) *"
              fieldKey="defaultDiscountPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={defaultDiscountPercent}
              error={errors.defaultDiscountPercent}
              onChange={(event) => {
                setDefaultDiscountPercent(event.target.value);
                clearError('defaultDiscountPercent');
              }}
              placeholder="e.g. 5"
            />
          ) : null}
          <Select
            label="Allow Quantity *"
            value={allowQuantity ? 'yes' : 'no'}
            onChange={(event) => setAllowQuantity(event.target.value === 'yes')}
            options={[
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ]}
          />
          <Input
            label="Default Quantity *"
            fieldKey="defaultQuantity"
            type="number"
            min={0.01}
            step="0.01"
            value={defaultQuantity}
            error={errors.defaultQuantity}
            onChange={(event) => {
              setDefaultQuantity(event.target.value);
              clearError('defaultQuantity');
            }}
          />
          <Input
            label="Effective From *"
            fieldKey="effectiveFrom"
            type="date"
            value={effectiveFrom}
            error={errors.effectiveFrom}
            onChange={(event) => {
              setEffectiveFrom(event.target.value);
              clearError('effectiveFrom');
            }}
          />
          <Input
            label="Branch"
            fieldKey="branchName"
            value={branchName}
            error={errors.branchName}
            onChange={(event) => {
              setBranchName(event.target.value);
              clearError('branchName');
            }}
            placeholder="Optional hospital branch"
          />
        </div>
      </section>

      <footer className="sm-form-footer">
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/services')}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          {isEdit ? 'Save Service' : 'Create Service'}
        </Button>
      </footer>
    </form>
  );
}

export default ServiceFormPage;
