import { api } from '../../lib/api';
import type { ApiResponse } from '../../types';

export interface PatientDocumentRow { id: number; patientId: number; name: string; fileName: string; mimeType: string | null; createdAt: string }
export const patientDocumentsApi = {
  list: async (patientId: number) => (await api.get<ApiResponse<PatientDocumentRow[]>>(`/patients/${patientId}/documents`)).data.data,
  get: async (patientId: number, documentId: number) => (await api.get<ApiResponse<{ fileName: string; mimeType: string | null; fileData: string }>>(`/patients/${patientId}/documents/${documentId}`)).data.data,
  add: async (patientId: number, body: { name: string; fileName: string; mimeType: string; fileData: string }) => (await api.post<ApiResponse<PatientDocumentRow>>(`/patients/${patientId}/documents`, body)).data.data,
  remove: async (patientId: number, documentId: number) => { await api.delete(`/patients/${patientId}/documents/${documentId}`); },
};
