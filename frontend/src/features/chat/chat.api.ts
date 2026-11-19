import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export interface ChatStaff { id: number; fullName: string; designation: string | null }
export interface ChatMessage { id: number; senderId: number; recipientId: number; body: string; createdAt: string }
export interface ChatPageData { items: ChatMessage[]; hasMore: boolean }

export const chatApi = {
  staff: async () => (await api.get<Envelope<ChatStaff[]>>('/chat/staff')).data.data,
  messages: async (staffId: number, cursor?: { beforeId?: number; afterId?: number }) => (await api.get<Envelope<ChatPageData>>(`/chat/${staffId}/messages`, { params: cursor })).data.data,
  send: async (staffId: number, body: string) => (await api.post<Envelope<ChatMessage>>(`/chat/${staffId}/messages`, { body })).data.data,
};
