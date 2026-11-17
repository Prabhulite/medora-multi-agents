import { api } from '../../lib/api';

export interface RadiologyModality {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}
export interface RadiologyResource { id: number; code: string; name: string; location: string | null; modalityId: number; isActive: boolean }

export type RadiologyOrderStatus = 'ordered' | 'scheduled' | 'performed' | 'reported' | 'cancelled';
export interface ReferringDoctor { id: number; name: string; doctorCode: string; medicalRegistrationNumber: string }
export interface RadiologyAddendum { id: number; reason: string; addendum: string; createdById: number | null; createdAt: string; authorName: string | null }
export interface RadiologyCommunication { id: number; outcome: 'attempted' | 'delivered'; method: 'phone' | 'in_person' | 'secure_message' | 'other'; recipientName: string; findingSummary: string; note: string | null; occurredAt: string; recordedById: number | null; createdAt: string; recorderName: string | null }
export type CreateRadiologyCommunicationPayload = Pick<RadiologyCommunication, 'outcome' | 'method' | 'recipientName' | 'findingSummary' | 'occurredAt'> & { note?: string | null };
export interface RadiologyScheduleEvent { id: number; previousAt: string | null; scheduledAt: string; previousEndAt: string | null; scheduledEndAt: string | null; previousResourceId: number | null; resourceId: number | null; reason: string | null; createdById: number | null; createdAt: string; actorName: string | null }

export interface RadiologyOrder {
  id: number;
  orderNumber: string;
  patientId: number;
  patientName?: string | null;
  patientMrdNumber?: string | null;
  modalityId: number;
  doctorId?: number | null;
  modalityName: string;
  modalityCode?: string | null;
  studyName: string;
  priority?: 'routine' | 'urgent' | 'stat' | string;
  status: RadiologyOrderStatus;
  clinicalNotes?: string | null;
  orderedAt?: string | null;
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
  resourceId?: number | null;
  resourceName?: string | null;
  completedAt?: string | null;
  report?: string | null;
  findings?: string | null;
  impression?: string | null;
  reportedAt?: string | null;
  orderedBy?: string | null;
  reportedBy?: string | null;
}

export interface CreateRadiologyOrderPayload {
  patientId: number;
  modalityId: number;
  doctorId?: number | null;
  studyName: string;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalNotes?: string | null;
}

export interface UpdateRadiologyReportPayload {
  report?: string;
  impression?: string | null;
  status: 'performed' | 'reported';
}

interface ApiEnvelope<T> { data: T; }

function unwrap<T>(value: ApiEnvelope<T> | T): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as ApiEnvelope<T>).data
    : value;
}

function mapModality(row: any): RadiologyModality {
  return {
    id: Number(row.id),
    code: row.code || row.modalityCode || row.modality_code || '',
    name: row.name || row.modalityName || row.modality_name || 'Imaging modality',
    description: row.description || null,
    isActive: row.isActive ?? row.is_active ?? true,
  };
}

