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
    const cookieHeader = req.headers.cookie || '';
    const cookieToken = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('medora_session='))?.slice('medora_session='.length);
    const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
    if (!token) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }
    let payload: JwtPayload;

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (typeof decoded === 'string' || decoded.sub == null) {
        throw new UnauthorizedError('Invalid or expired token');
      }
      payload = {
        sub: Number(decoded.sub),
        username: String((decoded as jwt.JwtPayload).username ?? ''),
        sessionVersion: Number((decoded as jwt.JwtPayload).sessionVersion ?? 1),
      };
      if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0 || !Number.isSafeInteger(payload.sessionVersion)) {
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
    if (authUser.sessionVersion !== payload.sessionVersion) throw new UnauthorizedError('Session expired; sign in again');

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
