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
  isQuarantined: boolean;
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
  fefoOverrideReason?: string | null;
}
export interface DispenseRecord { id: number; quantity: number; createdAt: string; reference: string | null; batch: { batchNumber: string; medication: { brandName: string } }; prescription: { id: number; medicineName: string } | null; createdBy: { fullName: string } | null }
export interface PharmacyPatientCandidate { id: number; mrdNumber: string; fullName: string }
export interface StockMovement { id: number; type: 'receipt' | 'dispense' | 'adjustment' | 'quarantine' | 'release' | 'disposal'; quantity: number; reference: string | null; notes: string | null; fefoOverrideReason: string | null; createdAt: string; createdByName: string | null }
export interface StockMovementPage { items: StockMovement[]; total: number; page: number; pageSize: number }
export interface StockAdjustment { batchId: number; previousQuantity: number; countedQuantity: number; difference: number; movementId: number }

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
    isQuarantined: Boolean(row.isQuarantined),
  };
}

export const pharmacyApi = {
  async disposeStock(batchId: number, expectedQuantity: number, quantity: number, reason: string): Promise<void> {
    await api.post(`/pharmacy/inventory/batches/${batchId}/disposals`, { expectedQuantity, quantity, reason });
  },
  async setBatchQuarantine(batchId: number, quarantined: boolean, reason: string): Promise<void> {
    await api.post(`/pharmacy/inventory/batches/${batchId}/${quarantined ? 'quarantine' : 'release'}`, { reason });
  },
  async movements(batchId: number, page = 1): Promise<StockMovementPage> {
    const response = await api.get<ApiEnvelope<StockMovementPage>>(`/pharmacy/inventory/batches/${batchId}/movements`, { params: { page, pageSize: 25 } });
    return response.data.data;
  },
  async adjustStock(batchId: number, expectedQuantity: number, countedQuantity: number, reason: string): Promise<StockAdjustment> {
    const response = await api.post<ApiEnvelope<StockAdjustment>>(`/pharmacy/inventory/batches/${batchId}/adjustments`, { expectedQuantity, countedQuantity, reason });
    return response.data.data;
  },
  async patients(search: string): Promise<PharmacyPatientCandidate[]> {
    const response = await api.get<ApiEnvelope<PharmacyPatientCandidate[]>>('/pharmacy/inventory/patients', { params: { search } });
    return response.data.data;
  },
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
