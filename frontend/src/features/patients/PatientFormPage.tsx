import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DatePicker } from '../../components/ui/DatePicker';
import { PageLoader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { getErrorMessage } from '../../lib/api';
import { fileToCompressedDataUrl } from '../../lib/imageCompress';
import { hasPermission } from '../../lib/permissions';
import type {
  EmergencyRelationship,
  IdProofType,
  MasterDocument,
  Patient,
  PatientCategory,
  PatientGender,
  UpsertPatientPayload,
} from '../../types';
import { useAuth } from '../auth/AuthContext';
import { doctorsApi } from '../doctors/doctors.api';
import {
  COUNTRY_OPTIONS,
  districtOptionsForState,
  INDIA_STATE_OPTIONS,
} from './locationData';
import { patientsApi } from './patients.api';
import './PatientFormPage.css';

type PatientField =
  | 'firstName'
  | 'gender'
  | 'dateOfBirth'
  | 'ageYears'
  | 'mobileNumber'
  | 'email'
  | 'addressLine1'
  | 'country'
  | 'state'
  | 'district'
  | 'city'
  | 'pincode'
  | 'idProofNumber'
  | 'photoData';

function calcAgeFromDob(dob: string): number | null {
  if (!dob) return null;
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
  return age < 0 ? 0 : age;
}

export function PatientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const patientId = id ? Number(id) : null;
  const photoRef = useRef<HTMLInputElement>(null);
  const idDocRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<PatientField>();

  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<PatientGender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [ageIsApproximate, setAgeIsApproximate] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [religion, setReligion] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [photoDirty, setPhotoDirty] = useState(false);
  const [photoViewOpen, setPhotoViewOpen] = useState(false);

  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  const [idProofType, setIdProofType] = useState<IdProofType | ''>('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [idProofDocument, setIdProofDocument] = useState<MasterDocument | null>(null);
  const [idProofDocumentDirty, setIdProofDocumentDirty] = useState(false);
  const [abhaNumber, setAbhaNumber] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');

  const [contactPersonName, setContactPersonName] = useState('');
  const [relationship, setRelationship] = useState<EmergencyRelationship | ''>('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [emergencyAlternateNumber, setEmergencyAlternateNumber] = useState('');
  const [emergencyAddress, setEmergencyAddress] = useState('');

  const [occupation, setOccupation] = useState('');
  const [patientCategory, setPatientCategory] = useState<PatientCategory | ''>('general');
  const [referredBy, setReferredBy] = useState('');
  const [registrationSourceId, setRegistrationSourceId] = useState<number | ''>('');
  const [registrationSources, setRegistrationSources] = useState<Array<{ id: number; name: string; isActive: boolean }>>([]);
  const [referralDoctorId, setReferralDoctorId] = useState<number | ''>('');
  const [preferredLanguage, setPreferredLanguage] = useState('Tamil');
  const [specialRemarks, setSpecialRemarks] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [doctorOptions, setDoctorOptions] = useState<
    Array<{ label: string; value: number | string }>
  >([{ label: 'Select referral doctor', value: '' }]);

  const canCreate = hasPermission(user, 'patients.create');
  const canUpdate = hasPermission(user, 'patients.update');
  const canSave = isEdit ? canUpdate : canCreate;

  const districtOptions = useMemo(
    () => [
      { label: 'Select district', value: '' },
      ...districtOptionsForState(state),
    ],
    [state],
  );

  const displayPatientName = useMemo(() => {
    const name = [title, firstName, middleName, lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
    return name || 'Patient photo';
  }, [title, firstName, middleName, lastName]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [doctors, sources] = await Promise.all([doctorsApi.consultants(), patientsApi.registrationSources()]);
        setRegistrationSources(sources);
        setDoctorOptions([
          { label: 'Select referral doctor', value: '' },
          ...doctors
            .filter((doctor) => doctor.isActive)
            .map((doctor) => ({
              label: `${doctor.name} (${doctor.doctorCode})`,
              value: doctor.id,
            })),
        ]);

        if (isEdit && patientId) {
          const patient = await patientsApi.getById(patientId);
          setTitle(patient.title || '');
          setFirstName(patient.firstName || '');
          setMiddleName(patient.middleName || '');
          setLastName(patient.lastName || '');
          setGender(patient.gender);
          setDateOfBirth(patient.dateOfBirth || '');
          setAgeYears(patient.ageYears != null ? String(patient.ageYears) : '');
          setAgeIsApproximate(patient.ageIsApproximate);
          setBloodGroup(patient.bloodGroup || '');
          setMaritalStatus(patient.maritalStatus || '');
          setNationality(patient.nationality || 'Indian');
          setReligion(patient.religion || '');
          setPhotoData(patient.photoData || null);
          setPhotoName(patient.photoData ? 'Existing photo' : '');
          setPhotoDirty(false);
          setMobileNumber(patient.contact?.mobileNumber || '');
          setAlternateMobile(patient.contact?.alternateMobile || '');
          setEmail(patient.contact?.email || '');
          setAddressLine1(patient.address?.addressLine1 || '');
          setAddressLine2(patient.address?.addressLine2 || '');
          setCountry(patient.address?.country || 'India');
          setState(patient.address?.state || '');
          setDistrict(patient.address?.district || '');
          setCity(patient.address?.city || '');
          setPincode(patient.address?.pincode || '');
          setIdProofType(patient.identification?.idProofType || '');
          setIdProofNumber(patient.identification?.idProofNumber || '');
          if (patient.identification?.idProofDocumentData) {
            setIdProofDocument({
              name: patient.identification.idProofDocumentName || 'ID Proof',
              fileName: patient.identification.idProofDocumentFileName || 'id-proof',
              mimeType: patient.identification.idProofDocumentMimeType,
              fileData: patient.identification.idProofDocumentData,
            });
          } else {
            setIdProofDocument(null);
          }
          setIdProofDocumentDirty(false);
          setAbhaNumber(patient.identification?.abhaNumber || '');
          setAbhaAddress(patient.identification?.abhaAddress || '');
          setContactPersonName(patient.emergencyContact?.contactPersonName || '');
          setRelationship(patient.emergencyContact?.relationship || '');
          setEmergencyContactNumber(patient.emergencyContact?.contactNumber || '');
          setEmergencyAlternateNumber(patient.emergencyContact?.alternateNumber || '');
          setEmergencyAddress(patient.emergencyContact?.address || '');
          setOccupation(patient.occupation || '');
          setPatientCategory(patient.patientCategory || 'general');
          setReferredBy(patient.referredBy || '');
          setRegistrationSourceId(patient.registrationSourceId || '');
          setReferralDoctorId(patient.referralDoctorId || '');
          setPreferredLanguage(patient.preferredLanguage || 'Tamil');
          setSpecialRemarks(patient.specialRemarks || '');
          setIsActive(patient.isActive);
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load patient form'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isEdit, patientId]);

  const onDobChange = (value: string) => {
    setDateOfBirth(value);
    clearError('dateOfBirth');
    if (value) {
      const age = calcAgeFromDob(value);
      setAgeYears(age != null ? String(age) : '');
      setAgeIsApproximate(false);
      clearError('ageYears');
    }
  };

  const onAgeChange = (value: string) => {
    setAgeYears(value);
    clearError('ageYears');
    if (!dateOfBirth) {
      setAgeIsApproximate(true);
    }
  };

  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await fileToCompressedDataUrl(file, { maxEdge: 720, quality: 0.7 });
      setPhotoData(compressed.dataUrl);
      setPhotoName(compressed.fileName);
      setPhotoDirty(true);
      clearError('photoData');
    } catch {
      setFieldErrors({ photoData: 'Unable to read photo' });
    }
  };

  const onIdDocChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await fileToCompressedDataUrl(file, { maxEdge: 1400, quality: 0.75 });
      setIdProofDocument({
        name: 'ID Proof',
        fileName: compressed.fileName,
        mimeType: compressed.mimeType,
        fileData: compressed.dataUrl,
      });
      setIdProofDocumentDirty(true);
    } catch {
      setFormError('Unable to read ID proof document');
    }
  };

  const validateClient = (): boolean => {
    const next: Partial<Record<PatientField, string>> = {};
    if (!firstName.trim()) next.firstName = 'First name is required';
    if (!gender) next.gender = 'Gender is required';
    if (!dateOfBirth && !ageYears.trim()) {
      next.dateOfBirth = 'Date of birth or approximate age is required';
      next.ageYears = 'Enter DOB or approximate age';
    }
    if (!mobileNumber.trim()) next.mobileNumber = 'Mobile number is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email';
    }
    if (!addressLine1.trim()) next.addressLine1 = 'Address is required';
    if (!country.trim()) next.country = 'Country is required';
    if (!state.trim()) next.state = 'State is required';
    if (!district.trim()) next.district = 'District is required';
    if (!city.trim()) next.city = 'City / Town is required';
    if (!/^[0-9]{4,12}$/.test(pincode.trim())) next.pincode = 'Enter a valid pincode';
    if (idProofType === 'aadhaar' && idProofNumber.trim()) {
      const digits = idProofNumber.replace(/\D/g, '');
      if (digits.length !== 12) {
        next.idProofNumber = 'Aadhaar number must be 12 digits';
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): UpsertPatientPayload => {
    const payload: UpsertPatientPayload = {
      title: title || null,
      firstName: firstName.trim(),
      middleName: middleName.trim() || null,
      lastName: lastName.trim() || null,
      gender: gender as PatientGender,
      dateOfBirth: dateOfBirth || null,
      ageYears: ageYears.trim() ? Number(ageYears) : null,
      ageIsApproximate: ageIsApproximate || !dateOfBirth,
      bloodGroup: bloodGroup || null,
      maritalStatus: maritalStatus || null,
      nationality: nationality || null,
      religion: religion || null,
      occupation: occupation || null,
      patientCategory: (patientCategory || null) as PatientCategory | null,
      referredBy: referredBy || null,
      registrationSourceId: registrationSourceId === '' ? null : registrationSourceId,
      referralDoctorId: referralDoctorId === '' ? null : Number(referralDoctorId),
      preferredLanguage: preferredLanguage || null,
      specialRemarks: specialRemarks.trim() || null,
      isActive,
      createVisit: !isEdit,
      contact: {
        mobileNumber: mobileNumber.trim(),
        alternateMobile: alternateMobile.trim() || null,
        email: email.trim() || null,
      },
      address: {
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        country: country.trim(),
        state: state.trim(),
        district: district.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      },
      identification: {
        idProofType: (idProofType || null) as IdProofType | null,
        idProofNumber: idProofNumber.trim() || null,
        abhaNumber: abhaNumber.trim() || null,
        abhaAddress: abhaAddress.trim() || null,
      },
      emergencyContact: {
        contactPersonName: contactPersonName.trim() || null,
        relationship: (relationship || null) as EmergencyRelationship | null,
        contactNumber: emergencyContactNumber.trim() || null,
        alternateNumber: emergencyAlternateNumber.trim() || null,
        address: emergencyAddress.trim() || null,
      },
    };

    if (!isEdit || photoDirty) {
      payload.photoData = photoData || null;
    }
    if ((!isEdit || idProofDocumentDirty) && idProofDocument) {
      payload.identification = {
        ...payload.identification,
        idProofDocument,
      };
    }

    return payload;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    clearAllErrors();
    setFormError('');
    setDuplicates([]);
    if (!validateClient()) {
      return;
    }

    setSaving(true);
    try {
      const dupes = await patientsApi.checkDuplicates({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        mobileNumber: mobileNumber.trim(),
        dateOfBirth: dateOfBirth || null,
        idProofType: idProofType || null,
        idProofNumber: idProofNumber.trim() || null,
        excludePatientId: patientId || undefined,
      });

      if (dupes.length && !isEdit) {
        setDuplicates(dupes);
        const proceed = window.confirm(
          `${dupes.length} possible duplicate patient(s) found. Continue with new registration?`,
        );
        if (!proceed) {
          setSaving(false);
          return;
        }
      }

      const payload = buildPayload();
      if (isEdit && patientId) {
        await patientsApi.update(patientId, payload);
        navigate('/patients');
      } else {
        const created = await patientsApi.create(payload);
        sessionStorage.setItem(
          'medora.patient.registration.receipt',
          JSON.stringify(created),
        );
        navigate('/patients');
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save patient'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading patient form…" />;
  }

  if (error) {
    return (
      <div className="patient-form-page">
        <Alert tone="error">{error}</Alert>
        <Button variant="back" onClick={() => navigate('/patients')}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <form className="patient-form-page" onSubmit={onSubmit} noValidate>
      <div className="patient-form-header">
        <div>
          <h1>{isEdit ? 'Edit Patient' : 'Patient Registration'}</h1>
          <p>
            Capture patient master details across basic, contact, identification, emergency, and
            additional sections.
          </p>
        </div>
        <Button type="button" variant="back" size="sm" onClick={() => navigate('/patients')}>
          Back
        </Button>
      </div>

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {duplicates.length ? (
        <Alert tone="warning">
          Possible duplicates: {duplicates.map((row) => `${row.fullName} (${row.mrdNumber})`).join(', ')}
        </Alert>
      ) : null}

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>A. Patient Basic Information</h2>
          <p>Identity and demographics. MRD is generated by the backend on save.</p>
        </div>
        <div className="patient-form-grid">
          <div className="ui-field">
            <label className="ui-field__label">Patient Photo</label>
            <div className="patient-photo__control">
              {photoData ? (
                <button
                  type="button"
                  className="patient-photo-strip__thumb patient-photo-strip__thumb--sm"
                  onClick={() => setPhotoViewOpen(true)}
                  title="View photo"
                >
                  <img src={photoData} alt={displayPatientName} />
                </button>
              ) : (
                <div className="patient-photo-strip__placeholder patient-photo-strip__placeholder--sm">
                  No photo
                </div>
              )}
              <button
                type="button"
                className="patient-photo__btn"
                onClick={() => photoRef.current?.click()}
              >
                {photoName || 'Upload photo'}
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => void onPhotoChange(event)}
              />
            </div>
          </div>
          <Select
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            options={[
              { label: 'Select', value: '' },
              { label: 'Mr', value: 'Mr' },
              { label: 'Mrs', value: 'Mrs' },
              { label: 'Ms', value: 'Ms' },
              { label: 'Master', value: 'Master' },
              { label: 'Dr', value: 'Dr' },
            ]}
          />
          <Input
            label="First Name *"
            value={firstName}
            fieldKey="firstName"
            error={errors.firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
              clearError('firstName');
            }}
          />
          <Input
            label="Middle Name"
            value={middleName}
            onChange={(event) => setMiddleName(event.target.value)}
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
          <Select
            label="Gender *"
            value={gender}
            fieldKey="gender"
            error={errors.gender}
            onChange={(event) => {
              setGender(event.target.value as PatientGender | '');
              clearError('gender');
            }}
            options={[
              { label: 'Select gender', value: '' },
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Transgender', value: 'transgender' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <DatePicker
            label="Date of Birth *"
            value={dateOfBirth}
            fieldKey="dateOfBirth"
            error={errors.dateOfBirth}
            onChange={onDobChange}
          />
          <Input
            label={ageIsApproximate || !dateOfBirth ? 'Age (Approx) *' : 'Age *'}
            type="number"
            min={0}
            max={150}
            value={ageYears}
            fieldKey="ageYears"
            error={errors.ageYears}
            onChange={(event) => onAgeChange(event.target.value)}
          />
          <Select
            label="Blood Group"
            value={bloodGroup}
            onChange={(event) => setBloodGroup(event.target.value)}
            options={[
              { label: 'Select', value: '' },
              { label: 'A+', value: 'A+' },
              { label: 'A-', value: 'A-' },
              { label: 'B+', value: 'B+' },
              { label: 'B-', value: 'B-' },
              { label: 'AB+', value: 'AB+' },
              { label: 'AB-', value: 'AB-' },
              { label: 'O+', value: 'O+' },
              { label: 'O-', value: 'O-' },
            ]}
          />
          <Select
            label="Marital Status"
            value={maritalStatus}
            onChange={(event) => setMaritalStatus(event.target.value)}
            options={[
              { label: 'Select', value: '' },
              { label: 'Single', value: 'single' },
              { label: 'Married', value: 'married' },
              { label: 'Widowed', value: 'widowed' },
              { label: 'Divorced', value: 'divorced' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <Input
            label="Nationality"
            value={nationality}
            onChange={(event) => setNationality(event.target.value)}
          />
          <Select
            label="Religion"
            value={religion}
            onChange={(event) => setReligion(event.target.value)}
            options={[
              { label: 'Select', value: '' },
              { label: 'Hindu', value: 'Hindu' },
              { label: 'Muslim', value: 'Muslim' },
              { label: 'Christian', value: 'Christian' },
              { label: 'Sikh', value: 'Sikh' },
              { label: 'Buddhist', value: 'Buddhist' },
              { label: 'Jain', value: 'Jain' },
              { label: 'Other', value: 'Other' },
            ]}
          />
        </div>
      </section>

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>B. Contact Information</h2>
          <p>Primary phone and cascading address (Country → State → District).</p>
        </div>
        <div className="patient-form-grid">
          <Input
            label="Mobile Number *"
            value={mobileNumber}
            fieldKey="mobileNumber"
            error={errors.mobileNumber}
            onChange={(event) => {
              setMobileNumber(event.target.value);
              clearError('mobileNumber');
            }}
          />
          <Input
            label="Alternate Mobile"
            value={alternateMobile}
            onChange={(event) => setAlternateMobile(event.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            fieldKey="email"
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
          />
          <div className="patient-form-grid--full">
            <Input
              label="Address Line 1 *"
              value={addressLine1}
              fieldKey="addressLine1"
              error={errors.addressLine1}
              onChange={(event) => {
                setAddressLine1(event.target.value);
                clearError('addressLine1');
              }}
            />
          </div>
          <div className="patient-form-grid--full">
            <Input
              label="Address Line 2"
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
            />
          </div>
          <Select
            label="Country *"
            value={country}
            fieldKey="country"
            error={errors.country}
            onChange={(event) => {
              setCountry(event.target.value);
              clearError('country');
            }}
            options={[{ label: 'Select country', value: '' }, ...COUNTRY_OPTIONS]}
          />
          <Select
            label="State *"
            value={state}
            fieldKey="state"
            error={errors.state}
            onChange={(event) => {
              setState(event.target.value);
              setDistrict('');
              clearError('state');
              clearError('district');
            }}
            options={[{ label: 'Select state', value: '' }, ...INDIA_STATE_OPTIONS]}
          />
          <Select
            label="District *"
            value={district}
            fieldKey="district"
            error={errors.district}
            onChange={(event) => {
              setDistrict(event.target.value);
              clearError('district');
            }}
            options={districtOptions}
          />
          <Input
            label="City / Town *"
            value={city}
            fieldKey="city"
            error={errors.city}
            onChange={(event) => {
              setCity(event.target.value);
              clearError('city');
            }}
          />
          <Input
            label="Pincode *"
            value={pincode}
            fieldKey="pincode"
            error={errors.pincode}
            onChange={(event) => {
              setPincode(event.target.value);
              clearError('pincode');
            }}
          />
        </div>
      </section>

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>C. Identification Details</h2>
          <p>ID proof and ABHA details for the patient record.</p>
        </div>
        <div className="patient-form-grid">
          <Select
            label="ID Proof Type"
            value={idProofType}
            onChange={(event) => {
              setIdProofType(event.target.value as IdProofType | '');
              setIdProofNumber('');
              clearError('idProofNumber');
            }}
            options={[
              { label: 'Select', value: '' },
              { label: 'Aadhaar', value: 'aadhaar' },
              { label: 'Passport', value: 'passport' },
              { label: 'Voter ID', value: 'voter_id' },
              { label: 'Driving Licence', value: 'driving_licence' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <Input
            label={idProofType === 'aadhaar' ? 'Aadhaar Number' : 'ID Proof Number'}
            value={idProofNumber}
            fieldKey="idProofNumber"
            error={errors.idProofNumber}
            maxLength={idProofType === 'aadhaar' ? 12 : 80}
            inputMode={idProofType === 'aadhaar' ? 'numeric' : undefined}
            onChange={(event) => {
              const nextValue =
                idProofType === 'aadhaar'
                  ? event.target.value.replace(/\D/g, '').slice(0, 12)
                  : event.target.value;
              setIdProofNumber(nextValue);
              clearError('idProofNumber');
            }}
          />
          <div className="ui-field">
            <label className="ui-field__label">ID Proof Document</label>
            <div className="patient-photo__control">
              <button
                type="button"
                className="patient-photo__btn"
                onClick={() => idDocRef.current?.click()}
              >
                {idProofDocument?.fileName || 'Upload document'}
              </button>
              <input
                ref={idDocRef}
                type="file"
                accept="image/*,.pdf"
                hidden
                onChange={(event) => void onIdDocChange(event)}
              />
            </div>
          </div>
          <Input
            label="ABHA Number"
            value={abhaNumber}
            onChange={(event) => setAbhaNumber(event.target.value)}
          />
          <Input
            label="ABHA Address"
            value={abhaAddress}
            onChange={(event) => setAbhaAddress(event.target.value)}
          />
        </div>
      </section>

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>D. Emergency Contact / Guardian Details</h2>
          <p>Optional guardian or emergency contact for clinical coordination.</p>
        </div>
        <div className="patient-form-grid">
          <Input
            label="Contact Person Name"
            value={contactPersonName}
            onChange={(event) => setContactPersonName(event.target.value)}
          />
          <Select
            label="Relationship"
            value={relationship}
            onChange={(event) =>
              setRelationship(event.target.value as EmergencyRelationship | '')
            }
            options={[
              { label: 'Select', value: '' },
              { label: 'Father', value: 'father' },
              { label: 'Mother', value: 'mother' },
              { label: 'Husband', value: 'husband' },
              { label: 'Wife', value: 'wife' },
              { label: 'Son', value: 'son' },
              { label: 'Daughter', value: 'daughter' },
              { label: 'Brother', value: 'brother' },
              { label: 'Sister', value: 'sister' },
              { label: 'Guardian', value: 'guardian' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <Input
            label="Contact Number"
            value={emergencyContactNumber}
            onChange={(event) => setEmergencyContactNumber(event.target.value)}
          />
          <Input
            label="Alternate Number"
            value={emergencyAlternateNumber}
            onChange={(event) => setEmergencyAlternateNumber(event.target.value)}
          />
          <div className="patient-form-grid--full">
            <Input
              label="Address"
              value={emergencyAddress}
              onChange={(event) => setEmergencyAddress(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="patient-form-card">
        <div className="patient-form-card__head">
          <h2>E. Additional Information</h2>
          <p>Category, referral, language preference, and remarks.</p>
        </div>
        <div className="patient-form-grid">
          <Select
            label="Occupation"
            value={occupation}
            onChange={(event) => setOccupation(event.target.value)}
            options={[
              { label: 'Select', value: '' },
              { label: 'Student', value: 'Student' },
              { label: 'Employed', value: 'Employed' },
              { label: 'Self Employed', value: 'Self Employed' },
              { label: 'Homemaker', value: 'Homemaker' },
              { label: 'Retired', value: 'Retired' },
              { label: 'Unemployed', value: 'Unemployed' },
              { label: 'Other', value: 'Other' },
            ]}
          />
          <Select
            label="Patient Category"
            value={patientCategory}
            onChange={(event) =>
              setPatientCategory(event.target.value as PatientCategory | '')
            }
            options={[
              { label: 'General', value: 'general' },
              { label: 'Corporate', value: 'corporate' },
              { label: 'Insurance', value: 'insurance' },
              { label: 'Government Scheme', value: 'government_scheme' },
              { label: 'Staff', value: 'staff' },
              { label: 'VIP', value: 'vip' },
            ]}
          />
          <Select
            label="Registration Source"
            value={registrationSourceId}
            onChange={(event) => setRegistrationSourceId(event.target.value ? Number(event.target.value) : '')}
            options={[{ label: 'Select source', value: '' }, ...registrationSources
              .filter((source) => source.isActive || source.id === registrationSourceId)
              .map((source) => ({ label: `${source.name}${source.isActive ? '' : ' (inactive)'}`, value: source.id }))]}
          />
          <Select
            label="Referred By"
            value={referredBy}
            onChange={(event) => setReferredBy(event.target.value)}
            options={[
              { label: 'Select', value: '' },
              { label: 'Self', value: 'Self' },
              { label: 'Doctor', value: 'Doctor' },
              { label: 'Hospital', value: 'Hospital' },
              { label: 'Camp', value: 'Camp' },
              { label: 'Online', value: 'Online' },
              { label: 'Other', value: 'Other' },
            ]}
          />
          <Select
            label="Referral Doctor"
            value={referralDoctorId}
            onChange={(event) =>
              setReferralDoctorId(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
            options={doctorOptions}
          />
          <Select
            label="Preferred Language"
            value={preferredLanguage}
            onChange={(event) => setPreferredLanguage(event.target.value)}
            options={[
              { label: 'Tamil', value: 'Tamil' },
              { label: 'English', value: 'English' },
              { label: 'Hindi', value: 'Hindi' },
              { label: 'Telugu', value: 'Telugu' },
              { label: 'Malayalam', value: 'Malayalam' },
              { label: 'Kannada', value: 'Kannada' },
              { label: 'Other', value: 'Other' },
            ]}
          />
          {isEdit ? (
            <Select
              label="Status"
              value={isActive ? 'active' : 'inactive'}
              onChange={(event) => setIsActive(event.target.value === 'active')}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          ) : null}
          <div className="patient-form-grid--full">
            <label className="ui-field__label">Special Remarks</label>
            <textarea
              className="patient-remarks"
              rows={4}
              value={specialRemarks}
              onChange={(event) => setSpecialRemarks(event.target.value)}
              placeholder="Any special notes for front office / clinical team"
            />
          </div>
        </div>
      </section>

      <div className="patient-form-actions">
        <Button type="button" variant="secondary" onClick={() => navigate('/patients')}>
          Cancel
        </Button>
        {canSave ? (
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Patient' : 'Register Patient'}
          </Button>
        ) : null}
      </div>

      <Modal
        open={photoViewOpen}
        title="Patient Photo"
        onClose={() => setPhotoViewOpen(false)}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setPhotoViewOpen(false)}>
            Close
          </Button>
        }
      >
        {photoData ? (
          <img src={photoData} alt={displayPatientName} className="patient-photo-view" />
        ) : null}
      </Modal>
    </form>
  );
}

export default PatientFormPage;
