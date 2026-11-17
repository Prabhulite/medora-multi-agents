import { api } from '../../lib/api';

export interface LaboratoryTest {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  specimen?: string | null;
  turnaroundHours?: number | null;
  price?: number | null;
  isActive?: boolean;
}
export interface CreateLaboratoryTestPayload { testCode: string; testName: string; category: string | null; priority: 'routine' | 'urgent' | 'stat'; turnaroundHours: number; price: number; }

export type LaboratoryOrderStatus = 'ordered' | 'collected' | 'processing' | 'verified' | 'completed' | 'cancelled';

export interface LaboratoryAddendum { id: number; reason: string; addendum: string; createdAt: string; createdById: number | null; authorName: string | null; }
export interface LaboratoryPatientCandidate { id: number; mrdNumber: string; fullName: string; }
export interface LaboratoryDoctorCandidate { id: number; name: string; doctorCode: string; medicalRegistrationNumber: string; }

export interface LaboratoryOrder {
  id: number;
  orderNumber: string;
  patientId: number;
  patientName?: string | null;
  patientMrdNumber?: string | null;
  testId: number;
  testName: string;
  doctorName?: string | null;
  testCode?: string | null;
  status: LaboratoryOrderStatus;
  priority?: 'routine' | 'urgent' | 'stat' | string;
  clinicalNotes?: string | null;
  orderedAt?: string | null;
  collectedAt?: string | null;
  specimenLabel?: string | null;
  collectedBy?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  verifiedAt?: string | null;
  verifiedById?: number | null;
  releasedById?: number | null;
  result?: string | null;
  resultUnit?: string | null;
  referenceRange?: string | null;
  remarks?: string | null;
  orderedBy?: string | null;
}

export interface CreateLaboratoryOrderPayload {
  patientId: number;
  testId: number;
  doctorId?: number | null;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalNotes?: string | null;
}

export interface UpdateLaboratoryResultPayload {
  result: string;
  resultUnit?: string | null;
  referenceRange?: string | null;
  remarks?: string | null;
  status?: 'processing';
}

interface ApiEnvelope<T> { data: T; }

function unwrap<T>(value: ApiEnvelope<T> | T): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as ApiEnvelope<T>).data
    : value;
}

function mapTest(row: any): LaboratoryTest {
  return {
    id: Number(row.id),
    code: row.code || row.testCode || row.test_code || '',
    name: row.name || row.testName || row.test_name || 'Unnamed test',
    category: row.category || row.department || null,
    specimen: row.specimen || row.sampleType || row.sample_type || null,
    turnaroundHours: row.turnaroundHours == null ? (row.turnaround_hours == null ? null : Number(row.turnaround_hours)) : Number(row.turnaroundHours),
    price: row.price == null ? null : Number(row.price),
    isActive: row.isActive ?? row.is_active ?? true,
  };
}

