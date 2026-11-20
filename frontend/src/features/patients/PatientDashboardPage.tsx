import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Loader';
import { PatientAvatar } from '../../components/ui/PatientAvatar';
import {
  AlertCircleIcon,
  CheckCircleIcon,
} from '../../components/ui/statusIcons';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { Patient } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { ClinicalEncountersPanel } from '../clinical/ClinicalEncountersPanel';
import { PrescriptionComposer } from '../clinical/PrescriptionComposer';
import { PatientTimeline } from '../clinical/PatientTimeline';
import { AllergyBanner } from '../clinical/AllergyBanner';
import { patientsApi } from './patients.api';
import { PatientCommunicationsPanel } from './PatientCommunicationsPanel';
import { PatientRecordsTab } from './PatientRecordsTab';
import { PatientMrdTab } from './PatientMrdTab';
import { GlucoseMonitoringPanel } from '../glucose-monitoring/GlucoseMonitoringPanel';
import { PatientVaccinationPanel } from '../vaccination/PatientVaccinationPanel';
import { PatientDocumentsModal } from './PatientDocumentsModal';
import { PatientPaymentModal } from './PatientPaymentModal';
import { PatientPrescriptionModal } from './PatientPrescriptionModal';
import { PatientSlotsModal } from './PatientSlotsModal';
import './PatientDashboardPage.css';

