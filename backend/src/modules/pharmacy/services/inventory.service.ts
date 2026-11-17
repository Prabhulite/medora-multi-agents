import { AppDataSource } from '../../../config/data-source.js';
import { InventoryBatch, Medication, Patient, Prescription, StockTransaction } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { DispenseStockInput, ReceiveStockInput } from '../validators/inventory.validators.js';
import { assertNoRecordedAllergy } from '../../clinical/services/allergy-check.js';

export const inventoryService = {
  async patients(search: string) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const rows = await AppDataSource.getRepository(Patient).createQueryBuilder('patient')
      .select(['patient.id', 'patient.mrdNumber', 'patient.firstName', 'patient.middleName', 'patient.lastName'])
      .where('patient.is_active = 1 AND patient.merged_into_patient_id IS NULL')
      .andWhere('(patient.mrd_number LIKE :search OR patient.first_name LIKE :search OR patient.last_name LIKE :search)', { search: `%${escaped}%` })
      .orderBy('patient.id', 'DESC').take(10).getMany();
    return rows.map((patient) => ({ id: patient.id, mrdNumber: patient.mrdNumber, fullName: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') }));
  },
  async dispenses(patientId: number) {
    const rows = await AppDataSource.getRepository(StockTransaction).find({ where: { patientId, type: 'dispense' }, relations: { batch: { medication: true }, prescription: true, createdBy: true }, order: { createdAt: 'DESC' }, take: 200 });
    return rows.map((row) => ({ ...row, createdBy: row.createdBy ? { id: row.createdBy.id, fullName: row.createdBy.fullName } : null }));
  },
  list(filters: { medicationId?: number; lowStock?: boolean }) {
    return AppDataSource.getRepository(InventoryBatch).find({ where: { ...(filters.medicationId ? { medicationId: filters.medicationId } : {}), isActive: true }, relations: { medication: true }, order: { expiryDate: 'ASC', updatedAt: 'DESC' } }).then((rows) => filters.lowStock ? rows.filter((row) => row.quantity <= row.reorderLevel) : rows);
  },
  async receive(input: ReceiveStockInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const medication = await manager.getRepository(Medication).createQueryBuilder('medication').setLock('pessimistic_write').where('medication.id = :id', { id: input.medicationId }).andWhere('medication.is_active = 1').getOne();
      if (!medication) throw new NotFoundError('Medication not found or inactive');
      const repo = manager.getRepository(InventoryBatch);
      let batch = await repo.findOne({ where: { medicationId: input.medicationId, batchNumber: input.batchNumber }, lock: { mode: 'pessimistic_write' } });
      if (batch) {
        if (batch.expiryDate !== input.expiryDate) throw new ConflictError('Existing batch has a different expiry date');
        batch.purchasePrice = input.purchasePrice.toFixed(2); batch.sellingPrice = input.sellingPrice.toFixed(2);
        batch.quantity += input.quantity; batch.reorderLevel = input.reorderLevel; batch.storageLocation = input.storageLocation ?? null; batch.isActive = true;
      } else {
        batch = repo.create({ medicationId: input.medicationId, batchNumber: input.batchNumber, expiryDate: input.expiryDate, purchasePrice: input.purchasePrice.toFixed(2), sellingPrice: input.sellingPrice.toFixed(2), quantity: input.quantity, reorderLevel: input.reorderLevel, storageLocation: input.storageLocation ?? null, isActive: true });
      }
      batch = await repo.save(batch);
      await manager.getRepository(StockTransaction).save(manager.getRepository(StockTransaction).create({ batchId: batch.id, type: 'receipt', quantity: input.quantity, reference: input.reference ?? null, notes: input.notes ?? null, createdById: userId }));
      return repo.findOne({ where: { id: batch.id }, relations: { medication: true } });
    });
  },
  async dispense(input: DispenseStockInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      let prescription: Prescription | null = null;
      if (input.prescriptionId) {
        prescription = await manager.getRepository(Prescription).createQueryBuilder('prescription').setLock('pessimistic_write').where('prescription.id = :id', { id: input.prescriptionId }).getOne();
        if (!prescription || prescription.status !== 'active' || prescription.patientId !== input.patientId || !prescription.medicationId || !prescription.quantityPrescribed) throw new ValidationError('Active catalog prescription with a prescribed quantity for this patient is required');
      }
      const repo = manager.getRepository(InventoryBatch);
      const batch = await repo.findOne({ where: { id: input.batchId, isActive: true }, relations: { medication: true }, lock: { mode: 'pessimistic_write' } });
      if (!batch) throw new NotFoundError('Inventory batch not found');
      const today = new Date();
      const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
      if (batch.expiryDate < localDate) throw new ValidationError('Cannot dispense an expired batch');
      if (batch.quantity < input.quantity) throw new ValidationError(`Insufficient stock. Available: ${batch.quantity}`);
      if (prescription) {
        if (batch.medicationId !== prescription.medicationId) throw new ValidationError('Batch medication does not match the prescription');
        const prescribedQuantity = prescription.quantityPrescribed;
        if (prescribedQuantity == null) throw new ValidationError('Prescription quantity is required');
        const result = await manager.getRepository(StockTransaction).createQueryBuilder('transaction').select('COALESCE(SUM(-transaction.quantity), 0)', 'dispensed').where('transaction.prescription_id = :prescriptionId', { prescriptionId: prescription.id }).andWhere('transaction.type = :type', { type: 'dispense' }).getRawOne<{ dispensed: string }>();
        const remaining = prescribedQuantity - Number(result?.dispensed ?? 0);
        if (input.quantity > remaining) throw new ValidationError(`Dispense exceeds prescribed quantity. Remaining: ${remaining}`);
      }
      if (input.patientId) {
        const patient = await manager.getRepository(Patient).findOne({ where: { id: input.patientId, isActive: true } });
        if (!patient || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
        await assertNoRecordedAllergy(manager, input.patientId, [batch.medication.brandName, batch.medication.genericName, prescription?.medicineName]);
      }
      batch.quantity -= input.quantity; await repo.save(batch);
      await manager.getRepository(StockTransaction).save(manager.getRepository(StockTransaction).create({ batchId: batch.id, type: 'dispense', quantity: -input.quantity, patientId: input.patientId ?? null, prescriptionId: prescription?.id ?? null, reference: input.reference ?? null, notes: input.notes ?? null, createdById: userId }));
      return repo.findOne({ where: { id: batch.id }, relations: { medication: true } });
    });
  },
};
