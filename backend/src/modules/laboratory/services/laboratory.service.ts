import { AppDataSource } from '../../../config/data-source.js';
import { LaboratoryOrder, LaboratoryTest, Patient } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CollectLaboratorySampleInput, CreateLaboratoryOrderInput, UpdateLaboratoryResultInput } from '../validators/laboratory.validators.js';

export const laboratoryService = {
  listTests() { return AppDataSource.getRepository(LaboratoryTest).find({ where: { isActive: true }, order: { category: 'ASC', testName: 'ASC' } }); },
  async listOrders(filters: { patientId?: number; status?: LaboratoryOrder['status'] }) {
    return AppDataSource.getRepository(LaboratoryOrder).find({ where: { ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.status ? { status: filters.status } : {}) }, relations: { patient: true, test: true, doctor: true }, order: { orderedAt: 'DESC' } });
  },
  async createOrder(input: CreateLaboratoryOrderInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const [patient, test] = await Promise.all([manager.getRepository(Patient).findOne({ where: { id: input.patientId } }), manager.getRepository(LaboratoryTest).findOne({ where: { id: input.testId, isActive: true } })]);
      if (!patient) throw new NotFoundError('Patient not found'); if (!test) throw new NotFoundError('Laboratory test not found');
      const order = await manager.getRepository(LaboratoryOrder).save(manager.getRepository(LaboratoryOrder).create({ orderNumber: await nextSequenceNumber(manager, 'LAB', 'LAB', 6), patientId: input.patientId, testId: input.testId, doctorId: input.doctorId ?? null, status: 'ordered', orderedAt: new Date(), createdById: userId, collectedAt: null, completedAt: null, resultValue: null, resultUnit: null, referenceRange: null, resultNotes: null, resultedById: null }));
      return manager.getRepository(LaboratoryOrder).findOne({ where: { id: order.id }, relations: { patient: true, test: true, doctor: true } });
    });
  },
  async collectSample(orderId: number, input: CollectLaboratorySampleInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'ordered') throw new ConflictError('Only ordered samples can be collected');
      order.status = 'collected'; order.collectedAt = new Date(); order.specimenLabel = input.specimenLabel; order.collectedById = userId;
      await repo.save(order);
      return repo.findOne({ where: { id: orderId }, relations: { patient: true, test: true, doctor: true, collectedBy: true } });
    });
  },
  async updateResult(orderId: number, input: UpdateLaboratoryResultInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status === 'cancelled') throw new ValidationError('Cancelled laboratory order cannot be updated');
      if (order.status === 'ordered') throw new ConflictError('Collect the sample before entering a result');
      if (order.status === 'completed') throw new ConflictError('Completed results require an amendment workflow');
      order.status = input.status; order.resultValue = input.resultValue; order.resultUnit = input.resultUnit ?? null; order.referenceRange = input.referenceRange ?? null; order.resultNotes = input.resultNotes ?? null; order.completedAt = input.status === 'completed' ? new Date() : null; order.resultedById = userId;
      await repo.save(order);
      return repo.findOne({ where: { id: orderId }, relations: { patient: true, test: true, doctor: true, collectedBy: true } });
    });
  },
};