function mapOrder(row: any): LaboratoryOrder {
  const patient = row.patient || {};
  const test = row.test || row.laboratoryTest || {};
  return {
    id: Number(row.id),
    orderNumber: row.orderNumber || row.order_number || row.number || `LAB-${row.id}`,
    patientId: Number(row.patientId ?? patient.id),
    patientName: patient.fullName || patient.name || [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') || row.patientName || null,
    patientMrdNumber: patient.mrdNumber || patient.mrd_number || row.patientMrdNumber || null,
    testId: Number(row.testId ?? test.id),
    testName: test.name || test.testName || row.testName || row.test_name || 'Laboratory test',
    doctorName: row.doctor?.name ?? null,
    testCode: test.code || test.testCode || row.testCode || row.test_code || null,
    status: row.status || 'ordered',
    priority: row.priority || test.priority || 'routine',
    clinicalNotes: row.clinicalNotes ?? null,
    orderedAt: row.orderedAt || row.ordered_at || row.createdAt || null,
    collectedAt: row.collectedAt || row.collected_at || null,
    specimenLabel: row.specimenLabel || null,
    collectedBy: row.collectedBy?.fullName || null,
    completedAt: row.completedAt || row.completed_at || null,
    cancelledAt: row.cancelledAt || null,
    cancellationReason: row.cancellationReason || null,
    verifiedAt: row.verifiedAt || row.verified_at || null,
    verifiedById: row.verifiedById ?? row.verified_by_id ?? null,
    releasedById: row.releasedById ?? row.released_by_id ?? null,
    result: row.result ?? row.resultValue ?? null,
    resultUnit: row.resultUnit || row.result_unit || null,
    referenceRange: row.referenceRange || row.reference_range || null,
    remarks: row.remarks || row.resultNotes || row.notes || null,
    orderedBy: row.orderedBy?.fullName || row.orderedByName || row.orderedBy || null,
  };
}

export const laboratoryApi = {
  async listAllTests(): Promise<LaboratoryTest[]> {
    const response = await api.get<ApiEnvelope<any[]>>('/laboratory/tests/all');
    return response.data.data.map(mapTest);
  },
  async reactivateTest(id: number): Promise<LaboratoryTest> {
    const response = await api.post<ApiEnvelope<any>>(`/laboratory/tests/${id}/reactivate`);
    return mapTest(response.data.data);
  },
  async createTest(payload: CreateLaboratoryTestPayload): Promise<LaboratoryTest> {
    const response = await api.post<ApiEnvelope<any>>('/laboratory/tests', payload);
    return mapTest(response.data.data);
  },
  async retireTest(id: number): Promise<void> { await api.post(`/laboratory/tests/${id}/retire`); },
  async cancelOrder(orderId: number, reason: string): Promise<LaboratoryOrder> {
    const response = await api.post<ApiEnvelope<any>>(`/laboratory/orders/${orderId}/cancel`, { reason });
    return mapOrder(response.data.data);
  },
  async doctorCandidates(search: string): Promise<LaboratoryDoctorCandidate[]> {
    const response = await api.get<ApiEnvelope<LaboratoryDoctorCandidate[]>>('/laboratory/doctors', { params: { search } });
    return response.data.data;
  },
  async patientCandidates(search: string): Promise<LaboratoryPatientCandidate[]> {
    const response = await api.get<ApiEnvelope<LaboratoryPatientCandidate[]>>('/laboratory/patients', { params: { search } });
    return response.data.data;
  },
  async listAddenda(orderId: number): Promise<LaboratoryAddendum[]> {
    const response = await api.get<ApiEnvelope<LaboratoryAddendum[]>>(`/laboratory/orders/${orderId}/addenda`);
    return response.data.data;
  },
  async addAddendum(orderId: number, payload: { reason: string; addendum: string }): Promise<LaboratoryAddendum> {
    const response = await api.post<ApiEnvelope<LaboratoryAddendum>>(`/laboratory/orders/${orderId}/addenda`, payload);
    return response.data.data;
  },
  async verifyResult(orderId: number): Promise<LaboratoryOrder> {
    const response = await api.post<ApiEnvelope<any>>(`/laboratory/orders/${orderId}/verify`, { patientAndSpecimenChecked: true, qualityControlChecked: true });
    return mapOrder(response.data.data);
  },
  async releaseResult(orderId: number): Promise<LaboratoryOrder> {
    const response = await api.post<ApiEnvelope<any>>(`/laboratory/orders/${orderId}/release`);
    return mapOrder(response.data.data);
  },
  async listTests(): Promise<LaboratoryTest[]> {
    const response = await api.get<ApiEnvelope<any[]> | any[]>('/laboratory/tests');
    const rows = unwrap(response.data) || [];
    return rows.map(mapTest).filter((test) => test.isActive !== false);
  },

  async listOrders(patientId?: number): Promise<LaboratoryOrder[]> {
    const response = await api.get<ApiEnvelope<any[]> | any[]>('/laboratory/orders', { params: patientId ? { patientId } : undefined });
    const rows = unwrap(response.data) || [];
    return rows.map(mapOrder);
  },

  async createOrder(payload: CreateLaboratoryOrderPayload): Promise<LaboratoryOrder> {
    const response = await api.post<ApiEnvelope<any> | any>('/laboratory/orders', payload);
    return mapOrder(unwrap(response.data));
  },

  async updateResult(orderId: number, payload: UpdateLaboratoryResultPayload): Promise<LaboratoryOrder> {
    const response = await api.patch<ApiEnvelope<any> | any>(`/laboratory/orders/${orderId}/result`, { status: payload.status, resultValue: payload.result, resultUnit: payload.resultUnit, referenceRange: payload.referenceRange, resultNotes: payload.remarks });
    return mapOrder(unwrap(response.data));
  },
  async collectSample(orderId: number, specimenLabel: string): Promise<LaboratoryOrder> {
    const response = await api.patch<ApiEnvelope<any> | any>(`/laboratory/orders/${orderId}/collect`, { specimenLabel });
    return mapOrder(unwrap(response.data));
  },
};
