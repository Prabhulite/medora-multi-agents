import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateServicePayload,
  ServiceCategory,
  ServiceMaster,
  UpdateServicePayload,
} from '../../types';

export const servicesApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<ServiceMaster[]>>('/services');
    return data.data;
  },
  listActive: async () => {
    const { data } = await api.get<ApiResponse<ServiceMaster[]>>('/services/active');
    return data.data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<ServiceMaster>>(`/services/${id}`);
    return data.data;
  },
  create: async (payload: CreateServicePayload) => {
    const { data } = await api.post<ApiResponse<ServiceMaster>>('/services', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateServicePayload) => {
    const { data } = await api.put<ApiResponse<ServiceMaster>>(`/services/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/services/${id}`);
  },
};

export const serviceCategoriesApi = {
  listActive: async () => {
    const { data } = await api.get<ApiResponse<ServiceCategory[]>>('/service-categories/active');
    return data.data;
  },
};
