import { api } from '../../lib/api';
import type { ApiResponse, ClinicalEncounter, CreateClinicalEncounterPayload, UpdateClinicalEncounterPayload } from '../../types';

export const clinicalApi = {
  updateDraft: async (id: number, payload: UpdateClinicalEncounterPayload) => {
    const { data } = await api.patch<ApiResponse<ClinicalEncounter>>(`/clinical/encounters/${id}`, payload);
    return data.data;
  },
  listDiagnoses: async (search = '') => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; system: string; code: string; name: string; version: string }>>>('/clinical/diagnoses', { params: { search } });
    return data.data;
  },
  createDiagnosis: async (payload: { system: 'local' | 'ICD-10' | 'ICD-11'; code: string; name: string; version: string }) => {
    const { data } = await api.post<ApiResponse<unknown>>('/clinical/diagnoses', payload);
    return data.data;
  },
  deactivateDiagnosis: async (id: number) => {
    await api.patch(`/clinical/diagnoses/${id}/deactivate`);
  },
  addEncounterAddendum: async (id: number, payload: { reason: string; addendum: string }) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/clinical/encounters/${id}/addenda`, payload);
    return data.data;
  },
  signEncounter: async (id: number) => {
    const { data } = await api.post<ApiResponse<ClinicalEncounter>>(`/clinical/encounters/${id}/sign`);
    return data.data;
  },
  timeline: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<Array<{ key: string; kind: string; at: string; title: string; detail: string | null; status: string | null }>>>(`/clinical/patients/${patientId}/timeline`);
    return data.data;
  },
  listConsents: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; consentType: string; subject: string; risksExplained: string; language: string; signatoryName: string; signatoryRole: string; signedAt: string; fileName: string; status: string; revocationReason: string | null }>>>(`/clinical/patients/${patientId}/consents`);
    return data.data;
  },
  createConsent: async (patientId: number, payload: { consentType: string; subject: string; risksExplained: string; treatingDoctorName: string | null; doctorRegistrationNumber: string | null; admissionDate: string | null; language: string; signatoryName: string; signatoryRole: string; signedAt: string; fileName: string; mimeType: string; fileData: string }) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/clinical/patients/${patientId}/consents`, payload);
    return data.data;
  },
  consentDocument: async (patientId: number, consentId: number) => {
    const { data } = await api.get<ApiResponse<{ fileName: string; mimeType: string; fileData: string }>>(`/clinical/patients/${patientId}/consents/${consentId}/document`);
    return data.data;
  },
  revokeConsent: async (patientId: number, consentId: number, reason: string) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/clinical/patients/${patientId}/consents/${consentId}/revoke`, { reason });
    return data.data;
  },
  listMedicalHistory: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; conditionName: string; diagnosedOn: string | null; notes: string | null }>>>(`/clinical/patients/${patientId}/medical-history`);
    return data.data;
  },
  createMedicalHistory: async (patientId: number, payload: { conditionName: string; diagnosedOn: string | null; notes: string | null }) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/clinical/patients/${patientId}/medical-history`, payload);
    return data.data;
  },
  removeMedicalHistory: async (patientId: number, recordId: number) => {
    await api.delete(`/clinical/patients/${patientId}/medical-history/${recordId}`);
  },
  listAllergies: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; allergen: string; reaction: string | null; severity: string | null; notes: string | null }>>>(`/clinical/patients/${patientId}/allergies`);
    return data.data;
  },
  createAllergy: async (patientId: number, payload: { allergen: string; reaction: string | null; severity: string | null }) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/clinical/patients/${patientId}/allergies`, payload);
    return data.data;
  },
  removeAllergy: async (patientId: number, allergyId: number) => {
    await api.delete(`/clinical/patients/${patientId}/allergies/${allergyId}`);
  },
  listByPatient: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<ClinicalEncounter[]>>(`/clinical/patients/${patientId}/encounters`);
    return data.data;
  },
  create: async (payload: CreateClinicalEncounterPayload) => {
    const { data } = await api.post<ApiResponse<ClinicalEncounter>>('/clinical/encounters', payload);
    return data.data;
  },
};
