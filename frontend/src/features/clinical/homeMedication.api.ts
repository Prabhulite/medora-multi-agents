import { api } from '../../lib/api';
import type { ApiResponse } from '../../types';

export type HomeMedicationSource = 'patient' | 'caregiver' | 'records' | 'other';

export interface HomeMedication {
  id: number;
  patientId: number;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  source: HomeMedicationSource;
  sourceDetail: string | null;
  isCurrent: boolean;
  recordedAt: string;
  ceasedAt: string | null;
  cessationReason: string | null;
}

export interface CreateHomeMedicationPayload {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  source: HomeMedicationSource;
  sourceDetail?: string;
}

const path = (patientId: number) => `/clinical/patients/${patientId}/home-medications`;

export const homeMedicationApi = {
  list: async (patientId: number): Promise<HomeMedication[]> => {
    const { data } = await api.get<ApiResponse<HomeMedication[]>>(path(patientId));
    return data.data;
  },
  create: async (patientId: number, payload: CreateHomeMedicationPayload): Promise<HomeMedication> => {
    const { data } = await api.post<ApiResponse<HomeMedication>>(path(patientId), payload);
    return data.data;
  },
  cease: async (patientId: number, id: number, reason: string): Promise<HomeMedication> => {
    const { data } = await api.post<ApiResponse<HomeMedication>>(`${path(patientId)}/${id}/cease`, { reason });
    return data.data;
  },
};
