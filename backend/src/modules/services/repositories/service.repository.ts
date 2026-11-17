import { AppDataSource } from '../../../config/data-source.js';
import {
  ServiceMaster,
  type ServiceCareType,
} from '../../../database/entities/index.js';

export interface ServiceView {
  id: number;
  serviceCode: string;
  serviceName: string;
  categoryId: number;
  categoryCode: string | null;
  categoryName: string | null;
  departmentId: number;
  departmentCode: string | null;
  departmentName: string | null;
  serviceType: ServiceCareType;
  defaultPrice: number;
  taxPercent: number | null;
  description: string | null;
  isActive: boolean;
  billingApplicable: ServiceCareType;
  allowDiscount: boolean;
  defaultDiscountPercent: number | null;
  allowQuantity: boolean;
  defaultQuantity: number;
  effectiveFrom: string;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView(row: ServiceMaster): ServiceView {
  return {
    id: row.id,
    serviceCode: row.serviceCode,
    serviceName: row.serviceName,
    categoryId: row.categoryId,
    categoryCode: row.category?.code ?? null,
    categoryName: row.category?.name ?? null,
    departmentId: row.departmentId,
    departmentCode: row.department?.code ?? null,
    departmentName: row.department?.name ?? null,
    serviceType: row.serviceType,
    defaultPrice: Number(row.defaultPrice),
    taxPercent: row.taxPercent == null ? null : Number(row.taxPercent),
    description: row.description,
    isActive: row.isActive,
    billingApplicable: row.billingApplicable,
    allowDiscount: row.allowDiscount,
    defaultDiscountPercent:
      row.defaultDiscountPercent == null ? null : Number(row.defaultDiscountPercent),
    allowQuantity: row.allowQuantity,
    defaultQuantity: Number(row.defaultQuantity),
    effectiveFrom: row.effectiveFrom,
    branchName: row.branchName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const relations = { category: true, department: true } as const;

export const serviceRepository = {
  repo() {
    return AppDataSource.getRepository(ServiceMaster);
  },

  async findAll() {
    const rows = await this.repo().find({
      relations,
      order: { serviceName: 'ASC' },
    });
    return rows.map(toView);
  },

  async findActive() {
    const rows = await this.repo().find({
      where: { isActive: true },
      relations,
      order: { serviceName: 'ASC' },
    });
    return rows.map(toView);
  },

  async findById(id: number) {
    const row = await this.repo().findOne({ where: { id }, relations });
    return row ? toView(row) : null;
  },
};
