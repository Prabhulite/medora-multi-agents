import { api } from '../../lib/api';

export type GlucoseContext = 'fasting' | 'random' | 'post_meal';
export interface GlucoseReading {
  id: number;
  patientId: number;
  valueMgDl: number;
  context: GlucoseContext;
  measuredAt: string;
  notes: string | null;
  recordedByUserId: number;
  authorName: string;
  createdAt: string;
}
interface ApiResponse<T> { data: T }
export const glucoseApi = {
  async list(patientId: number): Promise<GlucoseReading[]> {
    const { data } = await api.get<ApiResponse<GlucoseReading[]>>(`/glucose-monitoring/patients/${patientId}/readings`);
    return data.data;
  },
  async create(patientId: number, input: { valueMgDl: number; context: GlucoseContext; measuredAt: string; notes: string | null }): Promise<GlucoseReading> {
    const { data } = await api.post<ApiResponse<GlucoseReading>>(`/glucose-monitoring/patients/${patientId}/readings`, input);
    return data.data;
  },
};
