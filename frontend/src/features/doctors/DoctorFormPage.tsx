import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { DocumentUploadField } from '../../components/ui/DocumentUploadField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type {
  DoctorDesignation,
  DoctorGender,
  DoctorType,
  MasterDocument,
} from '../../types';
import { useAuth } from '../auth/AuthContext';
import { departmentsApi } from '../departments/departments.api';
import { specializationsApi } from '../specializations/specializations.api';
import { doctorsApi } from './doctors.api';
import './DoctorFormPage.css';

type DoctorField =
  | 'name'
  | 'mobileNumber'
  | 'email'
  | 'qualification'
  | 'specializationId'
  | 'departmentId'
  | 'medicalRegistrationNumber'
  | 'photoData';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export function DoctorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const doctorId = id ? Number(id) : null;
  const photoRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<DoctorField>();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<DoctorGender | ''>('');
  const [dob, setDob] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');

  const [qualification, setQualification] = useState('');
  const [specializationId, setSpecializationId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [designation, setDesignation] = useState<DoctorDesignation | ''>('');

  const [newFee, setNewFee] = useState('');
  const [followUpFee, setFollowUpFee] = useState('');
  const [emergencyFee, setEmergencyFee] = useState('');
  const [reviewValidityDays, setReviewValidityDays] = useState('');
  const [consultationDurationMinutes, setConsultationDurationMinutes] = useState('');
  const [walkInAllowed, setWalkInAllowed] = useState(true);
  const [appointmentRequired, setAppointmentRequired] = useState(false);

  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [morningStart, setMorningStart] = useState('09:00');
  const [morningEnd, setMorningEnd] = useState('13:00');
  const [eveningStart, setEveningStart] = useState('17:00');
  const [eveningEnd, setEveningEnd] = useState('20:00');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [maxPatientsPerSession, setMaxPatientsPerSession] = useState('');

  const [consultationRoom, setConsultationRoom] = useState('');
  const [doctorType, setDoctorType] = useState<DoctorType | ''>('in_house');
  const [joiningDate, setJoiningDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [documents, setDocuments] = useState<MasterDocument[]>([]);

  const [departmentOptions, setDepartmentOptions] = useState<
    Array<{ label: string; value: number | string }>
  >([{ label: 'Select department', value: '' }]);
  const [specializationOptions, setSpecializationOptions] = useState<
    Array<{ label: string; value: number | string }>
  >([{ label: 'Select specialization', value: '' }]);

  const canSave = isEdit
    ? hasPermission(user, 'doctors.update')
    : hasPermission(user, 'doctors.create');

  useEffect(() => {
    let active = true;
    Promise.all([departmentsApi.listActive(), specializationsApi.listActive()])
      .then(([departments, specializations]) => {
        if (!active) return;
        setDepartmentOptions([
          { label: 'Select department', value: '' },
          ...departments.map((row) => ({ label: row.name, value: row.id })),
        ]);
        setSpecializationOptions([
          { label: 'Select specialization', value: '' },
          ...specializations.map((row) => ({ label: row.name, value: row.id })),
        ]);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load master data'));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !doctorId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    doctorsApi
      .getById(doctorId)
      .then((doctor) => {
        if (!active) return;
        setName(doctor.name);
        setGender(doctor.gender || '');
        setDob(doctor.dob || '');
        setMobileNumber(doctor.mobileNumber);
        setEmail(doctor.email || '');
        setAddress(doctor.address || '');
        setPhotoData(doctor.photoData || null);
        setPhotoName(doctor.photoData ? 'Current photo' : '');
        setQualification(doctor.qualification);
        setSpecializationId(doctor.specializationId);
        setDepartmentId(doctor.departmentId);
        setMedicalRegistrationNumber(doctor.medicalRegistrationNumber || '');
        setExperienceYears(
          doctor.experienceYears != null ? String(doctor.experienceYears) : '',
        );
        setDesignation(doctor.designation || '');
        setNewFee(
          doctor.fees?.newConsultationFee != null ? String(doctor.fees.newConsultationFee) : '',
        );
        setFollowUpFee(
          doctor.fees?.followUpConsultationFee != null
            ? String(doctor.fees.followUpConsultationFee)
            : '',
        );
        setEmergencyFee(
          doctor.fees?.emergencyConsultationFee != null
            ? String(doctor.fees.emergencyConsultationFee)
            : '',
        );
        setReviewValidityDays(
          doctor.reviewValidityDays != null ? String(doctor.reviewValidityDays) : '',
        );
        setConsultationDurationMinutes(
          doctor.consultationDurationMinutes != null
            ? String(doctor.consultationDurationMinutes)
            : '',
        );
        setWalkInAllowed(Boolean(doctor.walkInAllowed));
        setAppointmentRequired(Boolean(doctor.appointmentRequired));
        setAvailableDays((doctor.schedules || []).map((row) => row.dayOfWeek));
        const first = doctor.schedules?.[0];
        if (first) {
          setMorningStart(first.morningStart || '');
          setMorningEnd(first.morningEnd || '');
          setEveningStart(first.eveningStart || '');
          setEveningEnd(first.eveningEnd || '');
          setBreakStart(first.breakStart || '');
          setBreakEnd(first.breakEnd || '');
          setMaxPatientsPerSession(
            first.maxPatientsPerSession != null ? String(first.maxPatientsPerSession) : '',
          );
        }
        setConsultationRoom(doctor.consultationRoom || '');
        setDoctorType(doctor.doctorType || '');
        setJoiningDate(doctor.joiningDate || '');
        setIsActive(doctor.isActive);
        setDocuments(
          (doctor.documents || []).map((document) => ({
            id: document.id,
            name: document.name,
            fileName: document.fileName,
            mimeType: document.mimeType,
            fileData: document.fileData,
          })),
        );
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load doctor'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctorId, isEdit]);

  const toggleDay = (day: number) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    clearError('photoData');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFieldErrors({ photoData: 'Please upload an image file' });
      return;
    }
    if (file.size > 1_500_000) {
      setFieldErrors({ photoData: 'Photo must be under 1.5 MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(typeof reader.result === 'string' ? reader.result : null);
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const toNumberOrNull = (value: string) => {
    if (!value.trim()) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<DoctorField, string>> = {};
    if (!name.trim()) nextErrors.name = 'Doctor name is required';
    if (!mobileNumber.trim()) nextErrors.mobileNumber = 'Mobile number is required';
    if (!qualification.trim()) nextErrors.qualification = 'Qualification is required';
    if (!specializationId) nextErrors.specializationId = 'Specialization is required';
    if (!departmentId) nextErrors.departmentId = 'Department is required';
    if (!medicalRegistrationNumber.trim()) {
      nextErrors.medicalRegistrationNumber = 'Medical registration number is required';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email';
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = {
      name: name.trim(),
      gender: gender || null,
      dob: dob || null,
      mobileNumber: mobileNumber.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      photoData,
      qualification: qualification.trim(),
      specializationId: Number(specializationId),
      departmentId: Number(departmentId),
      medicalRegistrationNumber: medicalRegistrationNumber.trim(),
      experienceYears: toNumberOrNull(experienceYears),
      designation: designation || null,
      reviewValidityDays: toNumberOrNull(reviewValidityDays),
      consultationDurationMinutes: toNumberOrNull(consultationDurationMinutes),
      walkInAllowed,
      appointmentRequired,
      consultationRoom: consultationRoom.trim() || null,
      doctorType: doctorType || null,
      joiningDate: joiningDate || null,
      isActive,
      fees: {
        newConsultationFee: toNumberOrNull(newFee),
        followUpConsultationFee: toNumberOrNull(followUpFee),
        emergencyConsultationFee: toNumberOrNull(emergencyFee),
      },
      schedule: {
        availableDays,
        morningStart: morningStart || null,
        morningEnd: morningEnd || null,
        eveningStart: eveningStart || null,
        eveningEnd: eveningEnd || null,
        breakStart: breakStart || null,
        breakEnd: breakEnd || null,
        maxPatientsPerSession: toNumberOrNull(maxPatientsPerSession),
      },
      documents,
    };

    setSaving(true);
    try {
      if (isEdit && doctorId) {
        await doctorsApi.update(doctorId, payload);
      } else {
        await doctorsApi.create(payload);
      }
      navigate('/doctors');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save doctor'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="doc-form-loading">Loading doctor…</div>;

  if (error) {
    return (
      <div className="doc-form-page">
        <Alert tone="error">{error}</Alert>
        <div className="doc-form-footer">
          <Button variant="secondary" size="sm" onClick={() => navigate('/doctors')}>
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="doc-form-page" onSubmit={onSubmit}>
      <header className="doc-form-header">
        <div>
          <h1>{isEdit ? 'Edit Doctor' : 'Create Doctor'}</h1>
          <p>Single-hospital doctor master with fees and availability details.</p>
        </div>
      </header>

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <section className="doc-form-card">
        <div className="doc-form-card__head">
          <h2>1. Basic Information</h2>
          <p>Identity and contact details.</p>
        </div>
        <div className="doc-form-grid">
          <Input
            label="Doctor Name *"
            fieldKey="name"
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
            placeholder="Doctor full name"
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(event) => setGender(event.target.value as DoctorGender | '')}
            options={[
              { label: 'Select gender', value: '' },
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <Input label="DOB" type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
          <Input
            label="Mobile Number *"
            fieldKey="mobileNumber"
            value={mobileNumber}
            error={errors.mobileNumber}
            onChange={(event) => {
              setMobileNumber(event.target.value);
              clearError('mobileNumber');
            }}
            placeholder="Mobile number"
          />
          <Input
            label="Email"
            fieldKey="email"
            type="email"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
            placeholder="doctor@example.com"
          />
          <div className="doc-form-grid--full">
            <label className="ui-field">
              <span className="ui-field__label">Address</span>
              <textarea
                className="ui-field__input"
                rows={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Address"
              />
            </label>
          </div>
          <div className={`ui-field ${errors.photoData ? 'ui-field--error' : ''}`} data-field="photoData">
            <span className="ui-field__label">Profile Photo</span>
            <div className="doc-photo__control">
              <div className="doc-photo__thumb">
                {photoData ? <img src={photoData} alt="" /> : <span>+</span>}
              </div>
              <span className={photoName ? 'doc-photo__name' : 'doc-photo__placeholder'}>
                {photoName || 'Upload profile photo'}
              </span>
              <button type="button" className="doc-photo__btn" onClick={() => photoRef.current?.click()}>
                {photoData ? 'Change' : 'Upload'}
              </button>
              {photoData ? (
                <button
                  type="button"
                  className="doc-photo__btn"
                  onClick={() => {
                    setPhotoData(null);
                    setPhotoName('');
                    if (photoRef.current) photoRef.current.value = '';
                  }}
                >
                  Remove
                </button>
              ) : null}
              <input
                ref={photoRef}
                className="doc-photo__file"
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
              />
            </div>
            {errors.photoData ? <span className="ui-field__error">{errors.photoData}</span> : null}
          </div>
        </div>
      </section>

      <section className="doc-form-card">
        <div className="doc-form-card__head">
          <h2>2. Professional Details</h2>
          <p>Qualification and master references for department and specialization.</p>
        </div>
        <div className="doc-form-grid">
          <Input
            label="Qualification *"
            fieldKey="qualification"
            value={qualification}
            error={errors.qualification}
            onChange={(event) => {
              setQualification(event.target.value);
              clearError('qualification');
            }}
            placeholder="e.g. MBBS, MD"
          />
          <Select
            label="Specialization *"
            fieldKey="specializationId"
            value={specializationId}
            error={errors.specializationId}
            onChange={(event) => {
              setSpecializationId(event.target.value ? Number(event.target.value) : '');
              clearError('specializationId');
            }}
            options={specializationOptions}
          />
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
          <Input
            label="Medical Registration Number *"
            fieldKey="medicalRegistrationNumber"
            value={medicalRegistrationNumber}
            error={errors.medicalRegistrationNumber}
            onChange={(event) => {
              setMedicalRegistrationNumber(event.target.value);
              clearError('medicalRegistrationNumber');
            }}
            placeholder="Registration number"
          />
          <Input
            label="Experience (Years)"
            type="number"
            min={0}
            value={experienceYears}
            onChange={(event) => setExperienceYears(event.target.value)}
            placeholder="e.g. 8"
          />
          <Select
            label="Designation"
            value={designation}
            onChange={(event) => setDesignation(event.target.value as DoctorDesignation | '')}
            options={[
              { label: 'Select designation', value: '' },
              { label: 'Consultant', value: 'consultant' },
              { label: 'Senior Consultant', value: 'senior_consultant' },
              { label: 'Visiting Consultant', value: 'visiting_consultant' },
            ]}
          />
        </div>
      </section>

      <section className="doc-form-card">
        <div className="doc-form-card__head">
          <h2>3. Consultation & Fees</h2>
          <p>Fee structure and consultation settings.</p>
        </div>
        <div className="doc-form-grid">
          <Input
            label="New Consultation Fee"
            type="number"
            min={0}
            step="0.01"
            value={newFee}
            onChange={(event) => setNewFee(event.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Follow-up Consultation Fee"
            type="number"
            min={0}
            step="0.01"
            value={followUpFee}
            onChange={(event) => setFollowUpFee(event.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Emergency Consultation Fee"
            type="number"
            min={0}
            step="0.01"
            value={emergencyFee}
            onChange={(event) => setEmergencyFee(event.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Review Validity (Days)"
            type="number"
            min={0}
            value={reviewValidityDays}
            onChange={(event) => setReviewValidityDays(event.target.value)}
            placeholder="e.g. 7"
          />
          <Input
            label="Consultation Duration (Minutes)"
            type="number"
            min={0}
            value={consultationDurationMinutes}
            onChange={(event) => setConsultationDurationMinutes(event.target.value)}
            placeholder="e.g. 15"
          />
          <label className="ui-field">
            <span className="ui-field__label">Walk-in Allowed</span>
            <label className="doc-check">
              <input
                type="checkbox"
                checked={walkInAllowed}
                onChange={(event) => setWalkInAllowed(event.target.checked)}
              />
              Allowed
            </label>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Appointment Required</span>
            <label className="doc-check">
              <input
                type="checkbox"
                checked={appointmentRequired}
                onChange={(event) => setAppointmentRequired(event.target.checked)}
              />
              Required
            </label>
          </label>
        </div>
      </section>

      <section className="doc-form-card">
        <div className="doc-form-card__head">
          <h2>4. Availability & Schedule</h2>
          <p>Weekly available days and session timings.</p>
        </div>
        <div className="doc-form-grid">
          <div className="doc-form-grid--full ui-field">
            <span className="ui-field__label">Available Days</span>
            <div className="doc-days">
              {DAY_OPTIONS.map((day) => {
                const on = availableDays.includes(day.value);
                return (
                  <label key={day.value} className={`doc-day ${on ? 'is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleDay(day.value)}
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </div>
          <Input
            label="Morning Start"
            type="time"
            value={morningStart}
            onChange={(event) => setMorningStart(event.target.value)}
          />
          <Input
            label="Morning End"
            type="time"
            value={morningEnd}
            onChange={(event) => setMorningEnd(event.target.value)}
          />
          <Input
            label="Evening Start"
            type="time"
            value={eveningStart}
            onChange={(event) => setEveningStart(event.target.value)}
          />
          <Input
            label="Evening End"
            type="time"
            value={eveningEnd}
            onChange={(event) => setEveningEnd(event.target.value)}
          />
          <Input
            label="Break Start"
            type="time"
            value={breakStart}
            onChange={(event) => setBreakStart(event.target.value)}
          />
          <Input
            label="Break End"
            type="time"
            value={breakEnd}
            onChange={(event) => setBreakEnd(event.target.value)}
          />
          <Input
            label="Maximum Patients per Session"
            type="number"
            min={0}
            value={maxPatientsPerSession}
            onChange={(event) => setMaxPatientsPerSession(event.target.value)}
            placeholder="e.g. 20"
          />
        </div>
      </section>

      <section className="doc-form-card">
        <div className="doc-form-card__head">
          <h2>5. Other Details</h2>
          <p>Room, doctor type, joining date, and status.</p>
        </div>
        <div className="doc-form-grid">
          <Input
            label="Consultation Room"
            value={consultationRoom}
            onChange={(event) => setConsultationRoom(event.target.value)}
            placeholder="e.g. Room 12"
          />
          <Select
            label="Doctor Type"
            value={doctorType}
            onChange={(event) => setDoctorType(event.target.value as DoctorType | '')}
            options={[
              { label: 'Select type', value: '' },
              { label: 'In-house', value: 'in_house' },
              { label: 'Visiting', value: 'visiting' },
            ]}
          />
          <Input
            label="Joining Date"
            type="date"
            value={joiningDate}
            onChange={(event) => setJoiningDate(event.target.value)}
          />
          <Select
            label="Status"
            value={isActive ? 'active' : 'inactive'}
            onChange={(event) => setIsActive(event.target.value === 'active')}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </div>
      </section>

      <section className="doc-form-card">
        <div className="doc-form-card__head">
          <h2>6. Document Upload</h2>
          <p>Type a document name and upload certificates or related files.</p>
        </div>
        <div className="doc-form-grid">
          <div className="doc-form-grid--full">
            <DocumentUploadField
              documents={documents}
              onChange={setDocuments}
              disabled={!canSave}
            />
          </div>
        </div>
      </section>

      <footer className="doc-form-footer">
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/doctors')}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          {isEdit ? 'Save Doctor' : 'Create Doctor'}
        </Button>
      </footer>
    </form>
  );
}

export default DoctorFormPage;
