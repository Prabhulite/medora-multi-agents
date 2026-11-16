import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { AppDataSource } from '../../../config/data-source.js';
import { User } from '../../../database/entities/index.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import type { AuthUser, JwtPayload } from '../../../shared/types/auth.js';
import { userRepository } from '../../users/repositories/user.repository.js';
import type { ChangePasswordInput, LoginInput } from '../validators/auth.validators.js';

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
      sessionVersion: authContext.sessionVersion,
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
  async changePassword(userId: number, input: ChangePasswordInput) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const user = await repo.createQueryBuilder('user').setLock('pessimistic_write').where('user.id = :id', { id: userId }).getOne();
      if (!user || !user.isActive || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect');
      if (await bcrypt.compare(input.newPassword, user.passwordHash)) throw new UnauthorizedError('New password must be different');
      user.passwordHash = await bcrypt.hash(input.newPassword, 12);
      user.sessionVersion += 1;
      await repo.save(user);
    });
  },
};
