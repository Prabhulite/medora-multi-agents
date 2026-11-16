import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { AppDataSource } from '../config/data-source.js';
import { SystemAuditLog } from '../database/entities/index.js';

export function auditRequest(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header('x-request-id')?.slice(0, 80) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  res.on('finish', () => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path === '/health') return;
    if (!AppDataSource.isInitialized) return;
    void AppDataSource.getRepository(SystemAuditLog).save({ requestId, userId: req.user?.id ?? null, method: req.method, path: req.path, statusCode: res.statusCode, module: req.path.split('/')[2] || null, ipAddress: req.ip?.slice(0, 45) ?? null, userAgent: req.get('user-agent')?.slice(0, 255) ?? null }).catch(() => undefined);
  });
  next();
}
