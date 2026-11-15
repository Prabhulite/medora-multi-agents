import { api } from '../../lib/api';
import type {
  ApiResponse,
  Patient,
  PatientAuditLog,
  UpsertPatientPayload,
} from '../../types';

export const patientsApi = {
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
