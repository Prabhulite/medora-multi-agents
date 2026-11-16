import { api } from '../../lib/api';

export interface AuditLog {
  id: number | string;
  timestamp: string | null;
  user: string;
  method: string;
  path: string;
  status: number | string | null;
  requestId: string | null;
}

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  search?: string;
  method?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ApiEnvelope<T> { data: T; }

function unwrap<T>(value: ApiEnvelope<T> | T): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as ApiEnvelope<T>).data
    : value;
}

function mapLog(row: any, index: number): AuditLog {
  const actor = row.user || row.actor || row.performedBy || row.username;
  const user = typeof actor === 'string'
    ? actor
    : actor?.username || actor?.fullName || actor?.name || 'System';
  return {
    id: row.id ?? row.logId ?? `audit-${index}`,
    timestamp: row.timestamp || row.createdAt || row.created_at || row.occurredAt || null,
    user,
    method: String(row.method || row.httpMethod || row.action || '—').toUpperCase(),
    path: row.path || row.route || row.url || row.endpoint || '—',
    status: row.status ?? row.statusCode ?? row.responseStatus ?? null,
    requestId: row.requestId || row.request_id || row.correlationId || null,
  };
}

export const auditApi = {
  async listLogs(filters: AuditLogFilters): Promise<AuditLogPage> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
    );
    const response = await api.get<ApiEnvelope<any> | any>('/audit-logs', { params });
    const raw = unwrap(response.data);
    const source = raw?.logs || raw?.items || raw?.rows || (Array.isArray(raw) ? raw : []);
    const items = (Array.isArray(source) ? source : []).map(mapLog);
    const page = Number(raw?.page ?? raw?.currentPage ?? filters.page) || filters.page;
    const pageSize = Number(raw?.pageSize ?? raw?.limit ?? filters.pageSize) || filters.pageSize;
    const total = Number(raw?.total ?? raw?.totalCount ?? raw?.count ?? items.length) || 0;
    const totalPages = Number(raw?.totalPages ?? raw?.pages) || Math.max(1, Math.ceil(total / pageSize));
    return { items, page, pageSize, total, totalPages };
  },
};
