import { api } from '../../lib/api';
import type {
  ApiResponse,
  Appointment,
  AppointmentSlotsResponse,
  AppointmentStatus,
  AvailableDoctor,
  CreateAppointmentPayload,
  UpdateAppointmentStatusPayload,
} from '../../types';

export const appointmentsApi = {
  list: async (params?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    doctorId?: number;
    patientId?: number;
    status?: AppointmentStatus;
  }) => {
    const { data } = await api.get<ApiResponse<Appointment[]>>('/appointments', { params });
    return data.data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return data.data;
  },
  availableDoctors: async (date: string, departmentId?: number) => {
    const { data } = await api.get<ApiResponse<AvailableDoctor[]>>(
      '/appointments/available-doctors',
      { params: { date, departmentId } },
    );
    return data.data;
  },
  slots: async (doctorId: number, date: string, excludeAppointmentId?: number) => {
    const { data } = await api.get<ApiResponse<AppointmentSlotsResponse>>('/appointments/slots', {
      params: { doctorId, date, excludeAppointmentId },
    });
    return data.data;
  },
  create: async (payload: CreateAppointmentPayload) => {
    const { data } = await api.post<ApiResponse<Appointment>>('/appointments', payload);
    return data.data;
  },
  updateStatus: async (id: number, payload: UpdateAppointmentStatusPayload) => {
    const { data } = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/status`,
      payload,
    );
    return data.data;
  },
};
