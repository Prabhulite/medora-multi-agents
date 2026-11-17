import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export interface UserNotification { id: number; kind: string; sourceId: number; title: string; message: string; route: string | null; readAt: string | null; createdAt: string }
export interface NotificationPageData { items: UserNotification[]; unreadCount: number; nextCursor: number | null }
export const notificationsApi = {
  list: async (beforeId?: number) => (await api.get<Envelope<NotificationPageData>>('/notifications', { params: { beforeId } })).data.data,
  read: async (id: number) => (await api.patch<Envelope<UserNotification>>(`/notifications/${id}/read`)).data.data,
};