function mapOrder(row: any): RadiologyOrder {
  const patient = row.patient || {};
  const modality = row.modality || row.radiologyModality || {};
  return {
    id: Number(row.id),
    orderNumber: row.orderNumber || row.order_number || row.number || `RAD-${row.id}`,
    patientId: Number(row.patientId ?? patient.id),
    patientName: patient.fullName || patient.name || [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') || row.patientName || null,
    patientMrdNumber: patient.mrdNumber || patient.mrd_number || row.patientMrdNumber || null,
    modalityId: Number(row.modalityId ?? modality.id),
    modalityName: modality.name || modality.modalityName || row.modalityName || row.modality_name || 'Imaging study',
    modalityCode: modality.code || modality.modalityCode || row.modalityCode || row.modality_code || null,
    studyName: row.studyName || row.study_name || row.investigation || row.procedureName || modality.modalityName || 'Imaging study',
    priority: row.priority || 'routine',
    status: row.status || 'ordered',
    clinicalNotes: row.clinicalNotes || row.clinical_notes || row.notes || null,
    orderedAt: row.orderedAt || row.ordered_at || row.createdAt || null,
    scheduledAt: row.scheduledAt || row.scheduled_at || null,
    scheduledEndAt: row.scheduledEndAt || row.scheduled_end_at || null,
    resourceId: row.resourceId ?? row.resource_id ?? null,
    resourceName: row.resource?.name ?? null,
    completedAt: row.completedAt || row.completed_at || null,
    report: row.report ?? row.reportText ?? row.report_text ?? null,
    findings: row.findings ?? null,
    impression: row.impression ?? null,
    reportedAt: row.reportedAt || row.reported_at || null,
    orderedBy: row.orderedBy?.fullName || row.orderedByName || row.orderedBy || null,
    reportedBy: row.reportedBy?.fullName || row.reportedByName || row.reportedBy || null,
  };
}

export const radiologyApi = {
  async listResources(): Promise<RadiologyResource[]> {
    const response = await api.get<ApiEnvelope<RadiologyResource[]>>('/radiology/resources');
    return response.data.data;
  },
  async createResource(payload: { modalityId: number; code: string; name: string; location?: string | null }): Promise<RadiologyResource> {
    const response = await api.post<ApiEnvelope<RadiologyResource>>('/radiology/resources', payload);
    return response.data.data;
  },
  async setResourceActive(id: number, isActive: boolean): Promise<RadiologyResource> {
    const response = await api.patch<ApiEnvelope<RadiologyResource>>(`/radiology/resources/${id}/status`, { isActive });
    return response.data.data;
  },
  async listScheduleEvents(orderId: number): Promise<RadiologyScheduleEvent[]> {
    const response = await api.get<ApiEnvelope<RadiologyScheduleEvent[]>>(`/radiology/orders/${orderId}/schedule-events`);
    return response.data.data;
  },
  async scheduleOrder(orderId: number, payload: { scheduledAt: string; durationMinutes: number; resourceId?: number | null; reason?: string | null }): Promise<RadiologyOrder> {
    const response = await api.patch<ApiEnvelope<any>>(`/radiology/orders/${orderId}/schedule`, payload);
    return mapOrder(response.data.data);
  },
  async listCommunications(orderId: number): Promise<RadiologyCommunication[]> {
    const response = await api.get<ApiEnvelope<RadiologyCommunication[]>>(`/radiology/orders/${orderId}/communications`);
    return response.data.data;
  },
  async recordCommunication(orderId: number, payload: CreateRadiologyCommunicationPayload): Promise<RadiologyCommunication> {
    const response = await api.post<ApiEnvelope<RadiologyCommunication>>(`/radiology/orders/${orderId}/communications`, payload);
    return response.data.data;
  },
  async listAddenda(orderId: number): Promise<RadiologyAddendum[]> {
    const response = await api.get<ApiEnvelope<RadiologyAddendum[]>>(`/radiology/orders/${orderId}/addenda`);
    return response.data.data;
  },
  async addAddendum(orderId: number, payload: { reason: string; addendum: string }): Promise<RadiologyAddendum> {
    const response = await api.post<ApiEnvelope<RadiologyAddendum>>(`/radiology/orders/${orderId}/addenda`, payload);
    return response.data.data;
  },
  async doctors(search: string): Promise<ReferringDoctor[]> {
    const response = await api.get<ApiEnvelope<ReferringDoctor[]>>('/radiology/doctors', { params: { search } });
    return response.data.data;
  },
  async listModalities(): Promise<RadiologyModality[]> {
    const response = await api.get<ApiEnvelope<any[]> | any[]>('/radiology/modalities');
    return (unwrap(response.data) || []).map(mapModality).filter((modality) => modality.isActive !== false);
  },

  async listOrders(patientId?: number): Promise<RadiologyOrder[]> {
    const response = await api.get<ApiEnvelope<any[]> | any[]>('/radiology/orders', { params: patientId ? { patientId } : undefined });
    return (unwrap(response.data) || []).map(mapOrder);
  },

  async createOrder(payload: CreateRadiologyOrderPayload): Promise<RadiologyOrder> {
    const response = await api.post<ApiEnvelope<any> | any>('/radiology/orders', payload);
    return mapOrder(unwrap(response.data));
  },

  async updateReport(orderId: number, payload: UpdateRadiologyReportPayload): Promise<RadiologyOrder> {
    const response = await api.patch<ApiEnvelope<any> | any>(`/radiology/orders/${orderId}/report`, { status: payload.status, ...(payload.report !== undefined ? { reportText: payload.report } : {}), ...(payload.impression !== undefined ? { impression: payload.impression } : {}) });
    return mapOrder(unwrap(response.data));
  },
};
