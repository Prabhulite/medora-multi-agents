import { AppDataSource } from '../../../config/data-source.js';
import { Admission, NursingHandoff, PatientAuditLog, User, UserNotification } from '../../../database/entities/index.js';

export async function sendOverdueHandoffReminders(): Promise<number> {
  let cursor = 0;
  let sent = 0;
  for (let batch = 0; batch < 10; batch += 1) {
    const candidates = await AppDataSource.getRepository(NursingHandoff).createQueryBuilder('handoff')
      .innerJoin('handoff.admission', 'admission')
      .innerJoin('handoff.recipient', 'recipient', 'recipient.is_active = 1')
      .where('handoff.id > :cursor', { cursor })
      .andWhere('handoff.acknowledged_at IS NULL AND handoff.closed_on_discharge_at IS NULL AND handoff.overdue_reminded_at IS NULL')
      .andWhere('handoff.acknowledgement_due_at <= CURRENT_TIMESTAMP(6)')
      .andWhere('admission.status IN (:...statuses)', { statuses: ['admitted', 'transferred'] })
      .select('handoff.id', 'id').addSelect('handoff.admissionId', 'admissionId')
      .orderBy('handoff.id', 'ASC').limit(100).getRawMany<{ id: number; admissionId: number }>();
    if (!candidates.length) break;
    for (const candidate of candidates) {
      cursor = Number(candidate.id);
      const didSend = await AppDataSource.transaction(async (manager) => {
        const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: candidate.admissionId }).getOne();
        if (!admission || !['admitted', 'transferred'].includes(admission.status)) return false;
        const handoff = await manager.getRepository(NursingHandoff).createQueryBuilder('handoff').setLock('pessimistic_write').where('handoff.id = :id AND handoff.admission_id = :admissionId', { id: candidate.id, admissionId: admission.id }).getOne();
        if (!handoff || handoff.acknowledgedAt || handoff.closedOnDischargeAt || handoff.overdueRemindedAt || !handoff.recipientId || !handoff.acknowledgementDueAt || handoff.acknowledgementDueAt.getTime() > Date.now()) return false;
        const recipient = await manager.getRepository(User).createQueryBuilder('staff')
          .leftJoin('staff.roles', 'role', 'role.is_active = 1').leftJoin('role.permissions', 'permission')
          .leftJoin('staff.roles', 'viewRole', 'viewRole.is_active = 1')
          .leftJoin('viewRole.permissions', 'viewPermission', 'viewPermission.code = :viewCode', { viewCode: 'inpatient.view' })
          .where('staff.id = :recipientId AND staff.is_active = 1', { recipientId: handoff.recipientId })
          .andWhere('(staff.is_super_admin = 1 OR (permission.code = :code AND viewPermission.code = :viewCode))', { code: 'inpatient.update', viewCode: 'inpatient.view' }).getOne();
        if (!recipient) return false;
        handoff.overdueRemindedAt = new Date();
        await manager.getRepository(NursingHandoff).save(handoff);
        await manager.getRepository(UserNotification).save({ recipientId: recipient.id, kind: 'nursing_handoff_overdue', sourceId: handoff.id, title: 'Nursing handoff overdue', message: `Handoff for admission ${admission.admissionNumber} is overdue. Review and acknowledge it in Inpatient Management.`, route: '/inpatient' });
        await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'nursing_handoff_overdue_reminded', changedById: null, changeSummary: `Overdue nursing handoff reminder sent for admission ${admission.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId: admission.id, handoffId: handoff.id, recipientId: recipient.id }) });
        return true;
      });
      if (didSend) sent += 1;
    }
    if (candidates.length < 100) break;
  }
  return sent;
}
