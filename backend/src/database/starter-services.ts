import type { DataSource } from 'typeorm';
import { Department, ServiceCategory, ServiceMaster } from './entities/index.js';

// Starter catalog only. Prices are deliberately placeholders and must be reviewed locally.
const STARTER_SERVICES = [
  ['OP registration', 'consultation', 'front_office', 'OP'],
  ['General physician consultation', 'consultation', 'clinical', 'OP'],
  ['Specialist consultation', 'consultation', 'clinical', 'OP'],
  ['Follow-up consultation', 'consultation', 'clinical', 'OP'],
  ['Emergency consultation', 'emergency', 'clinical', 'OP'],
  ['Nursing consultation', 'nursing', 'clinical', 'OP'],
  ['Injection administration', 'procedure', 'clinical', 'Both'],
  ['IV cannulation', 'procedure', 'clinical', 'Both'],
  ['IV infusion administration', 'procedure', 'clinical', 'Both'],
  ['Wound dressing', 'procedure', 'clinical', 'Both'],
  ['Suture removal', 'procedure', 'clinical', 'Both'],
  ['Nebulization', 'procedure', 'clinical', 'Both'],
  ['ECG', 'investigation', 'clinical', 'Both'],
  ['Blood glucose test', 'investigation', 'clinical', 'Both'],
  ['Complete blood count (CBC)', 'investigation', 'clinical', 'Both'],
  ['Urine routine examination', 'investigation', 'clinical', 'Both'],
  ['HbA1c', 'investigation', 'clinical', 'Both'],
  ['Lipid profile', 'investigation', 'clinical', 'Both'],
  ['Liver function test', 'investigation', 'clinical', 'Both'],
  ['Kidney function test', 'investigation', 'clinical', 'Both'],
  ['Thyroid profile', 'investigation', 'clinical', 'Both'],
  ['X-ray chest', 'investigation', 'clinical', 'Both'],
  ['Ultrasound abdomen', 'investigation', 'clinical', 'Both'],
  ['CT scan', 'investigation', 'clinical', 'Both'],
  ['MRI scan', 'investigation', 'clinical', 'Both'],
  ['Bedside nursing care', 'nursing', 'clinical', 'IP'],
  ['General ward bed per day', 'room_charges', 'clinical', 'IP'],
  ['Private room per day', 'room_charges', 'clinical', 'IP'],
  ['ICU bed per day', 'room_charges', 'clinical', 'IP'],
  ['Emergency observation', 'emergency', 'clinical', 'Both'],
  ['Ambulance service', 'other_services', 'clinical', 'Both'],
  ['Medical certificate', 'other_services', 'clinical', 'OP'],
] as const;

export async function seedStarterServices(dataSource: DataSource): Promise<number> {
  const categories = await dataSource.getRepository(ServiceCategory).find();
  const departments = await dataSource.getRepository(Department).find();
  const categoryIds = new Map(categories.map((row) => [row.code, row.id]));
  const departmentIds = new Map(departments.map((row) => [row.code, row.id]));
  const repo = dataSource.getRepository(ServiceMaster);
  let created = 0;
  for (const [index, [serviceName, categoryCode, departmentCode, careType]] of STARTER_SERVICES.entries()) {
    const serviceCode = `STARTER-${String(index + 1).padStart(3, '0')}`;
    if (await repo.exist({ where: { serviceCode } })) continue;
    const categoryId = categoryIds.get(categoryCode);
    const departmentId = departmentIds.get(departmentCode);
    if (!categoryId || !departmentId) throw new Error(`Missing category or department for ${serviceName}`);
    await repo.save(repo.create({
      serviceCode,
      serviceName,
      categoryId,
      departmentId,
      serviceType: careType,
      billingApplicable: careType,
      defaultPrice: String((index % 3) + 1),
      taxPercent: null,
      description: 'Starter catalog: placeholder price; review before patient billing.',
      isActive: true,
      allowDiscount: true,
      defaultDiscountPercent: null,
      allowQuantity: true,
      defaultQuantity: '1',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      branchName: null,
    }));
    created += 1;
  }
  return created;
}
