import { AppDataSource } from '../../../config/data-source.js';
import { DutyShift, User, UserNotification } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import type { CloseShiftInput, CreateShiftInput, ShiftListQuery } from '../validators/roster.validators.js';

function shiftResponse(shift: DutyShift) {
  const { staff, assignedBy, closedBy, ...fields } = shift;
  return { ...fields, staff: staff ? { id: staff.id, fullName: staff.fullName, employeeId: staff.employeeId, designation: staff.designation } : null, assignedBy: assignedBy ? { fullName: assignedBy.fullName } : null, closedBy: closedBy ? { fullName: closedBy.fullName } : null };
}
const relations = { staff: true, assignedBy: true, closedBy: true } as const;

export const rosterService = {
  async staff() {
    const rows = await AppDataSource.getRepository(User).find({ where: { isActive: true }, order: { fullName: 'ASC' } });
    return rows.map((user) => ({ id: user.id, fullName: user.fullName, employeeId: user.employeeId, designation: user.designation }));
  },
  async list(query: ShiftListQuery) {
    const rows = await AppDataSource.getRepository(DutyShift).createQueryBuilder('shift').leftJoinAndSelect('shift.staff', 'staff').leftJoinAndSelect('shift.assignedBy', 'assignedBy').leftJoinAndSelect('shift.closedBy', 'closedBy').where('shift.starts_at < :to AND shift.ends_at > :from', { from: new Date(query.from), to: new Date(query.to) }).andWhere(query.staffId ? 'shift.staff_id = :staffId' : '1=1', { staffId: query.staffId }).orderBy('shift.starts_at', 'ASC').addOrderBy('shift.id', 'ASC').getMany();
    return rows.map(shiftResponse);
  },
  async create(input: CreateShiftInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const staff = await manager.getRepository(User).createQueryBuilder('staff').setLock('pessimistic_write').where('staff.id = :id', { id: input.staffId }).getOne();
      if (!staff || !staff.isActive) throw new NotFoundError('Active staff member not found');
      const overlap = await manager.getRepository(DutyShift).createQueryBuilder('shift').where('shift.staff_id = :staffId AND shift.status = :status AND shift.starts_at < :end AND shift.ends_at > :start', { staffId: input.staffId, status: 'scheduled', start: new Date(input.startsAt), end: new Date(input.endsAt) }).getOne();
      if (overlap) throw new ConflictError('Staff member already has an overlapping shift');
      const created = await manager.getRepository(DutyShift).save(manager.getRepository(DutyShift).create({ staffId: input.staffId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), location: input.location, dutyRole: input.dutyRole, notes: input.notes ?? null, assignedById: userId }));
      await manager.getRepository(UserNotification).save(manager.getRepository(UserNotification).create({ recipientId: staff.id, kind: 'duty_shift_assigned', sourceId: created.id, title: 'Duty shift assigned', message: `${input.dutyRole} at ${input.location}, ${new Date(input.startsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} to ${new Date(input.endsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, route: '/roster' }));
      return shiftResponse((await manager.getRepository(DutyShift).findOne({ where: { id: created.id }, relations }))!);
    });
  },
  async close(id: number, input: CloseShiftInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const lookup = await manager.getRepository(DutyShift).findOne({ where: { id } });
      if (!lookup) throw new NotFoundError('Shift not found');
      await manager.getRepository(User).createQueryBuilder('staff').setLock('pessimistic_write').where('staff.id = :id', { id: lookup.staffId }).getOne();
      const shift = await manager.getRepository(DutyShift).createQueryBuilder('shift').setLock('pessimistic_write').where('shift.id = :id', { id }).getOne();
      if (!shift) throw new NotFoundError('Shift not found');
      if (shift.status !== 'scheduled') throw new ConflictError('Shift is already closed');
      shift.status = input.status; shift.closureNote = input.closureNote; shift.closedById = userId;
      await manager.getRepository(DutyShift).save(shift);
      if (input.status === 'cancelled') {
        const summary = `${shift.dutyRole} at ${shift.location}, ${shift.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}: ${input.closureNote}`;
        await manager.getRepository(UserNotification).save(manager.getRepository(UserNotification).create({ recipientId: shift.staffId, kind: 'duty_shift_cancelled', sourceId: shift.id, title: 'Duty shift cancelled', message: summary.length > 500 ? `${summary.slice(0, 497)}...` : summary, route: '/roster' }));
      }
      return shiftResponse((await manager.getRepository(DutyShift).findOne({ where: { id }, relations }))!);
    });
  },
};
