import { api } from '../../lib/api';
import type { ApiResponse, HospitalProfile, UpsertHospitalProfilePayload } from '../../types';

export const hospitalProfileApi = {
  get: async () => {
    const { data } = await api.get<ApiResponse<HospitalProfile | null>>('/hospital-profile');
    return data.data;
  },
  upsert: async (payload: UpsertHospitalProfilePayload) => {
    const { data } = await api.put<ApiResponse<HospitalProfile>>('/hospital-profile', payload);
    return data.data;
  },
};
