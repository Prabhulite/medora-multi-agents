import { api } from '../../lib/api';
import type { ApiResponse, CreatePrescriptionPayload, Prescription } from '../../types';

export const prescriptionsApi = {
  listMedications: async () => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; brandName: string; genericName: string; medicineCode: string }>>>('/pharmacy/medications');
    return data.data;
  },
  listByPatient: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<Prescription[]>>(`/pharmacy/patients/${patientId}/prescriptions`);
    return data.data;
  },
  pendingDispense: async () => {
    const { data } = await api.get<ApiResponse<Array<{ id: number; patientId: number; patientName: string; patientNumber: string; medicineName: string; quantityPrescribed: number; dispensedQuantity: string; remainingQuantity: number; createdAt: string }>>>('/pharmacy/prescriptions/pending-dispense');
    return data.data;
  },
  create: async (payload: CreatePrescriptionPayload) => {
    const { data } = await api.post<ApiResponse<Prescription>>('/pharmacy/prescriptions', payload);
    return data.data;
  },
};
