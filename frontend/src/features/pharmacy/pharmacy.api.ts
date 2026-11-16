import { api } from '../../lib/api';

export interface InventoryBatch {
  id: number;
  medicationId: number;
  medicationName: string;
  medicationCode: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  storageLocation: string | null;
}

export interface ReceiveStockPayload {
  medicationId: number;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel?: number;
  storageLocation?: string | null;
  reference?: string | null;
}

export interface DispenseStockPayload {
  batchId: number;
  quantity: number;
  patientId?: number | null;
  prescriptionId?: number | null;
  reference?: string | null;
}
export interface DispenseRecord { id: number; quantity: number; createdAt: string; reference: string | null; batch: { batchNumber: string; medication: { brandName: string } }; prescription: { id: number; medicineName: string } | null; createdBy: { fullName: string } | null }

interface ApiEnvelope<T> { data: T; }

function unwrap<T>(value: ApiEnvelope<T> | T): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as ApiEnvelope<T>).data
    : value;
}

function mapBatch(row: any): InventoryBatch {
  const medication = row.medication || {};
  return {
    id: Number(row.id),
    medicationId: Number(row.medicationId ?? medication.id),
    medicationName: row.medicationName || medication.brandName || medication.genericName || 'Unknown medication',
    medicationCode: row.medicationCode || medication.medicineCode || medication.code || '',
    batchNumber: row.batchNumber || row.batch || '—',
    expiryDate: row.expiryDate,
    purchasePrice: Number(row.purchasePrice || 0),
    sellingPrice: Number(row.sellingPrice || 0),
    quantity: Number(row.quantity || 0),
    reorderLevel: Number(row.reorderLevel || 0),
    storageLocation: row.storageLocation || null,
  };
}

export const pharmacyApi = {
  async listDispenses(patientId: number): Promise<DispenseRecord[]> {
    const response = await api.get<ApiEnvelope<DispenseRecord[]> | DispenseRecord[]>('/pharmacy/inventory/dispenses', { params: { patientId } });
    return unwrap(response.data) || [];
  },
  async listInventory(): Promise<InventoryBatch[]> {
    const response = await api.get<ApiEnvelope<any[]> | any[]>('/pharmacy/inventory');
    const rows = unwrap(response.data) || [];
    return rows.map(mapBatch);
  },

  async receiveStock(payload: ReceiveStockPayload): Promise<InventoryBatch> {
    const response = await api.post<ApiEnvelope<any> | any>('/pharmacy/inventory/receipts', payload);
    return mapBatch(unwrap(response.data));
  },

  async dispenseStock(payload: DispenseStockPayload): Promise<InventoryBatch> {
    const response = await api.post<ApiEnvelope<unknown> | unknown>('/pharmacy/inventory/dispense', payload);
    return mapBatch(unwrap(response.data));
  },
};
