import { api } from '../../lib/api';
import type { ApiResponse } from '../../types';

export type DoctorWorkspace = {
  doctor: { id: number; name: string; doctorCode: string; qualification: string | null; specialization: string | null; department: string | null };
  today: string;
  todayAppointments: Array<{ id: number; appointmentNumber: string; appointmentTime: string | null; appointmentType: string; status: string; patient: { id: number; mrdNumber: string; name: string; ageYears: number | null; gender: string } }>;
  upcomingAppointments: Array<{ id: number; appointmentNumber: string; appointmentDate: string; appointmentTime: string | null; appointmentType: string; status: string; patient: { id: number; mrdNumber: string; name: string; ageYears: number | null; gender: string } }>;
  recentPatients: Array<{ id: number; visitNumber: string; visitAt: string; status: string; patient: { id: number; mrdNumber: string; name: string; ageYears: number | null; gender: string } }>;
};

export const doctorWorkspaceApi = {
  getMine: async () => (await api.get<ApiResponse<DoctorWorkspace>>('/doctors/me/workspace')).data.data,
};
