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

export type LaboratoryOrderStatus = 'ordered' | 'collected' | 'processing' | 'completed' | 'cancelled' | string;

export interface LaboratoryOrder {
  id: number;
  orderNumber: string;
  patientId: number;
  patientName?: string | null;
  patientMrdNumber?: string | null;
  testId: number;
  testName: string;
  testCode?: string | null;
  status: LaboratoryOrderStatus;
  priority?: 'routine' | 'urgent' | 'stat' | string;
  orderedAt?: string | null;
  collectedAt?: string | null;
  specimenLabel?: string | null;
  collectedBy?: string | null;
  completedAt?: string | null;
  result?: string | null;
  resultUnit?: string | null;
  referenceRange?: string | null;
  remarks?: string | null;
  orderedBy?: string | null;
}

export interface CreateLaboratoryOrderPayload {
  patientId: number;
  testId: number;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalNotes?: string | null;
}

export interface UpdateLaboratoryResultPayload {
  result: string;
  resultUnit?: string | null;
  referenceRange?: string | null;
  remarks?: string | null;
  status?: 'completed' | 'processing';
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
    testCode: test.code || test.testCode || row.testCode || row.test_code || null,
    status: row.status || 'ordered',
    priority: row.priority || test.priority || 'routine',
    orderedAt: row.orderedAt || row.ordered_at || row.createdAt || null,
    collectedAt: row.collectedAt || row.collected_at || null,
    specimenLabel: row.specimenLabel || null,
    collectedBy: row.collectedBy?.fullName || null,
    completedAt: row.completedAt || row.completed_at || null,
    result: row.result ?? row.resultValue ?? null,
    resultUnit: row.resultUnit || row.result_unit || null,
    referenceRange: row.referenceRange || row.reference_range || null,
    remarks: row.remarks || row.resultNotes || row.notes || null,
    orderedBy: row.orderedBy?.fullName || row.orderedByName || row.orderedBy || null,
  };
}

export const laboratoryApi = {
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
    const response = await api.post<ApiEnvelope<any> | any>('/laboratory/orders', { patientId: payload.patientId, testId: payload.testId });
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
