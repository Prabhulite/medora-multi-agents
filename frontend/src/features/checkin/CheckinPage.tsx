import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Doctor, OpCheckinAppointmentOption, Patient, PatientGender } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { doctorsApi } from '../doctors/doctors.api';
import { patientsApi } from '../patients/patients.api';
import { checkinApi } from './checkin.api';
import './CheckinPage.css';

const NATURE_OPTIONS = [
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Review', label: 'Review' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Other', label: 'Other' },
];

const REFERRED_BY_OPTIONS = [
  { value: '', label: 'Select Referred By' },
  { value: 'Self', label: 'Self' },
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Other', label: 'Other' },
];

export function CheckinPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const canRegister = hasPermission(user, 'patients.create');
  const [registrationOpen, setShowRegistration] = useState(searchParams.get('mode') === 'register');
  const showRegistration = canRegister && registrationOpen;
  const [registering, setRegistering] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<OpCheckinAppointmentOption[]>([]);

  const [mrdQuery, setMrdQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [natureOfVisit, setNatureOfVisit] = useState('Consultation');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Consultation');
  const [doctorId, setDoctorId] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [isMlc, setIsMlc] = useState(false);
  const [hadFood, setHadFood] = useState(false);
  const [makeNewCheckin, setMakeNewCheckin] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const doctorOptions = useMemo(
    () => [
      { value: '', label: 'Select a consultant' },
      ...doctors
        .filter((row) => row.isActive)
        .map((row) => ({ value: String(row.id), label: row.name })),
    ],
    [doctors],
  );

  const appointmentOptions = useMemo(
    () => [
      { value: '', label: appointments.length ? 'Select appointment' : 'No open appointments' },
      ...appointments.map((row) => ({
        value: String(row.id),
        label: `${row.appointmentNumber} · ${row.appointmentDate} ${row.appointmentTime} · ${row.doctorName || 'Doctor'}`,
      })),
    ],
    [appointments],
  );

  useEffect(() => {
    let active = true;
    doctorsApi
      .list()
      .then((rows) => {
        if (active) setDoctors(rows);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load consultants'));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = mrdQuery.trim();
    if (patient && query === patient.mrdNumber) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      patientsApi
        .search({ q: query })
        .then((rows) => {
          if (!active) return;
          setSearchResults(rows);
          setSearchOpen(true);
          setActiveResultIndex(0);
        })
        .catch(() => {
          if (!active) return;
          setSearchResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [mrdQuery, patient]);

  useEffect(() => {
    if (!patient) {
      setAppointments([]);
      setAppointmentId('');
      return;
    }
    let active = true;
    checkinApi
      .patientAppointments(patient.id)
      .then((rows) => {
        if (!active) return;
        setAppointments(rows);
      })
      .catch(() => {
        if (active) setAppointments([]);
      });
    return () => {
      active = false;
    };
  }, [patient]);

  const selectPatient = (row: Patient) => {
    setPatient(row);
    setMrdQuery(row.mrdNumber);
    setReferredBy(row.referredBy || '');
    setSearchOpen(false);
    setSearchResults([]);
    setFieldErrors((prev) => ({ ...prev, patient: '' }));
  };

  const registerPatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (registering || saving) return;
    const fields = new FormData(event.currentTarget);
    const firstName = String(fields.get('firstName') ?? '').trim();
    const lastName = String(fields.get('lastName') ?? '').trim();
    const mobileNumber = String(fields.get('mobile') ?? '').trim();
    setError('');
    if (!firstName || !/^[0-9+\-\s()]{8,20}$/.test(mobileNumber)) {
      setError('Enter a first name and a valid mobile number.');
      return;
    }
    setRegistering(true);
    try {
      const matches = await patientsApi.checkDuplicates({ firstName, lastName: lastName || null, mobileNumber });
      if (matches.length) {
        setError('A matching patient already exists. Search by mobile number and select their chart.');
        setMrdQuery(mobileNumber);
        setPatient(null);
        setShowRegistration(false);
        return;
      }
      const created = await patientsApi.create({
        firstName,
        lastName: lastName || null,
        gender: String(fields.get('gender')) as PatientGender,
        ageYears: Number(fields.get('age')),
        ageIsApproximate: true,
        contact: { mobileNumber },
        createVisit: false,
      });
      selectPatient(created);
      setShowRegistration(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to register patient'));
    } finally {
      setRegistering(false);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen || !searchResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((index) => Math.min(index + 1, searchResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = searchResults[activeResultIndex];
      if (row) selectPatient(row);
    } else if (event.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const onAppointmentChange = (value: string) => {
    setAppointmentId(value);
    const selected = appointments.find((row) => String(row.id) === value);
    if (selected?.doctorId) setDoctorId(String(selected.doctorId));
    if (selected?.reason) setPurposeOfVisit(selected.reason);
  };

  const submit = async (openBill = false) => {
    if (saving || registering || showRegistration) return;
    setError('');
    setSuccess('');
    const nextErrors: Record<string, string> = {};
    if (!patient) nextErrors.patient = 'Select a patient';
    if (!doctorId) nextErrors.doctorId = 'Select a consultant';
    if (!natureOfVisit.trim()) nextErrors.natureOfVisit = 'Nature of visit is required';
    if (!purposeOfVisit.trim()) nextErrors.purposeOfVisit = 'Purpose of visit is required';
    if (!makeNewCheckin) nextErrors.makeNewCheckin = 'Enable Make a New Checkin';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const result = await checkinApi.checkin({
        patientId: patient!.id,
        doctorId: Number(doctorId),
        natureOfVisit: natureOfVisit.trim(),
        purposeOfVisit: purposeOfVisit.trim(),
        referredBy: referredBy.trim() || null,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        isMlc,
        hadFood,
        makeNewCheckin: true,
      });
      setSuccess(
        `Checked in ${result.patientName} · OP ${result.opNumber || result.visitNumber} · Token ${result.tokenNumber ?? '—'}`,
      );
      if (openBill) {
        navigate(`/checkin/${result.id}/bill`, { replace: true, state: { visit: result } });
      } else {
        navigate('/checkin', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to check in patient'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checkin-page">
      <PageHeader
        title="New Check-in"
        subtitle="Register walk-in or appointment patients for today's OP visit."
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/checkin')}>
            Back to List
          </Button>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {canRegister ? (
        <section className="checkin-card">
          <Button type="button" size="sm" variant="secondary" disabled={registering || saving}
            aria-expanded={showRegistration} onClick={() => setShowRegistration((open) => !open)}>
            {showRegistration ? 'Close registration' : 'Register new OP patient'}
          </Button>
          {showRegistration ? (
            <form className="checkin-form__grid" onSubmit={(event) => void registerPatient(event)}>
              <Input label="First name" name="firstName" required maxLength={80} />
              <Input label="Last name" name="lastName" maxLength={80} />
              <Input label="Mobile number" name="mobile" type="tel" required maxLength={20} />
              <Select label="Gender" name="gender" required defaultValue="" options={[
                { value: '', label: 'Select gender' },
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
                { value: 'transgender', label: 'Transgender' },
                { value: 'other', label: 'Other' },
              ]} />
              <Input label="Approximate age (years)" name="age" type="number" min={0} max={150} step={1} required />
              <div><Button type="submit" size="sm" disabled={registering}>{registering ? 'Registering…' : 'Register and select'}</Button></div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="checkin-card">
        <h2 className="checkin-card__title">OP Checkin</h2>
        <div className="checkin-form">
          <div className="checkin-form__grid">
            <div className="checkin-patient-search">
              <label className="ui-field">
                <span className="ui-field__label">
                  ID <span style={{ color: '#dc2626' }}>*</span>
                </span>
                <div
                  className={`checkin-patient-search__field${fieldErrors.patient ? ' is-error' : ''}`}
                >
                  <input
                    value={mrdQuery}
                    onChange={(event) => {
                      setMrdQuery(event.target.value);
                      setPatient(null);
                    }}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search MRD, name, mobile"
                    autoComplete="off"
                  />
                  {searching ? <span className="checkin-patient-search__hint">Searching…</span> : null}
                  {searchOpen && searchResults.length ? (
                    <div className="checkin-search-results">
                      {searchResults.map((row, index) => (
                        <button
                          key={row.id}
                          type="button"
                          className={`checkin-search-result${index === activeResultIndex ? ' is-active' : ''}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPatient(row)}
                        >
                          <span>
                            <strong>{row.fullName}</strong>
                            <span>
                              {row.mrdNumber}
                              {row.mobileNumber ? ` · ${row.mobileNumber}` : ''}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>
              {fieldErrors.patient ? (
                <p className="appointment-patient-search__error">{fieldErrors.patient}</p>
              ) : null}
            </div>

            <Input
              label="Mobile"
              value={patient?.mobileNumber || patient?.contact?.mobileNumber || ''}
              readOnly
            />
            <Input label="Name" value={patient?.fullName || ''} readOnly />

            <Select
              label="Nature of Visit"
              value={natureOfVisit}
              onChange={(e) => {
                setNatureOfVisit(e.target.value);
                if (!purposeOfVisit || purposeOfVisit === natureOfVisit) {
                  setPurposeOfVisit(e.target.value);
                }
              }}
              options={NATURE_OPTIONS}
              error={fieldErrors.natureOfVisit}
            />
            <Input
              label="Purpose of Visit"
              value={purposeOfVisit}
              onChange={(e) => setPurposeOfVisit(e.target.value)}
              error={fieldErrors.purposeOfVisit}
            />
            <Select
              label="Consultant"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              options={doctorOptions}
              error={fieldErrors.doctorId}
            />
            <Select
              label="Referred By"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              options={
                referredBy && !REFERRED_BY_OPTIONS.some((item) => item.value === referredBy)
                  ? [...REFERRED_BY_OPTIONS, { value: referredBy, label: referredBy }]
                  : REFERRED_BY_OPTIONS
              }
            />
            <Select
              label="Appointments"
              value={appointmentId}
              onChange={(e) => onAppointmentChange(e.target.value)}
              options={appointmentOptions}
              disabled={!patient}
            />
          </div>

          <div className="checkin-checks">
            <label className="checkin-check">
              <input
                type="checkbox"
                checked={isMlc}
                onChange={(e) => setIsMlc(e.target.checked)}
              />
              MLC
            </label>
            <label className="checkin-check">
              <input
                type="checkbox"
                checked={hadFood}
                onChange={(e) => setHadFood(e.target.checked)}
              />
              Had Food
            </label>
          </div>

          <div className="checkin-status">
            <h3>Checkin Status</h3>
            <label className="checkin-check">
              <input
                type="checkbox"
                checked={makeNewCheckin}
                onChange={(e) => setMakeNewCheckin(e.target.checked)}
              />
              Make a New Checkin
            </label>
            {fieldErrors.makeNewCheckin ? (
              <p className="appointment-patient-search__error">{fieldErrors.makeNewCheckin}</p>
            ) : null}
          </div>

          <div className="checkin-actions">
            <Button onClick={() => void submit()} disabled={saving || showRegistration}>
              {saving ? 'Checking in…' : 'Check in'}
            </Button>
            {hasPermission(user, 'billing.create') ? (
              <Button variant="secondary" onClick={() => void submit(true)} disabled={saving || showRegistration}>
                Check in and open bill
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CheckinPage;
