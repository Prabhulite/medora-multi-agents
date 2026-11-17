import { AppDataSource } from '../../../config/data-source.js';
import { Admission, Appointment, AppointmentStatusHistory, ClinicalEncounter, ClinicalEncounterAddendum, EmergencyCase, LaboratoryOrder, Patient, PatientAuditLog, PatientCommunication, PatientConsent, PatientVisit, Prescription, RadiologyOrder, SurgeryCase } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { In } from 'typeorm';

export type TimelineEvent = { key: string; kind: string; at: Date; title: string; detail: string | null; status: string | null };
const event = (kind: string, id: number, at: Date, title: string, detail: string | null = null, status: string | null = null): TimelineEvent => ({ key: `${kind}-${id}-${at.toISOString()}`, kind, at, title, detail, status });

export const timelineService = {
  async list(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    const mergedSources = await AppDataSource.getRepository(Patient).find({ where: { mergedIntoPatientId: patientId }, select: { id: true, mrdNumber: true } });
    const sourceMrdById = new Map(mergedSources.map((source) => [source.id, source.mrdNumber]));
    const [visits, encounters, addenda, prescriptions, admissions, labs, radiology, consents, appointments, appointmentChanges, emergencies, surgeries, communications, auditChanges] = await Promise.all([
      AppDataSource.getRepository(PatientVisit).find({ where: { patientId }, order: { visitAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(ClinicalEncounter).find({ where: { patientId }, order: { createdAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(ClinicalEncounterAddendum).createQueryBuilder('addendum').innerJoinAndSelect('addendum.encounter', 'encounter').where('encounter.patientId = :patientId', { patientId }).orderBy('addendum.createdAt', 'DESC').take(100).getMany(),
      AppDataSource.getRepository(Prescription).find({ where: { patientId }, order: { createdAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(Admission).find({ where: { patientId }, order: { admittedAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(LaboratoryOrder).find({ where: { patientId }, order: { orderedAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(RadiologyOrder).find({ where: { patientId }, order: { orderedAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(PatientConsent).find({ where: { patientId }, order: { createdAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(Appointment).find({ where: { patientId }, order: { createdAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(AppointmentStatusHistory).createQueryBuilder('history').innerJoinAndSelect('history.appointment', 'appointment').where('appointment.patientId = :patientId', { patientId }).orderBy('history.createdAt', 'DESC').take(100).getMany(),
      AppDataSource.getRepository(EmergencyCase).find({ where: { patientId }, order: { triagedAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(SurgeryCase).find({ where: { patientId }, order: { createdAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(PatientCommunication).find({ where: { patientId }, order: { occurredAt: 'DESC' }, take: 100 }),
      AppDataSource.getRepository(PatientAuditLog).find({ where: { patientId: In([patientId, ...sourceMrdById.keys()]) }, order: { createdAt: 'DESC' }, take: 100 }),
    ]);
    const events: TimelineEvent[] = [event('registration', patient.id, patient.registrationAt ?? patient.createdAt, 'Patient registered', patient.mrdNumber)];
    for (const row of visits) events.push(event('visit', row.id, row.visitAt, `${row.visitType} visit`, row.visitNumber, row.status));
    for (const row of encounters) {
      events.push(event('encounter', row.id, row.createdAt, row.diagnosisName || 'Clinical encounter', row.encounterType, 'draft'));
      if (row.signedAt) events.push(event('encounter-signed', row.id, row.signedAt, 'Clinical encounter signed', row.diagnosisName, 'signed'));
    }
    for (const row of addenda) events.push(event('encounter-addendum', row.id, row.createdAt, 'Clinical encounter addendum', row.reason, 'amended'));
    for (const row of prescriptions) events.push(event('prescription', row.id, row.createdAt, `Prescription: ${row.medicineName}`, row.dosage, row.status));
    for (const row of admissions) {
      events.push(event('admission', row.id, row.admittedAt, 'Inpatient admission', row.admissionNumber, row.status));
      if (row.dischargedAt) events.push(event('discharge', row.id, row.dischargedAt, 'Discharged', row.dischargeDiagnosis, 'discharged'));
    }
    for (const row of labs) {
      events.push(event('laboratory', row.id, row.orderedAt, 'Laboratory order', row.orderNumber, row.status));
      if (row.completedAt) events.push(event('laboratory-result', row.id, row.completedAt, 'Laboratory result', row.orderNumber, 'completed'));
    }
    for (const row of radiology) {
      events.push(event('radiology', row.id, row.orderedAt, 'Radiology order', row.orderNumber, row.status));
      if (row.reportedAt) events.push(event('radiology-report', row.id, row.reportedAt, 'Radiology report', row.orderNumber, 'reported'));
    }
    const appointmentsWithHistory = new Set(appointmentChanges.map((row) => row.appointmentId));
    for (const row of appointments) if (!appointmentsWithHistory.has(row.id)) events.push(event('appointment', row.id, row.createdAt, 'Appointment booked', row.appointmentNumber, 'booked'));
    for (const row of appointmentChanges) events.push(event('appointment-status', row.id, row.createdAt, `Appointment ${row.toStatus.replaceAll('_', ' ')}`, [row.appointment.appointmentNumber, row.notes].filter(Boolean).join(' · '), row.toStatus));
    for (const row of emergencies) {
      events.push(event('emergency', row.id, row.triagedAt, 'Emergency triage', row.caseNumber, row.triageCategory));
      if (row.dispositionAt) events.push(event('emergency-disposition', row.id, row.dispositionAt, 'Emergency disposition', row.caseNumber, row.status));
    }
    for (const row of surgeries) {
      events.push(event('surgery', row.id, row.createdAt, `Surgery scheduled: ${row.procedure}`, row.caseNumber, row.status));
      if (row.completedAt) events.push(event('surgery-completed', row.id, row.completedAt, `Surgery completed: ${row.procedure}`, row.caseNumber, 'completed'));
    }
    for (const row of communications) {
      events.push(event('communication', row.id, row.occurredAt, `Patient contact: ${row.channel.replaceAll('_', ' ')}`, row.subject, row.direction));
      if (row.followUpCompletedAt) events.push(event('follow-up-completed', row.id, row.followUpCompletedAt, 'Patient follow-up completed', row.subject, 'completed'));
    }
    for (const row of auditChanges) {
      const origin = sourceMrdById.get(row.patientId);
      const summary = `${row.changeSummary || row.action.replaceAll('_', ' ')}${origin ? ` (from ${origin})` : ''}`;
      if (row.action === 'pharmacy_dispensed') events.push(event('pharmacy-dispensed', row.id, row.createdAt, summary));
      if (['radiology_order_scheduled', 'radiology_order_rescheduled', 'radiology_order_cancelled', 'radiology_study_performed', 'radiology_draft_saved', 'radiology_report_amended', 'radiology_finding_communication'].includes(row.action)) events.push(event(row.action.replaceAll('_', '-'), row.id, row.createdAt, summary));
      if (['allergy_added', 'allergy_removed', 'history_added', 'history_removed'].includes(row.action)) events.push(event(row.action.replaceAll('_', '-'), row.id, row.createdAt, summary));
      if (row.action === 'home_medication_recorded') events.push(event('home-medication-reported', row.id, row.createdAt, summary, null, 'reported'));
      if (row.action === 'home_medication_ceased') events.push(event('home-medication-ceased', row.id, row.createdAt, summary, null, 'not current'));
      if (row.action === 'admission_medications_reviewed') events.push(event('admission-medications-reviewed', row.id, row.createdAt, summary, null, 'reviewed'));
      if (row.action === 'admission_medications_review_added') events.push(event('admission-medications-follow-up', row.id, row.createdAt, summary, null, 'reviewed'));
    }
    for (const row of consents) {
      events.push(event('consent', row.id, row.createdAt, `Consent recorded: ${row.subject}`, row.consentType, row.status));
      if (row.revokedAt) events.push(event('consent-revoked', row.id, row.revokedAt, `Consent revoked: ${row.subject}`, row.revocationReason, 'revoked'));
    }
    return events.sort((a, b) => b.at.getTime() - a.at.getTime() || a.key.localeCompare(b.key)).slice(0, 100);
  },
};