const TABS = [
  'Dashboard',
  'Profile',
  'Visit',
  'Bills',
  'Tests',
  'Rx',
  'Glucose',
  'Vaccination',
  'MRD',
  'Appointment',
  'Timeline',
] as const;

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function titleCase(value?: string | null) {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="pd-detail-row">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export function PatientDashboardPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = id ? Number(id) : null;
  const visitId = Number(searchParams.get('visitId'));
  const activeVisitId = Number.isSafeInteger(visitId) && visitId > 0 ? visitId : undefined;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(searchParams.get('tab') === 'Rx' ? 'Rx' : 'Dashboard');
  useEffect(() => { if (searchParams.get('tab') === 'Rx') setActiveTab('Rx'); }, [searchParams]);
  const [prescriptionRevision, setPrescriptionRevision] = useState(0);
  const [newPrescriptionIds, setNewPrescriptionIds] = useState<number[]>([]);
  const [allergyRevision, setAllergyRevision] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [actionModal, setActionModal] = useState<'documents' | 'payment' | 'prescriptions' | 'slots' | null>(null);

  const canUpdate = hasPermission(user, 'patients.update');
  const canExport = hasPermission(user, 'patients.export');
  const canPrintClinicalSummary = hasPermission(user, 'clinical.view');

  const downloadFhir = async () => {
    if (!patientId) return;
    setExporting(true); setExportError('');
    try { await patientsApi.downloadFhirR4(patientId); }
    catch (err) { setExportError(getErrorMessage(err, 'Unable to export patient resource')); }
    finally { setExporting(false); }
  };

  const printClinicalSummary = () => {
    setActiveTab('Dashboard');
    window.setTimeout(() => window.print(), 150);
  };

  useEffect(() => {
    if (!patientId || Number.isNaN(patientId)) {
      setError('Invalid patient');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        setPatient(await patientsApi.getById(patientId));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load patient'));
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [patientId]);

  const displayName = useMemo(() => {
    if (!patient) return '';
    const name =
      [patient.title, patient.firstName, patient.middleName, patient.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || patient.fullName;
    return name;
  }, [patient]);

  const addressLine = useMemo(() => {
    if (!patient?.address) return '—';
    return [
      patient.address.addressLine1,
      patient.address.addressLine2,
      patient.address.city,
      patient.address.district,
      patient.address.state,
      patient.address.pincode,
      patient.address.country,
    ]
      .filter(Boolean)
      .join(', ');
  }, [patient]);

  if (loading) {
    return <PageLoader label="Loading patient dashboard…" />;
  }

  if (error || !patient) {
    return (
      <div className="pd-page">
        <Alert tone="error">{error || 'Patient not found'}</Alert>
        <Button variant="back" size="sm" onClick={() => navigate(window.location.pathname.startsWith('/doctor/') ? '/doctor' : '/patients')}>
          Back to Patients
        </Button>
      </div>
    );
  }

  return (
    <div className="pd-page">
      <div className="pd-topbar">
        <div>
          <h1>Patient Dashboard</h1>
          <p>Patient master overview for clinical and front-office reference.</p>
        </div>
        <div className="pd-topbar__actions">
          <Button variant="secondary" size="sm" onClick={() => setActionModal('documents')}>Documents</Button>
          {(hasPermission(user, 'pharmacy.view') || hasPermission(user, 'pharmacy.create')) && <Button variant="secondary" size="sm" onClick={() => setActionModal('prescriptions')}>Prescriptions</Button>}
          {hasPermission(user, 'appointments.view') && <Button variant="secondary" size="sm" onClick={() => setActionModal('slots')}>Appointments</Button>}
          {hasPermission(user, 'billing.view') && hasPermission(user, 'billing.update') && <Button variant="secondary" size="sm" onClick={() => setActionModal('payment')}>Payment</Button>}
          {canPrintClinicalSummary ? <Button variant="secondary" size="sm" onClick={printClinicalSummary}>Print clinical summary</Button> : null}
          {canExport ? <Button variant="secondary" size="sm" loading={exporting} onClick={() => void downloadFhir()}>Export FHIR R4</Button> : null}
          {canUpdate ? (
            <Button size="sm" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
              Edit Patient
            </Button>
          ) : null}
          <Button variant="back" size="sm" onClick={() => navigate(window.location.pathname.startsWith('/doctor/') ? '/doctor' : '/patients')}>
            Back
          </Button>
        </div>
      </div>

      {exportError ? <Alert tone="error">{exportError}</Alert> : null}
      {actionModal === 'documents' && <PatientDocumentsModal patientId={patient.id} patientName={patient.fullName} canManage={canUpdate || hasPermission(user, 'clinical.create')} onClose={() => setActionModal(null)} />}
      {actionModal === 'payment' && <PatientPaymentModal patientId={patient.id} patientName={patient.fullName} onClose={() => setActionModal(null)} />}
      {actionModal === 'prescriptions' && <PatientPrescriptionModal patient={patient} visitId={activeVisitId} onClose={() => setActionModal(null)} />}
      {actionModal === 'slots' && <PatientSlotsModal patientId={patient.id} patientName={patient.fullName} canBook={hasPermission(user, 'appointments.create')} onClose={() => setActionModal(null)} />}

      <nav className="pd-tabs" aria-label="Patient sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`pd-tabs__item ${activeTab === tab ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Timeline' ? (
        hasPermission(user, 'clinical.view') ? <PatientTimeline patientId={patient.id} /> : <Alert tone="error">Clinical view permission is required to see this timeline.</Alert>
      ) : activeTab === 'Profile' ? (
        <section className="pd-card pd-card--wide"><div className="pd-card__head"><h3>Patient profile</h3></div><div className="pd-card__body">
          <DetailRow label="Name" value={displayName} />
          <DetailRow label="MRD number" value={patient.mrdNumber} />
          <DetailRow label="Date of birth" value={fmtDate(patient.dateOfBirth)} />
          <DetailRow label="Gender" value={titleCase(patient.gender)} />
          <DetailRow label="Blood group" value={patient.bloodGroup || '—'} />
          <DetailRow label="Mobile" value={patient.contact?.mobileNumber || '—'} />
          <DetailRow label="Email" value={patient.contact?.email || '—'} />
          <DetailRow label="Address" value={addressLine} />
          <DetailRow label="Emergency contact" value={patient.emergencyContact?.contactPersonName || '—'} />
          <DetailRow label="Emergency number" value={patient.emergencyContact?.contactNumber || '—'} />
        </div></section>
      ) : activeTab === 'MRD' ? (
        <PatientMrdTab patient={patient} />
      ) : activeTab === 'Glucose' ? (
        hasPermission(user, 'clinical.view') ? <div className="pd-card pd-card--wide pd-card__body"><GlucoseMonitoringPanel patientId={patient.id} canCreate={hasPermission(user, 'clinical.create')} /></div> : <Alert tone="error">Clinical view permission is required to see glucose readings.</Alert>
      ) : activeTab === 'Vaccination' ? (
        hasPermission(user, 'vaccination.view') ? <PatientVaccinationPanel patientId={patient.id} /> : <Alert tone="error">Vaccination view permission is required to see immunization history.</Alert>
      ) : activeTab === 'Visit' || activeTab === 'Bills' || activeTab === 'Tests' || activeTab === 'Rx' || activeTab === 'Appointment' ? (
        <>
          {activeTab === 'Rx' && hasPermission(user, 'clinical.view') && hasPermission(user, 'pharmacy.create') ? (
            <details className="pd-card" open>
              <summary>Create prescription</summary>
              <PrescriptionComposer patientId={patient.id} patientName={patient.fullName} visitId={activeVisitId} onSaved={(ids) => { setPrescriptionRevision((value) => value + 1); setNewPrescriptionIds(ids); }} />
            </details>
          ) : null}
          <PatientRecordsTab key={activeTab === 'Rx' ? prescriptionRevision : activeTab} patient={patient} mode={activeTab} previewPrescriptionIds={activeTab === 'Rx' ? newPrescriptionIds : []} />
        </>
      ) : (
        <>
          <section className="pd-hero">
            <PatientAvatar photo={patient.photoData} name={displayName} size={72} />
            <div className="pd-hero__main">
              <h2>{displayName}</h2>
              <div className="pd-hero__meta">
                <span className="pd-chip pd-chip--mrd">{patient.mrdNumber}</span>
                <span className="pd-chip">
                  {patient.ageYears != null
                    ? `${patient.ageYears}${patient.ageIsApproximate ? '~' : ''} yrs`
                    : 'Age —'}
                </span>
                <span className="pd-chip">{titleCase(patient.gender)}</span>
                {patient.bloodGroup ? <span className="pd-chip">{patient.bloodGroup}</span> : null}
                <Badge
                  tone={patient.isActive ? 'success' : 'danger'}
                  icon={patient.isActive ? <CheckCircleIcon /> : <AlertCircleIcon />}
                >
                  {patient.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="pd-hero__sub">
                <span>Mobile: {patient.contact?.mobileNumber || '—'}</span>
                <span>Registered: {fmtDateTime(patient.registrationAt || patient.createdAt)}</span>
                {patient.createdByName ? <span>By: {patient.createdByName}</span> : null}
              </div>
            </div>
          </section>

          {hasPermission(user, 'clinical.view') ? <AllergyBanner key={`${patient.id}-${allergyRevision}`} patientId={patient.id} /> : null}

          <div className="pd-grid">
            <section className="pd-card">
              <div className="pd-card__head">
                <h3>Personal Details</h3>
              </div>
              <div className="pd-card__body">
                <DetailRow label="Title" value={patient.title || '—'} />
                <DetailRow label="First Name" value={patient.firstName || '—'} />
                <DetailRow label="Middle Name" value={patient.middleName || '—'} />
                <DetailRow label="Last Name" value={patient.lastName || '—'} />
                <DetailRow label="DOB" value={fmtDate(patient.dateOfBirth)} />
                <DetailRow
                  label="Age"
                  value={
                    patient.ageYears != null
                      ? `${patient.ageYears}${patient.ageIsApproximate ? ' (approx)' : ''} yrs`
                      : '—'
                  }
                />
                <DetailRow label="Gender" value={titleCase(patient.gender)} />
                <DetailRow label="Blood Group" value={patient.bloodGroup || '—'} />
                <DetailRow label="Marital Status" value={titleCase(patient.maritalStatus)} />
                <DetailRow label="Nationality" value={patient.nationality || '—'} />
                <DetailRow label="Religion" value={patient.religion || '—'} />
                <DetailRow label="Category" value={titleCase(patient.patientCategory)} />
              </div>
            </section>

            <section className="pd-card">
              <div className="pd-card__head">
                <h3>Contact</h3>
              </div>
              <div className="pd-card__body">
                <DetailRow label="Mobile" value={patient.contact?.mobileNumber || '—'} />
                <DetailRow label="Alternate" value={patient.contact?.alternateMobile || '—'} />
                <DetailRow label="Email" value={patient.contact?.email || '—'} />
                <DetailRow label="Preferred Language" value={patient.preferredLanguage || '—'} />
                <DetailRow label="Occupation" value={patient.occupation || '—'} />
              </div>
            </section>

            <section className="pd-card">
              <div className="pd-card__head">
                <h3>Identification</h3>
              </div>
              <div className="pd-card__body">
                <DetailRow
                  label="ID Proof Type"
                  value={titleCase(patient.identification?.idProofType || null)}
                />
                <DetailRow
                  label="ID Proof Number"
                  value={patient.identification?.idProofNumber || '—'}
                />
                <DetailRow label="ABHA Number" value={patient.identification?.abhaNumber || '—'} />
                <DetailRow
                  label="ABHA Address"
                  value={patient.identification?.abhaAddress || '—'}
                />
              </div>
            </section>

            <section className="pd-card">
              <div className="pd-card__head">
                <h3>Address</h3>
              </div>
              <div className="pd-card__body">
                <DetailRow label="Full Address" value={addressLine} />
                <DetailRow label="City / Town" value={patient.address?.city || '—'} />
                <DetailRow label="District" value={patient.address?.district || '—'} />
                <DetailRow label="State" value={patient.address?.state || '—'} />
                <DetailRow label="Pincode" value={patient.address?.pincode || '—'} />
                <DetailRow label="Country" value={patient.address?.country || '—'} />
              </div>
            </section>

            <section className="pd-card">
              <div className="pd-card__head">
                <h3>Emergency / Guardian</h3>
              </div>
              <div className="pd-card__body">
                <DetailRow
                  label="Contact Person"
                  value={patient.emergencyContact?.contactPersonName || '—'}
                />
                <DetailRow
                  label="Relationship"
                  value={titleCase(patient.emergencyContact?.relationship || null)}
                />
                <DetailRow
                  label="Contact Number"
                  value={patient.emergencyContact?.contactNumber || '—'}
                />
                <DetailRow
                  label="Alternate Number"
                  value={patient.emergencyContact?.alternateNumber || '—'}
                />
                <DetailRow label="Address" value={patient.emergencyContact?.address || '—'} />
              </div>
            </section>

            <section className="pd-card">
              <div className="pd-card__head">
                <h3>Registration & Referral</h3>
              </div>
              <div className="pd-card__body">
                <DetailRow label="MRD Number" value={patient.mrdNumber} />
                <DetailRow
                  label="Registration"
                  value={fmtDateTime(patient.registrationAt || patient.createdAt)}
                />
                <DetailRow label="Registered By" value={patient.createdByName || '—'} />
                <DetailRow label="Registration Source" value={patient.registrationSourceName || '—'} />
                <DetailRow label="Referred By" value={patient.referredBy || '—'} />
                <DetailRow
                  label="Referral Doctor"
                  value={patient.referralDoctorName || '—'}
                />
                <DetailRow label="Remarks" value={patient.specialRemarks || '—'} />
              </div>
            </section>

            <section className="pd-card pd-card--wide">
              <div className="pd-card__head">
                <h3>Visit Summary</h3>
              </div>
              <div className="pd-card__body pd-visits">
                {patient.visits?.length ? (
                  patient.visits.map((visit) => (
                    <div key={visit.id} className="pd-visit-row">
                      <div>
                        <div className="ui-table__cell-title">{visit.visitNumber}</div>
                        <div className="ui-table__cell-sub">
                          {visit.opNumber || visit.visitType} · {visit.status}
                        </div>
                      </div>
                      <strong>{fmtDateTime(visit.visitAt)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="pd-empty">No visits recorded yet.</p>
                )}
              </div>
            </section>

            <PatientCommunicationsPanel patientId={patient.id} canRecord={canUpdate} />

            {hasPermission(user, 'clinical.view') ? <ClinicalEncountersPanel patientId={patient.id} activeVisitId={activeVisitId} onAllergiesChanged={() => setAllergyRevision((value) => value + 1)} /> : null}
          </div>
        </>
      )}
    </div>
  );
}

export default PatientDashboardPage;
