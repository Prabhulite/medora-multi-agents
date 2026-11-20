import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import type { OpCheckinVisit, Patient, ServiceMaster } from '../../types';
import { billingApi, type BillingInvoice } from '../billing/billing.api';
import { PatientBillPanel } from '../billing/PatientBillPanel';
import '../billing/BillingDashboardPage.css';
import { doctorsApi, type ConsultantOption } from '../doctors/doctors.api';
import { patientsApi } from '../patients/patients.api';
import { servicesApi } from '../services/services.api';
import { checkinApi } from './checkin.api';
import './QuickOpBillPage.css';

type LineItem = {
  key: string;
  serviceId: number | null;
  name: string;
  qty: string;
  price: string;
  gstPercent: string;
  discountPercent: string;
  allowDiscount: boolean;
  allowQuantity: boolean;
};

type LocationState = {
  visit?: OpCheckinVisit;
};

const PURPOSE_OPTIONS = [
  { value: '', label: 'Select purpose of visit' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Investigation', label: 'Investigation' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Other', label: 'Other' },
];

const LOCATION_OPTIONS = [
  { value: 'Main Branch', label: 'Main Branch' },
  { value: 'OPD', label: 'OPD' },
];

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];

function money(value: number) {
  return `₹ ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function maskMobile(value: string | null | undefined) {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return value;
  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}

function lineMath(item: LineItem) {
  const qty = Math.max(0, Number(item.qty) || 0);
  const price = Math.max(0, Number(item.price) || 0);
  const gstPercent = Math.max(0, Number(item.gstPercent) || 0);
  const discountPercent = item.allowDiscount
    ? Math.min(100, Math.max(0, Number(item.discountPercent) || 0))
    : 0;
  const gross = qty * price;
  const discountAmount = (gross * discountPercent) / 100;
  const taxable = Math.max(0, gross - discountAmount);
  const taxValue = (taxable * gstPercent) / 100;
  const total = taxable + taxValue;
  return { qty, price, gstPercent, discountPercent, discountAmount, taxValue, total, gross };
}

function ageLabel(patient: Patient | null) {
  if (!patient) return '—';
  if (patient.ageYears != null) return `${patient.ageYears} Years`;
  if (!patient.dateOfBirth) return '—';
  const dob = new Date(patient.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return '—';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years -= 1;
  return `${Math.max(0, years)} Years`;
}

function genderLabel(value: string | null | undefined) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function QuickOpBillPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateVisit = (location.state as LocationState | null)?.visit;

  const [visit, setVisit] = useState<OpCheckinVisit | null>(
    stateVisit && String(stateVisit.id) === visitId ? stateVisit : null,
  );
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<ConsultantOption[]>([]);
  const [services, setServices] = useState<ServiceMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<BillingInvoice | null>(null);
  const [error, setError] = useState('');

  const [locationName, setLocationName] = useState('Main Branch');
  const [consultantId, setConsultantId] = useState(
    stateVisit?.doctorId ? String(stateVisit.doctorId) : '',
  );
  const [referredBy, setReferredBy] = useState(stateVisit?.referredBy || '');
  const [purposeOfVisit, setPurposeOfVisit] = useState(
    stateVisit?.purposeOfVisit || stateVisit?.natureOfVisit || 'Consultation',
  );
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'single' | 'multiple'>('single');
  const [paymentType, setPaymentType] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('0');
  const [notes, setNotes] = useState('');
  const [billDiscountPercent, setBillDiscountPercent] = useState('0');

  useEffect(() => {
    let active = true;
    const id = Number(visitId);
    if (!Number.isFinite(id) || id <= 0) {
      setError('Invalid visit');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const resolveVisit = async () => {
      if (stateVisit && stateVisit.id === id) return stateVisit;
      const rows = await checkinApi.list({ status: 'all' });
      const found = rows.find((row) => row.id === id);
      if (!found) throw new Error('Check-in visit not found');
      return found;
    };

    resolveVisit()
      .then(async (visitRow) => {
        if (!active) return;
        setVisit(visitRow);
        setConsultantId(visitRow.doctorId ? String(visitRow.doctorId) : '');
        setReferredBy(visitRow.referredBy || '');
        setPurposeOfVisit(
          visitRow.purposeOfVisit || visitRow.natureOfVisit || 'Consultation',
        );
        const [patientRow, doctorRows, serviceRows] = await Promise.all([
          patientsApi.getById(visitRow.patientId),
          doctorsApi.consultants(),
          servicesApi.listActive(),
        ]);
        if (!active) return;
        setPatient(patientRow);
        setDoctors(doctorRows.filter((row) => row.isActive));
        setServices(serviceRows.filter((row) => row.billingApplicable === 'OP' || row.billingApplicable === 'Both'));
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Unable to load quick bill data'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visitId, stateVisit]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services
      .filter((service) =>
        `${service.serviceName} ${service.serviceCode} ${service.categoryName || ''}`
          .toLowerCase()
          .includes(q),
      );
  }, [search, services]);

  const itemTotals = useMemo(
    () => items.map((item) => ({ item, ...lineMath(item) })),
    [items],
  );

  const subtotal = itemTotals.reduce((sum, row) => sum + row.total, 0);
  const billDiscount = Math.min(100, Math.max(0, Number(billDiscountPercent) || 0));
  const billDiscountAmount = (subtotal * billDiscount) / 100;
  const receivable = Math.max(0, subtotal - billDiscountAmount);
  const receivedValue = Math.max(0, Number(amountReceived) || 0);

  const goBack = () => navigate('/checkin');

  const addService = (service: ServiceMaster) => {
    setItems((current) => [
      ...current,
      {
        key: `${service.id}-${Date.now()}`,
        serviceId: service.id,
        name: service.serviceName,
        qty: String(service.defaultQuantity || 1),
        price: String(service.defaultPrice || 0),
        gstPercent: String(service.taxPercent ?? 0),
        discountPercent: service.allowDiscount
          ? String(service.defaultDiscountPercent ?? 0)
          : '0',
        allowDiscount: service.allowDiscount,
        allowQuantity: service.allowQuantity,
      },
    ]);
    setSearch('');
    setError('');
  };

  const addCustomParticular = () => {
    const name = search.trim();
    if (name.length < 2) {
      setError('Enter at least 2 characters for the particular');
      return;
    }
    setItems((current) => [
      ...current,
      {
        key: `custom-${Date.now()}-${current.length}`,
        serviceId: null,
        name,
        qty: '1',
        price: '',
        gstPercent: '0',
        discountPercent: '0',
        allowDiscount: true,
        allowQuantity: true,
      },
    ]);
    setSearch('');
    setError('');
  };

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const printAfterSave = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'print';
    if (!visit) return;
    if (savedInvoice) return;
    setError('');
    if (!consultantId) {
      setError('Consultant is required');
      return;
    }
    if (!purposeOfVisit.trim()) {
      setError('Purpose of visit is required');
      return;
    }
    if (!items.length) {
      setError('Add at least one particular to the bill');
      return;
    }
    if (items.some((item) => !Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0 || item.price.trim() === '' || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
      setError('Enter a valid quantity and price for every particular');
      return;
    }

    setSaving(true);
    try {
      const invoiceItems = itemTotals.map(({ item, qty, total }) => ({
        chargeId: null as number | null,
        description: item.name,
        quantity: qty,
        unitPrice: qty > 0 ? Number((total / qty).toFixed(2)) : 0,
      }));

      const consultant = doctors.find((row) => String(row.id) === consultantId);
      const noteParts = [
        `Quick OP bill · ${locationName}`,
        consultant ? `Consultant: ${consultant.name}` : null,
        referredBy ? `Ref by: ${referredBy}` : null,
        `Purpose: ${purposeOfVisit}`,
        billDiscount > 0 ? `Bill discount: ${billDiscount}%` : null,
        notes.trim() || null,
      ].filter(Boolean);

      const invoice = await billingApi.createInvoice({
        patientId: visit.patientId,
        dueDate: null,
        notes: noteParts.join(' | '),
        items: invoiceItems,
      });
      setSavedInvoice(invoice);

      if (receivedValue > 0 && invoice.id) {
        await billingApi.recordPayment({
          invoiceId: invoice.id,
          amount: Math.min(receivedValue, receivable || receivedValue),
          method: paymentType as 'cash' | 'card' | 'upi' | 'bank_transfer',
          reference: `Quick bill ${invoice.invoiceNumber}`,
        });
      }

      if (printAfterSave) {
        try {
          const updated = (await billingApi.listInvoices(visit.patientId))
            .find((row) => row.id === invoice.id);
          setSavedInvoice(updated ?? invoice);
        } catch {
          setSavedInvoice(invoice);
        }
        return;
      }

      navigate('/checkin', {
        replace: true,
        state: { notice: `OP bill saved for ${visit.patientName}.` },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save OP bill'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qob-page">
      <header className="qob-header">
        <div>
          <h1 id="qob-title">New OP Bill</h1>
          <p>Create outpatient bill for the checked-in patient</p>
        </div>
        <button type="button" className="qob-close" onClick={goBack} aria-label="Close">
          ×
        </button>
      </header>

      <form className="qob-body" onSubmit={(event) => void onSubmit(event)}>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="qob-patient-bar">
          <div className="qob-patient-chip">
            <span>Name</span>
            <strong>{visit?.patientName || (loading ? '…' : '—')}</strong>
          </div>
          <div className="qob-patient-chip">
            <span>MRD</span>
            <strong>{visit?.patientMrdNumber || '—'}</strong>
          </div>
          <div className="qob-patient-chip">
            <span>Age</span>
            <strong>{loading ? '…' : ageLabel(patient)}</strong>
          </div>
          <div className="qob-patient-chip">
            <span>Gender</span>
            <strong>{loading ? '…' : genderLabel(patient?.gender)}</strong>
          </div>
          <div className="qob-patient-chip">
            <span>Mobile</span>
            <strong>
              {maskMobile(
                visit?.patientMobile ||
                  patient?.mobileNumber ||
                  patient?.contact?.mobileNumber,
              )}
            </strong>
          </div>
        </div>

        <div className="qob-card">
          <div className="qob-meta-grid">
            <Select
              label="Location *"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              options={LOCATION_OPTIONS}
            />
            <Select
              label="Consultant *"
              value={consultantId}
              onChange={(event) => setConsultantId(event.target.value)}
              options={[
                { value: '', label: 'Select a Consultant' },
                ...doctors.map((doctor) => ({
                  value: doctor.id,
                  label: doctor.name,
                })),
              ]}
            />
            <Input
              label="Ref By"
              value={referredBy}
              onChange={(event) => setReferredBy(event.target.value)}
              placeholder="Optional referred by"
            />
            <Select
              label="Purpose of Visit *"
              value={purposeOfVisit}
              onChange={(event) => setPurposeOfVisit(event.target.value)}
              options={
                PURPOSE_OPTIONS.some((option) => option.value === purposeOfVisit)
                  ? PURPOSE_OPTIONS
                  : [
                      ...PURPOSE_OPTIONS,
                      { value: purposeOfVisit, label: purposeOfVisit },
                    ]
              }
            />
          </div>
        </div>

        <div className="qob-card">
          <div className="qob-service-picker">
            <label>
              Search services
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, code, or category" />
            </label>
            <label>
              Select service
              <select value="" onChange={(event) => {
                if (event.target.value === 'custom') {
                  addCustomParticular();
                  return;
                }
                const service = suggestions.find((option) => String(option.id) === event.target.value);
                if (service) addService(service);
              }}>
                <option value="" disabled>
                  {suggestions.length ? 'Choose a particular' : services.length ? 'No matching services' : 'No active services configured'}
                </option>
                {suggestions.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.serviceName} — {money(service.defaultPrice)}{service.description?.includes('placeholder price') ? ' (placeholder)' : ''}
                  </option>
                ))}
                {search.trim().length >= 2 && (
                  <option value="custom">Use "{search.trim()}" as a custom particular (enter price below)</option>
                )}
              </select>
            </label>
          </div>
          {services.some((service) => service.description?.includes('placeholder price')) && (
            <p className="qob-price-notice">Starter service prices of ₹1–₹3 are placeholders. Confirm and update each price before charging a patient.</p>
          )}

          <div className="qob-table-wrap">
            <table className="qob-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Particulars</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>GST(%)</th>
                  <th>Dis(%)</th>
                  <th>Dis(Amt)</th>
                  <th>Tax value</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itemTotals.length === 0 ? (
                  <tr>
                    <td className="qob-table__empty" colSpan={10}>
                      Search and select a service, or type a particular and choose the custom option.
                    </td>
                  </tr>
                ) : (
                  itemTotals.map((row, index) => (
                    <tr key={row.item.key}>
                      <td>{index + 1}</td>
                      <td>{row.item.name}</td>
                      <td>
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={row.item.qty}
                          disabled={!row.item.allowQuantity}
                          onChange={(event) =>
                            updateItem(row.item.key, { qty: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.item.price}
                          onChange={(event) =>
                            updateItem(row.item.key, { price: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={row.item.gstPercent}
                          onChange={(event) =>
                            updateItem(row.item.key, { gstPercent: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={row.item.discountPercent}
                          disabled={!row.item.allowDiscount}
                          onChange={(event) =>
                            updateItem(row.item.key, {
                              discountPercent: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td>{money(row.discountAmount)}</td>
                      <td>{money(row.taxValue)}</td>
                      <td>{money(row.total)}</td>
                      <td>
                        <button
                          type="button"
                          className="qob-remove"
                          onClick={() => removeItem(row.item.key)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="qob-bottom">
          <div className="qob-card">
            <div className="qob-pay-mode" role="radiogroup" aria-label="Payment mode">
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === 'single'}
                  onChange={() => setPaymentMode('single')}
                />
                Single
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === 'multiple'}
                  onChange={() => setPaymentMode('multiple')}
                />
                Multiple
              </label>
            </div>
            <div className="qob-meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Select
                label="Payment Type *"
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value)}
                options={PAYMENT_TYPES}
              />
              <Input
                label="Amount Received *"
                type="number"
                min={0}
                step="0.01"
                value={amountReceived}
                onChange={(event) => setAmountReceived(event.target.value)}
              />
            </div>
            <label className="ui-field" style={{ marginTop: 12 }}>
              <span className="ui-field__label">Additional Note</span>
              <textarea
                className="ui-field__input"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes for this bill"
              />
            </label>
          </div>

          <aside className="qob-summary">
            <div className="qob-summary__row">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="qob-summary__row">
              <span>Discount (%)</span>
              <div className="qob-summary__discount">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={billDiscountPercent}
                  onChange={(event) => setBillDiscountPercent(event.target.value)}
                />
              </div>
            </div>
            <div className="qob-summary__row">
              <span>Discount</span>
              <strong>{money(billDiscountAmount)}</strong>
            </div>
            <div className="qob-summary__row qob-summary__row--accent">
              <span>Amount Receivable</span>
              <strong>{money(receivable)}</strong>
            </div>
            <div className="qob-summary__row">
              <span>Amount Received</span>
              <strong>{money(receivedValue)}</strong>
            </div>
          </aside>
        </div>

        <footer className="qob-footer">
          <Button type="button" variant="secondary" size="sm" onClick={goBack}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving} disabled={loading || !visit || !!savedInvoice}>
            Save Bill
          </Button>
          <Button type="submit" value="print" size="sm" loading={saving} disabled={loading || !visit || !!savedInvoice}>
            Save and Print
          </Button>
        </footer>
      </form>
      {savedInvoice && !saving ? (
        <PatientBillPanel invoice={savedInvoice} onClose={() => navigate('/checkin', {
          replace: true,
          state: { notice: `OP bill saved for ${visit?.patientName ?? 'patient'}.` },
        })} />
      ) : null}
    </div>
  );
}

export default QuickOpBillPage;
