import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export interface SupportTicket { id: number; createdById: number; createdBy?: { fullName: string; email: string | null }; issueTitle: string; description: string; status: TicketStatus; priority: TicketPriority; createdAt: string; updatedAt: string }
export interface TicketDetail extends SupportTicket { responses: { id: number; message: string; respondedAt: string; respondedBy: string }[] }
export const supportTicketsApi = {
  list: async (scope: 'mine' | 'all') => (await api.get<Envelope<SupportTicket[]>>('/support-tickets', { params: { scope } })).data.data,
  detail: async (id: number) => (await api.get<Envelope<TicketDetail>>(`/support-tickets/${id}`)).data.data,
  create: async (payload: { issueTitle: string; description: string; priority: TicketPriority }) => (await api.post<Envelope<SupportTicket>>('/support-tickets', payload)).data.data,
  status: async (id: number, status: Exclude<TicketStatus, 'Open'>) => (await api.patch<Envelope<SupportTicket>>(`/support-tickets/${id}/status`, { status })).data.data,
  respond: async (id: number, message: string) => (await api.post<Envelope<unknown>>(`/support-tickets/${id}/responses`, { message })).data.data,
};
