import { AppDataSource } from '../../../config/data-source.js';
import { Doctor, DoctorAccountLinkEvent, User } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { LinkDoctorAccountInput, UnlinkDoctorAccountInput } from '../validators/doctor-account.validators.js';

const userSummary = (user: User) => ({ id: user.id, username: user.username, fullName: user.fullName, employeeId: user.employeeId, designation: user.designation, isActive: user.isActive });

export const doctorAccountService = {
  async candidates(search: string) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const users = await AppDataSource.getRepository(User).createQueryBuilder('user')
      .where('user.is_active = 1')
      .andWhere('NOT EXISTS (SELECT 1 FROM doctor_master doctor WHERE doctor.account_user_id = user.id)')
      .andWhere('(user.username LIKE :search OR user.full_name LIKE :search OR user.employee_id LIKE :search)', { search: `%${escaped}%` })
      .orderBy('user.full_name', 'ASC').take(20).getMany();
    return users.map(userSummary);
  },
  async get(doctorId: number) {
    const doctor = await AppDataSource.getRepository(Doctor).findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundError('Doctor not found');
    const [account, events] = await Promise.all([
      doctor.accountUserId ? AppDataSource.getRepository(User).findOne({ where: { id: doctor.accountUserId } }) : Promise.resolve(null),
      AppDataSource.getRepository(DoctorAccountLinkEvent).find({ where: { doctorId }, order: { id: 'DESC' }, take: 50 }),
    ]);
    return { doctor: { id: doctor.id, doctorCode: doctor.doctorCode, name: doctor.name, medicalRegistrationNumber: doctor.medicalRegistrationNumber, isActive: doctor.isActive }, account: account ? userSummary(account) : null, events };
  },
  async link(doctorId: number, input: LinkDoctorAccountInput, actorId: number) {
    await AppDataSource.transaction(async (manager) => {
      const doctor = await manager.getRepository(Doctor).createQueryBuilder('doctor').setLock('pessimistic_write').where('doctor.id = :id', { id: doctorId }).getOne();
      if (!doctor) throw new NotFoundError('Doctor not found');
      if (doctor.doctorCode !== input.doctorCode) throw new ValidationError('Doctor code confirmation does not match');
      if (!doctor.isActive) throw new ConflictError('Inactive doctor cannot be linked');
      if (doctor.accountUserId) throw new ConflictError('Doctor already has a linked account; unlink it first');
      const user = await manager.getRepository(User).createQueryBuilder('user').setLock('pessimistic_write').where('user.id = :id', { id: input.userId }).getOne();
      if (!user || !user.isActive) throw new NotFoundError('Active staff account not found');
      if (await manager.getRepository(Doctor).exist({ where: { accountUserId: user.id } })) throw new ConflictError('Staff account is already linked to a doctor');
      doctor.accountUserId = user.id;
      try { await manager.getRepository(Doctor).save(doctor); }
      catch (error) { if (error && typeof error === 'object' && 'driverError' in error && error.driverError && typeof error.driverError === 'object' && 'code' in error.driverError && error.driverError.code === 'ER_DUP_ENTRY') throw new ConflictError('Staff account is already linked to a doctor'); throw error; }
      await manager.getRepository(DoctorAccountLinkEvent).save({ doctorId, fromUserId: null, toUserId: user.id, actorId, reason: input.reason });
    });
    return this.get(doctorId);
  },
  async unlink(doctorId: number, input: UnlinkDoctorAccountInput, actorId: number) {
    await AppDataSource.transaction(async (manager) => {
      const doctor = await manager.getRepository(Doctor).createQueryBuilder('doctor').setLock('pessimistic_write').where('doctor.id = :id', { id: doctorId }).getOne();
      if (!doctor) throw new NotFoundError('Doctor not found');
      if (doctor.doctorCode !== input.doctorCode) throw new ValidationError('Doctor code confirmation does not match');
      if (!doctor.accountUserId) throw new ConflictError('Doctor has no linked account');
      const priorUserId = doctor.accountUserId;
      doctor.accountUserId = null;
      await manager.getRepository(Doctor).save(doctor);
      await manager.getRepository(DoctorAccountLinkEvent).save({ doctorId, fromUserId: priorUserId, toUserId: null, actorId, reason: input.reason });
    });
    return this.get(doctorId);
  },
};
