import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';

/**
 * Permission-based authorization. Super admin bypasses all checks.
 * Permission codes are loaded from DB via authenticate middleware — never hardcode role names.
 */
export function authorize(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      if (req.user.isSuperAdmin) {
        next();
        return;
      }

      if (requiredPermissions.length === 0) {
        next();
        return;
      }

      const granted = new Set(req.user.permissions);
      const missing = requiredPermissions.filter((permission) => !granted.has(permission));

      if (missing.length > 0) {
        throw new ForbiddenError(
          `Missing required permission(s): ${missing.join(', ')}`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authorizeAny(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      if (req.user.isSuperAdmin) {
        next();
        return;
      }

      const granted = new Set(req.user.permissions);
      const hasAny = requiredPermissions.some((permission) => granted.has(permission));

      if (!hasAny) {
        throw new ForbiddenError(
          `Requires one of: ${requiredPermissions.join(', ')}`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
