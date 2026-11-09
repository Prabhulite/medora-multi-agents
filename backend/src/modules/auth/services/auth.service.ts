import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import type { AuthUser, JwtPayload } from '../../../shared/types/auth.js';
import { userRepository } from '../../users/repositories/user.repository.js';
import type { LoginInput } from '../validators/auth.validators.js';

function toPublicUser(authUser: NonNullable<Awaited<ReturnType<typeof userRepository.findAuthContextById>>>): AuthUser {
  return {
    id: authUser.id,
    username: authUser.username,
    fullName: authUser.fullName,
    email: authUser.email,
    roleIds: authUser.roleIds,
    roleCodes: authUser.roleCodes,
    permissions: authUser.permissions,
    isSuperAdmin: authUser.isSuperAdmin,
  };
}

export const authService = {
  async login(input: LoginInput) {
    const user = await userRepository.findByUsername(input.username);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const authContext = await userRepository.findAuthContextById(user.id);
    if (!authContext) {
      throw new UnauthorizedError('Unable to load user context');
    }

    await userRepository.touchLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      user: toPublicUser(authContext),
    };
  },

  async me(userId: number) {
    const authContext = await userRepository.findAuthContextById(userId);
    if (!authContext || !authContext.isActive) {
      throw new UnauthorizedError('Account is inactive or not found');
    }

    return toPublicUser(authContext);
  },
};
