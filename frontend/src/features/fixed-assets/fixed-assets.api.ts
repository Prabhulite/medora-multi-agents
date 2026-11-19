import { api } from '../../lib/api';

export interface Asset { id: number; code: string; name: string; category: string; location: string | null; serialNumber: string | null; purchaseDate: string; purchaseCost: number; salvageValue: number; usefulLifeMonths: number | null; status: 'active' | 'in_maintenance' | 'disposed'; disposalDate: string | null; disposalValue: number | null; notes: string | null }
export interface Maintenance { id: number; assetId: number; performedOn: string; description: string; cost: number; provider: string | null; notes: string | null }
export type AssetDetail = Asset & { maintenance: Maintenance[] };
export const fixedAssetsApi = {
  async list() { return (await api.get<{ data: Asset[] }>('/fixed-assets')).data.data; },
  async get(id: number) { return (await api.get<{ data: AssetDetail }>(`/fixed-assets/${id}`)).data.data; },
  async create(input: object) { return (await api.post('/fixed-assets', input)).data.data; },
  async update(id: number, input: object) { return (await api.patch(`/fixed-assets/${id}`, input)).data.data; },
  async addMaintenance(id: number, input: object) { return (await api.post(`/fixed-assets/${id}/maintenance`, input)).data.data; },
};
