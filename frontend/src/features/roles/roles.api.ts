import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateRolePayload,
  Permission,
  Role,
  UpdateRolePayload,
} from '../../types';

export const rolesApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<Role[]>>('/roles');
    return data.data;
  },
  listPermissions: async () => {
    const { data } = await api.get<ApiResponse<Permission[]>>('/roles/permissions');
    return data.data;
  },
  create: async (payload: CreateRolePayload) => {
    const { data } = await api.post<ApiResponse<Role>>('/roles', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateRolePayload) => {
    const { data } = await api.put<ApiResponse<Role>>(`/roles/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/roles/${id}`);
  },
};
