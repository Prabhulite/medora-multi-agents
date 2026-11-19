import { AppDataSource } from '../../config/data-source.js';
import { FixedAsset } from '../../database/entities/FixedAsset.js';
import { FixedAssetMaintenance } from '../../database/entities/FixedAssetMaintenance.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import type { AssetInput, AssetUpdate, MaintenanceInput } from './fixed-assets.validators.js';

const assetRepo = () => AppDataSource.getRepository(FixedAsset);
const maintenanceRepo = () => AppDataSource.getRepository(FixedAssetMaintenance);
const serialize = (a: FixedAsset) => ({ ...a, purchaseCost: Number(a.purchaseCost), salvageValue: Number(a.salvageValue), disposalValue: a.disposalValue == null ? null : Number(a.disposalValue) });
const maintenance = (m: FixedAssetMaintenance) => ({ ...m, cost: Number(m.cost) });
async function findAsset(id: number) { const asset = await assetRepo().findOneBy({ id }); if (!asset) throw new NotFoundError('Fixed asset not found'); return asset; }
function validateState(a: FixedAsset) {
  if (Number(a.salvageValue) > Number(a.purchaseCost)) throw new ValidationError('Salvage value cannot exceed purchase cost');
  if (a.status === 'disposed') {
    if (!a.disposalDate || a.disposalValue == null) throw new ValidationError('Disposal date and value are required for disposed assets');
    if (a.disposalDate < a.purchaseDate) throw new ValidationError('Disposal date cannot precede purchase date');
  } else if (a.disposalDate || a.disposalValue != null) throw new ValidationError('Disposal fields require disposed status');
}
export const fixedAssetsService = {
  async list() { return (await assetRepo().find({ order: { createdAt: 'DESC' }, take: 500 })).map(serialize); },
  async get(id: number) { const asset = await findAsset(id); return { ...serialize(asset), maintenance: (await maintenanceRepo().find({ where: { assetId: id }, order: { performedOn: 'DESC', id: 'DESC' } })).map(maintenance) }; },
  async create(input: AssetInput, userId: number) {
    if (await assetRepo().findOneBy({ code: input.code })) throw new ConflictError('Asset code already exists');
    const asset = assetRepo().create({ ...input, purchaseCost: input.purchaseCost.toFixed(2), salvageValue: input.salvageValue.toFixed(2), location: input.location || null, serialNumber: input.serialNumber || null, usefulLifeMonths: input.usefulLifeMonths ?? null, notes: input.notes || null, status: 'active', createdByUserId: userId });
    try { return serialize(await assetRepo().save(asset)); } catch (error) { if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictError('Asset code already exists'); throw error; }
  },
  async update(id: number, input: AssetUpdate) {
    const asset = await findAsset(id);
    if (asset.status === 'disposed') throw new ConflictError('Disposed assets cannot be changed');
    Object.assign(asset, input);
    if (input.purchaseCost !== undefined) asset.purchaseCost = input.purchaseCost.toFixed(2);
    if (input.salvageValue !== undefined) asset.salvageValue = input.salvageValue.toFixed(2);
    if (input.disposalValue !== undefined) asset.disposalValue = input.disposalValue == null ? null : input.disposalValue.toFixed(2);
    validateState(asset);
    return serialize(await assetRepo().save(asset));
  },
  async addMaintenance(id: number, input: MaintenanceInput, userId: number) {
    const asset = await findAsset(id);
    if (asset.status === 'disposed') throw new ConflictError('Cannot maintain a disposed asset');
    if (input.performedOn < asset.purchaseDate) throw new ValidationError('Maintenance date cannot precede purchase date');
    const saved = await maintenanceRepo().save(maintenanceRepo().create({ ...input, assetId: id, cost: input.cost.toFixed(2), provider: input.provider || null, notes: input.notes || null, createdByUserId: userId }));
    return maintenance(saved);
  },
};
