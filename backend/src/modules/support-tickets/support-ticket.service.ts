import { AppDataSource } from '../../config/data-source.js';
import { SupportTicket } from '../../database/entities/SupportTicket.js';
import { SupportTicketResponse } from '../../database/entities/SupportTicketResponse.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import type { AuthUser } from '../../shared/types/auth.js';
import type { z } from 'zod';
import type { createTicketSchema, listTicketSchema, respondTicketSchema, updateTicketSchema } from './support-ticket.validators.js';

type CreateInput = z.infer<typeof createTicketSchema>;
type ListInput = z.infer<typeof listTicketSchema>;
const canManage = (user: AuthUser) => user.isSuperAdmin || user.permissions.includes('support-tickets.manage');
const present = (ticket: SupportTicket) => ({ id: ticket.id, createdById: ticket.createdById, createdBy: ticket.createdBy ? { fullName: ticket.createdBy.fullName, email: ticket.createdBy.email } : undefined, issueTitle: ticket.issueTitle, description: ticket.description, status: ticket.status, priority: ticket.priority, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt });

export const supportTicketService = {
  async list(user: AuthUser, input: ListInput) {
    if (input.scope === 'all' && !canManage(user)) throw new ForbiddenError('Ticket management permission required');
    const rows = await AppDataSource.getRepository(SupportTicket).find({ where: { ...(input.scope === 'all' ? {} : { createdById: user.id }), ...(input.status ? { status: input.status } : {}) }, relations: { createdBy: true }, order: { createdAt: 'DESC' }, take: 200 });
    return rows.map(present);
  },
  async create(user: AuthUser, input: CreateInput) {
    const repo = AppDataSource.getRepository(SupportTicket);
    return present(await repo.save(repo.create({ ...input, createdById: user.id, status: 'Open' })));
  },
  async detail(user: AuthUser, id: number) {
    const ticket = await AppDataSource.getRepository(SupportTicket).findOne({ where: { id }, relations: { createdBy: true } });
    if (!ticket || (ticket.createdById !== user.id && !canManage(user))) throw new NotFoundError('Support ticket not found');
    const responses = await AppDataSource.getRepository(SupportTicketResponse).find({ where: { ticketId: id }, relations: { respondedBy: true }, order: { respondedAt: 'ASC' } });
    return { ...present(ticket), responses: responses.map((response) => ({ id: response.id, message: response.message, respondedAt: response.respondedAt, respondedBy: response.respondedBy.fullName })) };
  },
  async update(user: AuthUser, id: number, input: z.infer<typeof updateTicketSchema>) {
    if (!canManage(user)) throw new ForbiddenError();
    const repo = AppDataSource.getRepository(SupportTicket);
    const ticket = await repo.findOneBy({ id });
    if (!ticket) throw new NotFoundError('Support ticket not found');
    ticket.status = input.status;
    return present(await repo.save(ticket));
  },
  async respond(user: AuthUser, id: number, input: z.infer<typeof respondTicketSchema>) {
    if (!canManage(user)) throw new ForbiddenError();
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SupportTicket);
      const ticket = await repo.createQueryBuilder('ticket').setLock('pessimistic_write').where('ticket.id = :id', { id }).getOne();
      if (!ticket) throw new NotFoundError('Support ticket not found');
      if (ticket.status === 'Closed') throw new ForbiddenError('Closed tickets cannot receive responses');
      const response = await manager.getRepository(SupportTicketResponse).save({ ticketId: id, respondedById: user.id, message: input.message });
      ticket.status = 'Resolved';
      await repo.save(ticket);
      return { id: response.id, ticketId: id, message: response.message, respondedAt: response.respondedAt };
    });
  },
};
