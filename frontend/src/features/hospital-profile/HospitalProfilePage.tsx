import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { DocumentUploadField } from '../../components/ui/DocumentUploadField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { HospitalType, MasterDocument } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { hospitalProfileApi } from './hospital-profile.api';
import './HospitalProfilePage.css';

type HospitalField = 'hospitalName' | 'hospitalCode' | 'email' | 'logoData';

const HOSPITAL_TYPE_OPTIONS = [
  { label: 'Select hospital type', value: '' },
  { label: 'Multi-Speciality', value: 'multi_speciality' },
  { label: 'IVF', value: 'ivf' },
  { label: 'General', value: 'general' },
  { label: 'Clinic', value: 'clinic' },
];

const DATE_FORMAT_OPTIONS = [
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
];

const TIME_ZONE_OPTIONS = [
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Dubai', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
];

const CURRENCY_OPTIONS = [
  { label: 'INR', value: 'INR' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'AED', value: 'AED' },
];

export function HospitalProfilePage() {
  const { user } = useAuth();
  const canSave = hasPermission(user, 'hospital_profile.update');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoName, setLogoName] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } =
    useFieldErrors<HospitalField>();

  const [hospitalName, setHospitalName] = useState('');
  const [hospitalCode, setHospitalCode] = useState('');
  const [hospitalType, setHospitalType] = useState<HospitalType | ''>('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [logoData, setLogoData] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [financialYear, setFinancialYear] = useState('');
  const [documents, setDocuments] = useState<MasterDocument[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    hospitalProfileApi
      .get()
      .then((profile) => {
        if (!active || !profile) return;
        setHospitalName(profile.hospitalName || '');
        setHospitalCode(profile.hospitalCode || '');
        setHospitalType(profile.hospitalType || '');
        setRegistrationNumber(profile.registrationNumber || '');
        setGstNumber(profile.gstNumber || '');
        setContactNumber(profile.contactNumber || '');
        setEmail(profile.email || '');
        setAddress(profile.address || '');
        setCountry(profile.country || 'India');
        setState(profile.state || '');
        setDistrict(profile.district || '');
        setCity(profile.city || '');
        setPincode(profile.pincode || '');
        setLogoData(profile.logoData);
        setLogoName(profile.logoData ? 'Current logo' : '');
        setWebsite(profile.website || '');
        setTimeZone(profile.timeZone || 'Asia/Kolkata');
        setCurrency(profile.currency || 'INR');
        setDateFormat(profile.dateFormat || 'DD/MM/YYYY');
        setFinancialYear(profile.financialYear || '');
        setDocuments(
          (profile.documents || []).map((document) => ({
            id: document.id,
            name: document.name,
            fileName: document.fileName,
            mimeType: document.mimeType,
            fileData: document.fileData,
          })),
        );
      })
      .catch((err) => {
        if (active) setLoadError(getErrorMessage(err, 'Failed to load hospital profile'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const onLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    clearError('logoData');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFieldErrors({ logoData: 'Please upload an image file' });
      return;
    }
    if (file.size > 1_500_000) {
      setFieldErrors({ logoData: 'Logo must be under 1.5 MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoData(typeof reader.result === 'string' ? reader.result : null);
      setLogoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoData(null);
    setLogoName('');
    clearError('logoData');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccess('');
    clearAllErrors();

    const nextErrors: Partial<Record<HospitalField, string>> = {};
    if (!hospitalName.trim()) nextErrors.hospitalName = 'Hospital name is required';
    if (!hospitalCode.trim()) nextErrors.hospitalCode = 'Hospital code is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email';
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await hospitalProfileApi.upsert({
        hospitalName: hospitalName.trim(),
        hospitalCode: hospitalCode.trim(),
        hospitalType: hospitalType || null,
        registrationNumber: registrationNumber.trim() || null,
        gstNumber: gstNumber.trim() || null,
        contactNumber: contactNumber.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        country: country.trim() || null,
        state: state.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        logoData,
        website: website.trim() || null,
        timeZone: timeZone || null,
        currency: currency || 'INR',
        dateFormat: dateFormat || null,
        financialYear: financialYear.trim() || null,
        documents,
      });
      setSuccess('Hospital profile saved successfully');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save hospital profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="hp-loading">Loading hospital profile…</div>;
  }

  if (loadError) {
    return (
      <div className="hp-page">
        <Alert tone="error">{loadError}</Alert>
      </div>
    );
  }

  return (
    <form className="hp-page" onSubmit={onSubmit}>
      <header className="hp-header">
        <div>
          <h1>Hospital Profile</h1>
          <p>Maintain hospital identity, contact, location, and system preferences.</p>
        </div>
      </header>

      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <section className="hp-card">
        <div className="hp-card__head">
          <h2>1. Hospital Basic Details</h2>
          <p>Primary hospital identity and registration information.</p>
        </div>
        <div className="hp-grid">
          <Input
            label="Hospital Name *"
            fieldKey="hospitalName"
            value={hospitalName}
            error={errors.hospitalName}
            onChange={(event) => {
              setHospitalName(event.target.value);
              clearError('hospitalName');
            }}
            placeholder="e.g. Medora Multispeciality Hospital"
          />
          <Input
            label="Hospital Code *"
            fieldKey="hospitalCode"
            value={hospitalCode}
            error={errors.hospitalCode}
            onChange={(event) => {
              setHospitalCode(event.target.value);
              clearError('hospitalCode');
            }}
            placeholder="e.g. MEDORA"
          />
          <Select
            label="Hospital Type"
            value={hospitalType}
            onChange={(event) => setHospitalType(event.target.value as HospitalType | '')}
            options={HOSPITAL_TYPE_OPTIONS}
          />
          <Input
            label="Registration Number"
            value={registrationNumber}
            onChange={(event) => setRegistrationNumber(event.target.value)}
            placeholder="Registration / license number"
          />
          <Input
            label="GST Number"
            value={gstNumber}
            onChange={(event) => setGstNumber(event.target.value)}
            placeholder="e.g. 22AAAAA0000A1Z5"
          />
          <Input
            label="Contact Number"
            value={contactNumber}
            onChange={(event) => setContactNumber(event.target.value)}
            placeholder="Primary contact number"
          />
          <Input
            label="Email ID"
            fieldKey="email"
            type="email"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
            placeholder="hospital@example.com"
          />
          <div className="hp-grid--full">
            <label className="ui-field">
              <span className="ui-field__label">Address</span>
              <textarea
                className="ui-field__input"
                rows={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Full hospital address"
              />
            </label>
          </div>
          <Input
            label="Country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Country"
          />
          <Input
            label="State"
            value={state}
            onChange={(event) => setState(event.target.value)}
            placeholder="State"
          />
          <Input
            label="District"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            placeholder="District"
          />
          <Input
            label="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City"
          />
          <Input
            label="Pincode"
            value={pincode}
            onChange={(event) => setPincode(event.target.value)}
            placeholder="Pincode"
          />
          <div
            className={`ui-field hp-logo ${errors.logoData ? 'ui-field--error' : ''}`}
            data-field="logoData"
          >
            <span className="ui-field__label">Hospital Logo</span>
            <div className="hp-logo__control">
              <div className="hp-logo__thumb" aria-hidden="true">
                {logoData ? <img src={logoData} alt="" /> : <span>+</span>}
              </div>
              <span className={logoName ? 'hp-logo__name' : 'hp-logo__placeholder'}>
                {logoName || 'Upload hospital logo (PNG/JPG)'}
              </span>
              <div className="hp-logo__actions">
                <button
                  type="button"
                  className="hp-logo__btn"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoData ? 'Change' : 'Upload'}
                </button>
                {logoData ? (
                  <button type="button" className="hp-logo__btn hp-logo__btn--ghost" onClick={clearLogo}>
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                ref={logoInputRef}
                className="hp-logo__file"
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            {errors.logoData ? <span className="ui-field__error">{errors.logoData}</span> : null}
          </div>
        </div>
      </section>

      <section className="hp-card">
        <div className="hp-card__head">
          <h2>2. System Preferences</h2>
          <p>Website and regional settings used across the application.</p>
        </div>
        <div className="hp-grid">
          <Input
            label="Hospital Website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://www.example.com"
          />
          <Select
            label="Time Zone"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            options={TIME_ZONE_OPTIONS}
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            options={CURRENCY_OPTIONS}
          />
          <Select
            label="Date Format"
            value={dateFormat}
            onChange={(event) => setDateFormat(event.target.value)}
            options={DATE_FORMAT_OPTIONS}
          />
          <Input
            label="Financial Year"
            value={financialYear}
            onChange={(event) => setFinancialYear(event.target.value)}
            placeholder="e.g. 2025-26"
          />
        </div>
      </section>

      <section className="hp-card">
        <div className="hp-card__head">
          <h2>3. Document Upload</h2>
          <p>Type a document name and upload the related hospital file.</p>
        </div>
        <div className="hp-grid">
          <div className="hp-grid--full">
            <DocumentUploadField
              documents={documents}
              onChange={setDocuments}
              disabled={!canSave}
            />
          </div>
        </div>
      </section>

      <footer className="hp-footer">
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          Save Hospital Profile
        </Button>
      </footer>
    </form>
  );
}

export default HospitalProfilePage;
