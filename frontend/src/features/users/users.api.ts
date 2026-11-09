import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateUserPayload,
  UpdateUserPayload,
  User,
} from '../../types';

export const usersApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<User[]>>('/users');
    return data.data;
  },
  create: async (payload: CreateUserPayload) => {
    const { data } = await api.post<ApiResponse<User>>('/users', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateUserPayload) => {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/users/${id}`);
  },
};
