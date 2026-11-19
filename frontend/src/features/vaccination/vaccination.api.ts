import { api } from '../../lib/api';

export interface Vaccine { id: number; code: string; name: string; isActive: boolean }
export interface Immunization { id: number; patientId: number; mrdNumber: string; firstName: string; lastName: string | null; vaccineId: number; vaccineName: string; doseNumber: number; administeredOn: string; nextDueOn: string | null; lotNumber: string | null; remarks: string | null }
export const vaccinationApi = {
  async catalog() { return (await api.get<{ data: Vaccine[] }>('/vaccination/vaccines')).data.data; },
  async records() { return (await api.get<{ data: Immunization[] }>('/vaccination/records')).data.data; },
  async patientRecords(patientId: number) { return (await api.get<{ data: Immunization[] }>(`/vaccination/patients/${patientId}/records`)).data.data; },
  async report(params: { from?: string; to?: string; vaccineId?: number }) { return (await api.get<{ data: Immunization[] }>('/vaccination/report', { params })).data.data; },
  async addVaccine(input: { code: string; name: string }) { return (await api.post('/vaccination/vaccines', input)).data; },
  async addRecord(input: { patientId: number; vaccineId: number; doseNumber: number; administeredOn: string; nextDueOn?: string; lotNumber?: string; remarks?: string }) { return (await api.post('/vaccination/records', input)).data; },
};
