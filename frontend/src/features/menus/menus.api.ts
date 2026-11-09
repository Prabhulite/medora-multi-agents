import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateMenuPayload,
  MenuItem,
  UpdateMenuPayload,
} from '../../types';

export const menusApi = {
  listNav: async () => {
    const { data } = await api.get<ApiResponse<MenuItem[]>>('/menus/nav');
    return data.data;
  },
  list: async () => {
    const { data } = await api.get<ApiResponse<MenuItem[]>>('/menus');
    return data.data;
  },
  create: async (payload: CreateMenuPayload) => {
    const { data } = await api.post<ApiResponse<MenuItem>>('/menus', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateMenuPayload) => {
    const { data } = await api.put<ApiResponse<MenuItem>>(`/menus/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/menus/${id}`);
  },
};
