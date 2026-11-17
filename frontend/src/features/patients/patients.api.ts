import { api } from '../../lib/api';
import axios from 'axios';
import type {
  ApiResponse,
  Patient,
  PatientAuditLog,
  UpsertPatientPayload,
} from '../../types';

export const patientsApi = {
  downloadFhirR4: async (patientId: number) => {
    let response;
    try {
      response = await api.get<Blob>(`/fhir/r4/Patient/${patientId}`, { responseType: 'blob' });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const parsed: unknown = JSON.parse(await error.response.data.text());
          if (parsed && typeof parsed === 'object' && 'message' in parsed && typeof parsed.message === 'string') {
            error.response.data = parsed;
          }
        } catch {
          // Keep the original HTTP error when the response is not JSON.
        }
      }
      throw error;
    }
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patient-${patientId}-fhir-r4.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  communications: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; channel: string; direction: string; subject: string; summary: string; occurredAt: string; followUpDueAt: string | null; followUpCompletedAt: string | null; followUpCompletionNote: string | null }>>>(`/patients/${patientId}/communications`);
    return data.data;
  },
  recordCommunication: async (patientId: number, payload: { channel: string; direction: string; subject: string; summary: string; occurredAt: string; followUpDueAt: string | null }) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/patients/${patientId}/communications`, payload);
    return data.data;
  },
  followUps: async (status: 'open' | 'overdue' = 'open') => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; patientId: number; patientName: string; patientMrdNumber: string; channel: string; subject: string; followUpDueAt: string; overdue: boolean }>>>('/patients/follow-ups', { params: { status } });
    return data.data;
  },
  completeFollowUp: async (patientId: number, communicationId: number, note: string) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/patients/${patientId}/communications/${communicationId}/complete`, { note });
    return data.data;
  },
  list: async (includeInactive = false) => {
    const { data } = await api.get<ApiResponse<Patient[]>>('/patients', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.data;
  },
  search: async (params: {
    q?: string;
    mrdNumber?: string;
    mobileNumber?: string;
    visitNumber?: string;
    includeInactive?: boolean;
  }) => {
    const { data } = await api.get<ApiResponse<Patient[]>>('/patients/search', {
      params: {
        ...params,
        includeInactive: params.includeInactive ? 'true' : undefined,
      },
    });
    return data.data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Patient>>(`/patients/${id}`);
    return data.data;
  },
  checkDuplicates: async (payload: {
    firstName: string;
    lastName?: string | null;
    mobileNumber: string;
    dateOfBirth?: string | null;
    idProofType?: string | null;
    idProofNumber?: string | null;
    excludePatientId?: number;
  }) => {
    const { data } = await api.post<ApiResponse<Patient[]>>('/patients/duplicates', payload);
    return data.data;
  },
  create: async (payload: UpsertPatientPayload) => {
    const { data } = await api.post<ApiResponse<Patient>>('/patients', payload);
    return data.data;
  },
  update: async (id: number, payload: UpsertPatientPayload) => {
    const { data } = await api.put<ApiResponse<Patient>>(`/patients/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/patients/${id}`);
  },
  merge: async (sourcePatientId: number, targetPatientId: number) => {
    const { data } = await api.post<ApiResponse<Patient>>('/patients/merge', {
      sourcePatientId,
      targetPatientId,
    });
    return data.data;
  },
  auditLogs: async (id: number) => {
    const { data } = await api.get<ApiResponse<PatientAuditLog[]>>(
      `/patients/${id}/audit-logs`,
    );
    return data.data;
  },
};
