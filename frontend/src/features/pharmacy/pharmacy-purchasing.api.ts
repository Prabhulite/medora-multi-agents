import { api } from '../../lib/api';

export interface PharmacySupplier {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  id?: number;
  medicationId: number;
  medicationName?: string;
  medicationCode?: string;
  quantity: number;
  unitCost: number;
  receivedQuantity?: number;
}

export interface PharmacyPurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName?: string;
  status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled' | string;
  orderedAt: string | null;
  expectedAt: string | null;
  totalAmount: number;
  notes: string | null;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderPayload {
  supplierId: number;
  expectedAt?: string | null;
  notes?: string | null;
  items: Array<{ medicationId: number; quantity: number; unitCost: number }>;
}

export interface ReceivePurchaseOrderPayload {
  receivedAt?: string | null;
  items?: Array<{ itemId: number; quantity: number; batchNumber: string; expiryDate: string; sellingPrice?: number }>;
  reference?: string | null;
}

interface Envelope<T> { data: T; }
function unwrap<T>(value: Envelope<T> | T): T {
  return value && typeof value === 'object' && 'data' in value ? (value as Envelope<T>).data : value;
}

function mapSupplier(row: any): PharmacySupplier {
  return {
    id: Number(row.id), code: row.code || row.supplierCode || `SUP-${row.id}`,
    name: row.name || row.companyName || 'Unnamed supplier',
    contactPerson: row.contactPerson || row.contact_name || null,
    phone: row.phone || row.phoneNumber || null, email: row.email || null,
    isActive: row.isActive !== false,
  };
}

function mapOrder(row: any): PharmacyPurchaseOrder {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: Number(row.id), orderNumber: row.orderNumber || row.poNumber || row.number || `PO-${row.id}`,
    supplierId: Number(row.supplierId ?? row.supplier?.id), supplierName: row.supplierName || row.supplier?.name,
    status: row.status || 'draft', orderedAt: row.orderedAt || row.orderDate || null,
    expectedAt: row.expectedAt || row.expectedDeliveryDate || null, totalAmount: Number(row.totalAmount ?? row.total ?? 0),
    notes: row.notes || null,
    items: items.map((item: any) => ({ id: item.id ? Number(item.id) : undefined, medicationId: Number(item.medicationId ?? item.medication?.id), medicationName: item.medicationName || item.medication?.brandName || item.medication?.genericName, medicationCode: item.medicationCode || item.medication?.medicineCode, quantity: Number(item.quantity || 0), unitCost: Number(item.unitCost ?? item.purchasePrice ?? 0), receivedQuantity: Number(item.receivedQuantity || 0) })),
  };
}

export const pharmacyPurchasingApi = {
  async listSuppliers(): Promise<PharmacySupplier[]> {
    const response = await api.get<Envelope<any[]> | any[]>('/pharmacy/suppliers');
    const rows = unwrap(response.data) || [];
    return rows.map(mapSupplier);
  },
  async listPurchaseOrders(): Promise<PharmacyPurchaseOrder[]> {
    const response = await api.get<Envelope<any[]> | any[]>('/pharmacy/purchase-orders');
    const rows = unwrap(response.data) || [];
    return rows.map(mapOrder);
  },
  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PharmacyPurchaseOrder> {
    const response = await api.post<Envelope<any> | any>('/pharmacy/purchase-orders', { orderDate: new Date().toISOString().slice(0, 10), expectedDate: payload.expectedAt, supplierId: payload.supplierId, notes: payload.notes, items: payload.items.map((item) => ({ medicationId: item.medicationId, quantity: item.quantity, unitPrice: item.unitCost })) });
    return mapOrder(unwrap(response.data));
  },
  async receivePurchaseOrder(id: number, payload: ReceivePurchaseOrderPayload): Promise<PharmacyPurchaseOrder> {
    const firstItem = payload.items?.[0];
    const response = await api.post<Envelope<any> | any>(`/pharmacy/purchase-orders/${id}/receive`, { batchNumber: firstItem?.batchNumber || 'RECEIPT', expiryDate: firstItem?.expiryDate || new Date().toISOString().slice(0, 10), reference: payload.reference || null });
    return mapOrder(unwrap(response.data));
  },
};
