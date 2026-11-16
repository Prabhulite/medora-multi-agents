import { AppDataSource } from '../../../config/data-source.js';
import { InventoryBatch, Medication, PurchaseOrder, PurchaseOrderItem, StockTransaction, Supplier } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreatePurchaseOrderInput, CreateSupplierInput, ReceivePurchaseOrderInput } from '../validators/procurement.validators.js';

export const procurementService = {
  listSuppliers() { return AppDataSource.getRepository(Supplier).find({ where: { isActive: true }, order: { name: 'ASC' } }); },
  async createSupplier(input: CreateSupplierInput) {
    const repo = AppDataSource.getRepository(Supplier);
    if (await repo.findOne({ where: { code: input.code } })) throw new ConflictError('Supplier code already exists');
    return repo.save(repo.create({ ...input, contactPerson: input.contactPerson ?? null, phone: input.phone ?? null, email: input.email ?? null, address: input.address ?? null, isActive: true }));
  },
  listOrders() { return AppDataSource.getRepository(PurchaseOrder).find({ relations: { supplier: true, items: { medication: true } }, order: { createdAt: 'DESC' } }); },
  async createOrder(input: CreatePurchaseOrderInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const supplier = await manager.getRepository(Supplier).findOne({ where: { id: input.supplierId, isActive: true } });
      if (!supplier) throw new NotFoundError('Supplier not found');
      const medications = await Promise.all(input.items.map((item) => manager.getRepository(Medication).findOne({ where: { id: item.medicationId, isActive: true } })));
      if (medications.some((medication) => !medication)) throw new ValidationError('One or more medications are invalid or inactive');
      const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const order = await manager.getRepository(PurchaseOrder).save(manager.getRepository(PurchaseOrder).create({ orderNumber: await nextSequenceNumber(manager, 'PO', 'PO', 6), supplierId: input.supplierId, status: 'ordered', orderDate: input.orderDate, expectedDate: input.expectedDate ?? null, total: total.toFixed(2), notes: input.notes ?? null, createdById: userId }));
      await manager.getRepository(PurchaseOrderItem).save(input.items.map((item) => manager.getRepository(PurchaseOrderItem).create({ purchaseOrderId: order.id, medicationId: item.medicationId, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), total: (item.quantity * item.unitPrice).toFixed(2), receivedQuantity: 0 })));
      return manager.getRepository(PurchaseOrder).findOne({ where: { id: order.id }, relations: { supplier: true, items: { medication: true } } });
    });
  },
  async receiveOrder(orderId: number, input: ReceivePurchaseOrderInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(PurchaseOrder).findOne({ where: { id: orderId }, relations: { items: { medication: true }, supplier: true }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundError('Purchase order not found');
      if (order.status === 'cancelled' || order.status === 'received') throw new ValidationError('Purchase order is not receivable');
      const batchRepo = manager.getRepository(InventoryBatch); const transactionRepo = manager.getRepository(StockTransaction);
      for (const item of [...order.items].sort((a, b) => a.medicationId - b.medicationId)) {
        const remaining = item.quantity - item.receivedQuantity;
        if (!remaining) continue;
        await manager.getRepository(Medication).createQueryBuilder('medication').setLock('pessimistic_write').where('medication.id = :id', { id: item.medicationId }).getOne();
        let batch = await batchRepo.findOne({ where: { medicationId: item.medicationId, batchNumber: input.batchNumber }, lock: { mode: 'pessimistic_write' } });
        if (batch) { if (batch.expiryDate !== input.expiryDate) throw new ValidationError('Existing batch has a different expiry date'); batch.quantity += remaining; batch.purchasePrice = item.unitPrice; batch.isActive = true; batch.storageLocation = input.storageLocation ?? batch.storageLocation; }
        else batch = batchRepo.create({ medicationId: item.medicationId, batchNumber: input.batchNumber, expiryDate: input.expiryDate, purchasePrice: item.unitPrice, sellingPrice: item.unitPrice, quantity: remaining, reorderLevel: 0, storageLocation: input.storageLocation ?? null, isActive: true });
        batch = await batchRepo.save(batch);
        await transactionRepo.save(transactionRepo.create({ batchId: batch.id, type: 'receipt', quantity: remaining, reference: input.reference ?? order.orderNumber, notes: `Received from purchase order ${order.orderNumber}`, createdById: userId }));
        item.receivedQuantity = item.quantity; await manager.getRepository(PurchaseOrderItem).save(item);
      }
      order.status = 'received'; await manager.getRepository(PurchaseOrder).save(order);
      return manager.getRepository(PurchaseOrder).findOne({ where: { id: order.id }, relations: { supplier: true, items: { medication: true } } });
    });
  },
};
