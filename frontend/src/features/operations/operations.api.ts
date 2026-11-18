import { api } from '../../lib/api';

export interface OperationsKpis {
  appointmentsToday: number;
  appointmentsWaiting: number;
  admissionsActive: number;
  bedsAvailable: number;
  billingOutstanding: number;
  lowStockItems: number;
  labPending: number;
  radiologyPending: number;
}

export interface OperationsQueueItem {
  id: string | number;
  patientId?: number | null;
  label: string;
  detail?: string | null;
  status?: string | null;
  priority?: string | null;
  timestamp?: string | null;
  count?: number | null;
}

export interface OperationsAlert {
  id: string | number;
  title: string;
  detail?: string | null;
  severity: 'critical' | 'warning' | 'info' | string;
  count?: number | null;
}

export interface OperationsDashboard {
  generatedAt?: string | null;
  kpis: OperationsKpis;
  queues: {
    appointments: OperationsQueueItem[];
    admissions: OperationsQueueItem[];
    billing: OperationsQueueItem[];
    laboratory: OperationsQueueItem[];
    radiology: OperationsQueueItem[];
  };
  alerts: OperationsAlert[];
}

interface ApiEnvelope<T> { data: T; }

function unwrap<T>(value: ApiEnvelope<T> | T): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as ApiEnvelope<T>).data
    : value;
}

function numberValue(...values: unknown[]): number {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null);
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function mapQueueItem(row: any, index: number, prefix: string): OperationsQueueItem {
  return {
    id: row.id ?? row.key ?? `${prefix}-${index}`,
    patientId: row.patientId ?? row.patient?.id ?? null,
    label: row.label || row.title || row.name || row.patientName || row.orderNumber || row.admissionNumber || `${prefix} item`,
    detail: row.detail || row.description || row.patientMrdNumber || row.mrdNumber || row.testName || row.modalityName || null,
    status: row.status || null,
    priority: row.priority || null,
    timestamp: row.timestamp || row.time || row.createdAt || row.orderedAt || row.scheduledAt || null,
    count: row.count == null ? null : numberValue(row.count),
  };
}

function mapDashboard(raw: any): OperationsDashboard {
  const source = raw?.dashboard || raw?.summary || raw || {};
  const k = source.kpis || source.metrics || source;
  const queues = source.queues || {};
  const list = (value: any, prefix: string) => (Array.isArray(value) ? value : []).map((row, index) => mapQueueItem(row, index, prefix));

  return {
    generatedAt: source.generatedAt || source.generated_at || null,
    kpis: {
      appointmentsToday: numberValue(k.appointmentsToday, k.appointments_today, k.todayAppointments),
      appointmentsWaiting: numberValue(k.appointmentsWaiting, k.appointments_waiting, k.waitingAppointments),
      admissionsActive: numberValue(k.admissionsActive, k.activeAdmissions, k.admissions_active),
      bedsAvailable: numberValue(k.bedsAvailable, k.availableBeds, k.beds_available),
      billingOutstanding: numberValue(k.billingOutstanding, k.outstandingBilling, k.billing_outstanding),
      lowStockItems: numberValue(k.lowStockItems, k.lowStock, k.low_stock_items),
      labPending: numberValue(k.labPending, k.laboratoryPending, k.lab_pending),
      radiologyPending: numberValue(k.radiologyPending, k.radiology_pending),
    },
    queues: {
      appointments: list(queues.appointments || source.appointments, 'appointment'),
      admissions: list(queues.admissions || source.admissions, 'admission'),
      billing: list(queues.billing || source.billing, 'billing'),
      laboratory: list(queues.laboratory || queues.lab || source.laboratory || source.lab, 'lab'),
      radiology: list(queues.radiology || source.radiology, 'radiology'),
    },
    alerts: (Array.isArray(source.alerts) ? source.alerts : []).map((row: any, index: number) => ({
      id: row.id ?? row.key ?? `alert-${index}`,
      title: row.title || row.label || row.name || 'Operational alert',
      detail: row.detail || row.description || null,
      severity: row.severity || row.level || 'info',
      count: row.count == null ? null : numberValue(row.count),
    })),
  };
}

export const operationsApi = {
  async getDashboard(): Promise<OperationsDashboard> {
    const response = await api.get<ApiEnvelope<any> | any>('/operations/dashboard');
    return mapDashboard(unwrap(response.data));
  },
  async downloadCsv(): Promise<void> {
    const response = await api.get<Blob>('/operations/dashboard.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `medora-operations-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  },
};
