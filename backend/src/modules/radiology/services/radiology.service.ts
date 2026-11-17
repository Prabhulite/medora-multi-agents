import { AppDataSource } from '../../../config/data-source.js';
import { Doctor, Patient, RadiologyModality, RadiologyOrder, RadiologyReportAddendum, User, UserNotification } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateRadiologyAddendumInput, CreateRadiologyOrderInput, UpdateRadiologyReportInput } from '../validators/radiology.validators.js';

const orderRelations = { patient: true, modality: true, doctor: true } as const;

export const radiologyService = {
  async listAddenda(orderId: number) {
    if (!await AppDataSource.getRepository(RadiologyOrder).exist({ where: { id: orderId } })) throw new NotFoundError('Radiology order not found');
    const rows = await AppDataSource.getRepository(RadiologyReportAddendum).find({ where: { orderId }, relations: { createdBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, reason, addendum, createdById, createdAt, createdBy }) => ({ id, reason, addendum, createdById, createdAt, authorName: createdBy?.fullName ?? null }));
  },
  async addAddendum(orderId: number, input: CreateRadiologyAddendumInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(RadiologyOrder).createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Radiology order not found');
      if (order.status !== 'reported') throw new ConflictError('Only final reports can receive addenda');
      const repo = manager.getRepository(RadiologyReportAddendum);
      const row = await repo.save(repo.create({ orderId, reason: input.reason, addendum: input.addendum, createdById: userId }));
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'radiology_report_amended', sourceId: row.id, title: 'Radiology report addendum', message: `Radiology order ${order.orderNumber} has a report addendum. Open the radiology module to review it.`, route: '/radiology' });
        }
      }
      const author = userId ? await manager.getRepository(User).findOne({ where: { id: userId } }) : null;
      return { id: row.id, reason: row.reason, addendum: row.addendum, createdById: row.createdById, createdAt: row.createdAt, authorName: author?.fullName ?? null };
    });
  },
  listModalities() {
    return AppDataSource.getRepository(RadiologyModality).find({ where: { isActive: true }, order: { category: 'ASC', modalityName: 'ASC' } });
  },
  listOrders(filters: { patientId?: number; status?: RadiologyOrder['status'] }) {
    return AppDataSource.getRepository(RadiologyOrder).find({ where: { ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.status ? { status: filters.status } : {}) }, relations: orderRelations, order: { orderedAt: 'DESC' } });
  },
  async doctorCandidates(search: string) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const doctors = await AppDataSource.getRepository(Doctor).createQueryBuilder('doctor')
      .select(['doctor.id', 'doctor.name', 'doctor.doctorCode', 'doctor.medicalRegistrationNumber'])
      .where('doctor.is_active = 1')
      .andWhere('(doctor.name LIKE :search OR doctor.doctor_code LIKE :search OR doctor.medical_registration_number LIKE :search)', { search: `%${escaped}%` })
      .orderBy('doctor.name', 'ASC').take(20).getMany();
    return doctors.map((doctor) => ({ id: doctor.id, name: doctor.name, doctorCode: doctor.doctorCode, medicalRegistrationNumber: doctor.medicalRegistrationNumber }));
  },
  async createOrder(input: CreateRadiologyOrderInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const [patient, modality, doctor] = await Promise.all([
        manager.getRepository(Patient).findOne({ where: { id: input.patientId, isActive: true } }),
        manager.getRepository(RadiologyModality).findOne({ where: { id: input.modalityId, isActive: true } }),
        input.doctorId ? manager.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } }) : Promise.resolve(null),
      ]);
      if (!patient || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      if (!modality) throw new NotFoundError('Radiology modality not found');
      if (input.doctorId && !doctor) throw new NotFoundError('Active doctor not found');
      const repo = manager.getRepository(RadiologyOrder);
      const order = await repo.save(repo.create({ orderNumber: await nextSequenceNumber(manager, 'RAD', 'RAD', 6), patientId: input.patientId, modalityId: input.modalityId, studyName: input.studyName, doctorId: input.doctorId ?? null, status: 'ordered', priority: input.priority, clinicalNotes: input.clinicalNotes ?? null, orderedAt: new Date(), performedAt: null, reportedAt: null, reportText: null, impression: null, createdById: userId, reportedById: null }));
      return repo.findOne({ where: { id: order.id }, relations: orderRelations });
    });
  },
  async updateReport(orderId: number, input: UpdateRadiologyReportInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RadiologyOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Radiology order not found');
      if (order.status === 'cancelled') throw new ValidationError('Cancelled radiology order cannot be reported');
      if (order.status === 'reported') throw new ConflictError('Final reports require an amendment workflow');
      if (input.status === 'reported' && order.status !== 'performed') throw new ConflictError('Mark the study performed before final reporting');
      const reportText = input.reportText ?? order.reportText;
      if (input.status === 'reported' && !reportText?.trim()) throw new ValidationError('A final report requires report text');
      if (input.reportText !== undefined) order.reportText = input.reportText;
      if (input.impression !== undefined) order.impression = input.impression;
      if (input.status === 'performed') {
        order.status = 'performed';
        order.performedAt ??= new Date();
      } else {
        order.status = 'reported';
        order.reportedAt = new Date();
        order.reportedById = userId;
      }
      await repo.save(order);
      if (input.status === 'reported' && order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'radiology_report_final', sourceId: order.id, title: 'Radiology report finalized', message: `Radiology order ${order.orderNumber} has a final report. Open the radiology module to review it.`, route: '/radiology' });
        }
      }
      return repo.findOne({ where: { id: orderId }, relations: orderRelations });
    });
  },
};
