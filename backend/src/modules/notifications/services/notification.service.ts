import { AppDataSource } from '../../../config/data-source.js';
import { UserNotification } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

export const notificationService = {
  async list(recipientId: number, beforeId?: number) {
    const repo = AppDataSource.getRepository(UserNotification);
    const query = repo.createQueryBuilder('notification').where('notification.recipient_id = :recipientId', { recipientId });
    if (beforeId) query.andWhere('notification.id < :beforeId', { beforeId });
    const rows = await query.orderBy('notification.id', 'DESC').take(51).getMany();
    const items = rows.slice(0, 50);
    const unreadCount = await repo.createQueryBuilder('notification').where('notification.recipient_id = :recipientId AND notification.read_at IS NULL', { recipientId }).getCount();
    return { items, unreadCount, nextCursor: rows.length > 50 ? items[items.length - 1].id : null };
  },
  async markRead(recipientId: number, id: number) {
    const repo = AppDataSource.getRepository(UserNotification);
    const result = await repo.createQueryBuilder().update().set({ readAt: () => 'CURRENT_TIMESTAMP(6)' }).where('id = :id AND recipient_id = :recipientId AND read_at IS NULL', { id, recipientId }).execute();
    if (!result.affected) {
      const existing = await repo.findOne({ where: { id, recipientId } });
      if (!existing) throw new NotFoundError('Notification not found');
      return existing;
    }
    return repo.findOneByOrFail({ id, recipientId });
  },
};
