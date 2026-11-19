import { AppDataSource } from '../../../config/data-source.js';
import { InventoryBatch, Medication, PurchaseOrder, PurchaseOrderItem, StockTransaction, Supplier } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreatePurchaseOrderInput, CreateSupplierInput, ReceivePurchaseOrderInput, CreateSupplierInvoiceInput, CreateSupplierPaymentInput } from '../validators/procurement.validators.js';

export const procurementService = {
  async listInvoices() {
    return AppDataSource.query(`SELECT i.id, i.supplier_id AS supplierId, s.name AS supplierName, i.purchase_order_id AS purchaseOrderId, po.order_number AS orderNumber, i.invoice_number AS invoiceNumber, i.invoice_date AS invoiceDate, i.due_date AS dueDate, i.amount, i.notes, COALESCE(p.paid_amount, 0) AS paidAmount, i.amount - COALESCE(p.paid_amount, 0) AS balance, i.created_at AS createdAt FROM supplier_invoices i JOIN suppliers s ON s.id = i.supplier_id LEFT JOIN purchase_orders po ON po.id = i.purchase_order_id LEFT JOIN (SELECT supplier_invoice_id, SUM(amount) AS paid_amount FROM supplier_invoice_payments GROUP BY supplier_invoice_id) p ON p.supplier_invoice_id = i.id ORDER BY i.created_at DESC, i.id DESC`);
  },
  async createInvoice(input: CreateSupplierInvoiceInput) {
    return AppDataSource.transaction(async (manager) => {
      const supplier = await manager.getRepository(Supplier).findOne({ where: { id: input.supplierId, isActive: true } });
      if (!supplier) throw new NotFoundError('Supplier not found');
      if (input.purchaseOrderId) {
        const order = await manager.getRepository(PurchaseOrder).findOne({ where: { id: input.purchaseOrderId } });
        if (!order || order.supplierId !== input.supplierId || order.status === 'cancelled') throw new ValidationError('Purchase order does not belong to this supplier');
      }
      const existing: Array<{ id: number }> = await manager.query('SELECT id FROM supplier_invoices WHERE supplier_id = ? AND invoice_number = ?', [input.supplierId, input.invoiceNumber]);
      if (existing.length) throw new ConflictError('Supplier invoice number already exists');
      const result: { insertId: number } = await manager.query('INSERT INTO supplier_invoices (supplier_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [input.supplierId, input.purchaseOrderId ?? null, input.invoiceNumber, input.invoiceDate, input.dueDate ?? null, input.amount.toFixed(2), input.notes ?? null]);
      return { id: result.insertId, ...input, supplierName: supplier.name, paidAmount: '0.00', balance: input.amount.toFixed(2) };
    });
  },
  async createPayment(invoiceId: number, input: CreateSupplierPaymentInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const rows: Array<{ id: number; amount: string; paidAmount: string }> = await manager.query('SELECT i.id, i.amount, COALESCE((SELECT SUM(p.amount) FROM supplier_invoice_payments p WHERE p.supplier_invoice_id = i.id), 0) AS paidAmount FROM supplier_invoices i WHERE i.id = ? FOR UPDATE', [invoiceId]);
      if (!rows.length) throw new NotFoundError('Supplier invoice not found');
      const cents = (value: number | string) => Math.round(Number(value) * 100);
      if (cents(input.amount) > cents(rows[0].amount) - cents(rows[0].paidAmount)) throw new ValidationError('Payment exceeds invoice balance');
      const result: { insertId: number } = await manager.query('INSERT INTO supplier_invoice_payments (supplier_invoice_id, amount, paid_on, method, reference, created_by_id) VALUES (?, ?, ?, ?, ?, ?)', [invoiceId, input.amount.toFixed(2), input.paidOn, input.method, input.reference ?? null, userId]);
      return { id: result.insertId, supplierInvoiceId: invoiceId, ...input, balance: ((cents(rows[0].amount) - cents(rows[0].paidAmount) - cents(input.amount)) / 100).toFixed(2) };
    });
  },
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
