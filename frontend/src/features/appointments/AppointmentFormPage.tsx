import axios from 'axios';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import type {
  ApiResponse,
  AppointmentSlot,
  AppointmentType,
  AvailableDoctor,
  Department,
  Patient,
} from '../../types';
import { departmentsApi } from '../departments/departments.api';
import { patientsApi } from '../patients/patients.api';
import { appointmentsApi } from './appointments.api';
import './AppointmentsPage.css';
import '../patients/PatientFormPage.css';

const TYPE_OPTIONS = [
  { value: 'new_consultation', label: 'New Consultation' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'review', label: 'Review' },
];

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function genderLabel(gender: Patient['gender'] | null | undefined) {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  if (gender === 'transgender') return 'Transgender';
  if (gender === 'other') return 'Other';
  return '—';
}

export function AppointmentFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const rescheduleId = params.id ? Number(params.id) : null;
  const isReschedule = Number.isFinite(rescheduleId) && Boolean(rescheduleId);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<AvailableDoctor[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);

  const [mrdQuery, setMrdQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [appointmentDate, setAppointmentDate] = useState(todayIso());
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('new_consultation');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(Boolean(isReschedule));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    departmentsApi
      .listActive()
      .then((rows) => {
        if (active) setDepartments(rows);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load departments'));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReschedule || !rescheduleId) return;
    let active = true;
    setLoading(true);
    appointmentsApi
      .getById(rescheduleId)
      .then(async (appointment) => {
        if (!active) return;
        setAppointmentDate(appointment.appointmentDate);
        setDepartmentId(String(appointment.departmentId));
        setDoctorId(String(appointment.doctorId));
        setAppointmentTime(appointment.appointmentTime || '');
        setAppointmentType(appointment.appointmentType);
        setReason(appointment.reason || '');
        setRemarks(appointment.remarks || '');
        const detail = await patientsApi.getById(appointment.patientId);
        if (!active) return;
        setPatient(detail);
        setMrdQuery(detail.mrdNumber);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load appointment'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isReschedule, rescheduleId]);

  useEffect(() => {
    if (!appointmentDate) {
      setDoctors([]);
      return;
    }
    let active = true;
    appointmentsApi
      .availableDoctors(appointmentDate, departmentId ? Number(departmentId) : undefined)
      .then((rows) => {
        if (!active) return;
        setDoctors(rows);
        if (doctorId && !rows.some((row) => String(row.id) === doctorId)) {
          setDoctorId('');
          setAppointmentTime('');
          setSlots([]);
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load available doctors'));
      });
    return () => {
      active = false;
    };
  }, [appointmentDate, departmentId]);

  useEffect(() => {
    if (!appointmentDate || !doctorId) {
      setSlots([]);
      setSlotMessage(null);
      return;
    }
    let active = true;
    appointmentsApi
      .slots(
        Number(doctorId),
        appointmentDate,
        isReschedule && rescheduleId ? rescheduleId : undefined,
      )
      .then((result) => {
        if (!active) return;
        setSlots(result.slots);
        setSlotMessage(result.message);
        if (
          appointmentTime &&
          !result.slots.some((slot) => slot.time === appointmentTime && slot.available)
        ) {
          setAppointmentTime('');
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load time slots'));
      });
    return () => {
      active = false;
    };
  }, [appointmentDate, doctorId]);

  const doctorOptions = useMemo(
    () => [
      { value: '', label: 'Select doctor' },
      ...doctors.map((doctor) => ({
        value: doctor.id,
        label: `${doctor.name} (${doctor.departmentName || 'Dept'})`,
      })),
    ],
    [doctors],
  );

  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'All departments' },
      ...departments.map((department) => ({
        value: department.id,
        label: department.name,
      })),
    ],
    [departments],
  );

  useEffect(() => {
    if (isReschedule) return;

    const q = mrdQuery.trim();
    if (patient && q === patient.mrdNumber) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }

    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      patientsApi
        .search({ q })
        .then((rows) => {
          if (!active) return;
          const matches = rows.slice(0, 20);
          setSearchResults(matches);
          setActiveResultIndex(0);
          setSearchOpen(matches.length > 0);
          setFieldErrors((prev) => ({
            ...prev,
            patient: matches.length ? '' : 'No patient found',
          }));
        })
        .catch((err) => {
          if (!active) return;
          setSearchResults([]);
          setActiveResultIndex(0);
          setSearchOpen(false);
          setError(getErrorMessage(err, 'Patient search failed'));
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isReschedule, mrdQuery, patient]);

  const selectPatient = (row: Patient) => {
    setPatient(row);
    setMrdQuery(row.mrdNumber);
    setSearchResults([]);
    setSearchOpen(false);
    setActiveResultIndex(0);
    setFieldErrors((prev) => ({ ...prev, patient: '' }));
  };

  const onPatientSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen || !searchResults.length) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev + 1) % searchResults.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = searchResults[activeResultIndex] || searchResults[0];
      if (selected) selectPatient(selected);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchOpen(false);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!patient) next.patient = 'Select a patient';
    if (!appointmentDate) next.appointmentDate = 'Date is required';
    if (!departmentId && !doctorId) next.departmentId = 'Select department or doctor';
    if (!doctorId) next.doctorId = 'Doctor is required';
    if (!appointmentTime) next.appointmentTime = 'Time slot is required';
    if (!appointmentType) next.appointmentType = 'Appointment type is required';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const selectedDoctor = doctors.find((row) => String(row.id) === doctorId);
  const resolvedDepartmentId = selectedDoctor
    ? String(selectedDoctor.departmentId)
    : departmentId;

  const save = async () => {
    if (!validate() || !patient) return;
    setSaving(true);
    setError('');
    try {
      if (isReschedule && rescheduleId) {
        await appointmentsApi.updateStatus(rescheduleId, {
          status: 'rescheduled',
          appointmentDate,
          appointmentTime,
          doctorId: Number(doctorId),
          departmentId: Number(resolvedDepartmentId),
          notes: remarks || null,
        });
      } else {
        try {
          await appointmentsApi.create({
            patientId: patient.id,
            doctorId: Number(doctorId),
            departmentId: Number(resolvedDepartmentId),
            appointmentDate,
            appointmentTime,
            appointmentType,
            reason: reason || null,
            remarks: remarks || null,
          });
        } catch (err) {
          if (
            axios.isAxiosError(err) &&
            err.response?.status === 409 &&
            (err.response.data as ApiResponse<unknown>)?.code === 'DUPLICATE_BOOKING_WARNING'
          ) {
            const confirmed = window.confirm(
              'Patient already has an appointment on this date. Book another anyway?',
            );
            if (confirmed) {
              await appointmentsApi.create({
                patientId: patient.id,
                doctorId: Number(doctorId),
                departmentId: Number(resolvedDepartmentId),
                appointmentDate,
                appointmentTime,
                appointmentType,
                reason: reason || null,
                remarks: remarks || null,
                forceDuplicate: true,
              });
            } else {
              return;
            }
          } else {
            throw err;
          }
        }
      }
      navigate('/appointments');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save appointment'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="patient-form-loading">Loading appointment…</div>;
  }

  return (
    <div className="patient-form-page">
      <div className="patient-form-header">
        <div>
          <h1>{isReschedule ? 'Reschedule Appointment' : 'Book Appointment'}</h1>
          <p>
            Select patient, choose an available doctor slot, and save the appointment. Appointment
            number is generated automatically.
          </p>
        </div>
        <Button variant="back" size="sm" onClick={() => navigate('/appointments')}>
          Back
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>1. Select Patient</h2>
          <p>Search by MRD number, name, or mobile. Details auto-fill after selection.</p>
        </div>
        <div className="appointment-form-grid">
          {!isReschedule ? (
            <div className="appointment-full">
              <div className="appointment-patient-search">
                <div
                  className={`appointment-patient-search__field ${fieldErrors.patient ? 'is-error' : ''}`}
                >
                  <span className="appointment-patient-search__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="currentColor"
                        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={mrdQuery}
                    placeholder="Search by MRD, patient name, or phone number"
                    aria-label="Search by MRD, patient name, or phone number"
                    aria-autocomplete="list"
                    aria-expanded={searchOpen}
                    aria-activedescendant={
                      searchOpen && searchResults[activeResultIndex]
                        ? `patient-option-${searchResults[activeResultIndex].id}`
                        : undefined
                    }
                    autoComplete="off"
                    onChange={(e) => {
                      const value = e.target.value;
                      setMrdQuery(value);
                      setActiveResultIndex(0);
                      if (patient && value.trim() !== patient.mrdNumber) {
                        setPatient(null);
                      }
                      setFieldErrors((prev) => ({ ...prev, patient: '' }));
                    }}
                    onKeyDown={onPatientSearchKeyDown}
                    onFocus={() => {
                      if (searchResults.length) setSearchOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setSearchOpen(false), 150);
                    }}
                  />
                  {searching ? (
                    <span className="appointment-patient-search__hint">Searching…</span>
                  ) : null}
                  {searchOpen && searchResults.length ? (
                    <div className="appointment-search-results" role="listbox">
                      {searchResults.map((row, index) => (
                        <button
                          key={row.id}
                          id={`patient-option-${row.id}`}
                          type="button"
                          className={`appointment-search-result ${
                            index === activeResultIndex ? 'is-active' : ''
                          }`}
                          role="option"
                          aria-selected={index === activeResultIndex}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveResultIndex(index)}
                          onClick={() => selectPatient(row)}
                        >
                          <div>
                            <strong>{row.fullName}</strong>
                            <span>
                              {row.mrdNumber} · {genderLabel(row.gender)} · Age{' '}
                              {row.ageYears ?? '—'}
                            </span>
                          </div>
                          <span>{row.mobileNumber || '—'}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {fieldErrors.patient ? (
                  <span className="appointment-patient-search__error">{fieldErrors.patient}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {patient ? (
            <div className="appointment-full">
              <div className="appointment-patient-card">
                <strong>{patient.fullName}</strong>
                <div className="appointment-patient-card__meta">
                  <div>
                    <span>MRD</span>
                    <strong>{patient.mrdNumber}</strong>
                  </div>
                  <div>
                    <span>Age</span>
                    <strong>{patient.ageYears ?? '—'}</strong>
                  </div>
                  <div>
                    <span>Gender</span>
                    <strong>{genderLabel(patient.gender)}</strong>
                  </div>
                  <div>
                    <span>Mobile</span>
                    <strong>{patient.mobileNumber || patient.contact?.mobileNumber || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>2. Date, Department & Doctor</h2>
          <p>Only doctors with schedule availability on the selected date are listed.</p>
        </div>
        <div className="appointment-form-grid">
          <Input
            label="Appointment Date"
            type="date"
            min={todayIso()}
            value={appointmentDate}
            onChange={(e) => {
              setAppointmentDate(e.target.value);
              setAppointmentTime('');
            }}
            error={fieldErrors.appointmentDate}
          />
          <Select
            label="Department"
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setDoctorId('');
              setAppointmentTime('');
            }}
            options={departmentOptions}
            error={fieldErrors.departmentId}
          />
          <Select
            label="Doctor"
            value={doctorId}
            onChange={(e) => {
              setDoctorId(e.target.value);
              setAppointmentTime('');
              const selected = doctors.find((row) => String(row.id) === e.target.value);
              if (selected) setDepartmentId(String(selected.departmentId));
            }}
            options={doctorOptions}
            error={fieldErrors.doctorId}
          />
          <Select
            label="Appointment Type"
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
            options={TYPE_OPTIONS}
            error={fieldErrors.appointmentType}
          />
        </div>
      </section>

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>3. Available Time Slots</h2>
          <p>Booked slots are disabled. Choose an open slot for the selected doctor.</p>
        </div>
        <div className="appointment-form-grid">
          <div className="appointment-full">
            {slotMessage ? <Alert tone="warning">{slotMessage}</Alert> : null}
            {fieldErrors.appointmentTime ? (
              <Alert tone="error">{fieldErrors.appointmentTime}</Alert>
            ) : null}
            {slots.length ? (
              <div className="appointment-slot-grid">
                {slots.map((slot) => {
                  const selected = appointmentTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      className={`appointment-slot ${selected ? 'appointment-slot--selected' : ''}`}
                      disabled={!slot.available}
                      onClick={() => {
                        setAppointmentTime(slot.time);
                        setFieldErrors((prev) => ({ ...prev, appointmentTime: '' }));
                      }}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="patient-form-loading" style={{ padding: '12px 0' }}>
                {doctorId
                  ? 'No slots available for this doctor on the selected date.'
                  : 'Select a doctor to view available slots.'}
              </p>
            )}
          </div>
          <Input
            label="Reason for Visit"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
          />
          <label className="ui-field appointment-full">
            <span className="ui-field__label">Remarks</span>
            <textarea
              className="ui-field__input"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              maxLength={2000}
            />
          </label>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button type="button" variant="secondary" onClick={() => navigate('/appointments')}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : isReschedule ? 'Save Reschedule' : 'Save Appointment'}
        </Button>
      </div>
    </div>
  );
}

export default AppointmentFormPage;
