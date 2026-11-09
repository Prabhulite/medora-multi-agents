import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';
import type { JwtPayload } from '../shared/types/auth.js';
import { userRepository } from '../modules/users/repositories/user.repository.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = header.slice(7);
    let payload: JwtPayload;

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (typeof decoded === 'string' || decoded.sub == null) {
        throw new UnauthorizedError('Invalid or expired token');
      }
      payload = {
        sub: Number(decoded.sub),
        username: String((decoded as jwt.JwtPayload).username ?? ''),
      };
      if (!Number.isFinite(payload.sub)) {
        throw new UnauthorizedError('Invalid or expired token');
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError('Invalid or expired token');
    }

    const authUser = await userRepository.findAuthContextById(payload.sub);
    if (!authUser || !authUser.isActive) {
      throw new UnauthorizedError('Account is inactive or not found');
    }

    req.user = {
      id: authUser.id,
      username: authUser.username,
      fullName: authUser.fullName,
      email: authUser.email,
      roleIds: authUser.roleIds,
      roleCodes: authUser.roleCodes,
      permissions: authUser.permissions,
      isSuperAdmin: authUser.isSuperAdmin,
    };

    next();
  } catch (error) {
    next(error);
  }
}
