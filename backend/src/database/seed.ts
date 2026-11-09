import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closeDataSource, initializeDataSource } from '../config/data-source.js';
import { Permission, Role, User } from './entities/index.js';

const PERMISSIONS = [
  { code: 'users.view', module: 'users', action: 'view', description: 'View users' },
  { code: 'users.create', module: 'users', action: 'create', description: 'Create users' },
  { code: 'users.update', module: 'users', action: 'update', description: 'Update users' },
  { code: 'users.delete', module: 'users', action: 'delete', description: 'Delete users' },
  { code: 'roles.view', module: 'roles', action: 'view', description: 'View roles' },
  { code: 'roles.create', module: 'roles', action: 'create', description: 'Create roles' },
  { code: 'roles.update', module: 'roles', action: 'update', description: 'Update roles' },
  { code: 'roles.delete', module: 'roles', action: 'delete', description: 'Delete roles' },
  { code: 'permissions.view', module: 'permissions', action: 'view', description: 'View permissions' },
] as const;

async function seed(): Promise<void> {
  const dataSource = await initializeDataSource();
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);

  for (const permission of PERMISSIONS) {
    const existing = await permissionRepo.findOne({ where: { code: permission.code } });
    if (existing) {
      existing.module = permission.module;
      existing.action = permission.action;
      existing.description = permission.description;
      await permissionRepo.save(existing);
    } else {
      await permissionRepo.save(permissionRepo.create(permission));
    }
  }

  const allPermissions = await permissionRepo.find();

  let superAdminRole = await roleRepo.findOne({
    where: { code: 'super_admin' },
    relations: { permissions: true },
  });

  if (!superAdminRole) {
    superAdminRole = roleRepo.create({
      code: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
      isActive: true,
      permissions: allPermissions,
    });
  } else {
    superAdminRole.name = 'Super Admin';
    superAdminRole.description = 'Full system access';
    superAdminRole.isSystem = true;
    superAdminRole.isActive = true;
    superAdminRole.permissions = allPermissions;
  }

  superAdminRole = await roleRepo.save(superAdminRole);

  const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12);

  let superAdminUser = await userRepo.findOne({
    where: { username: env.SUPER_ADMIN_USERNAME },
    relations: { roles: true },
  });

  if (!superAdminUser) {
    superAdminUser = userRepo.create({
      username: env.SUPER_ADMIN_USERNAME,
      email: env.SUPER_ADMIN_EMAIL,
      fullName: env.SUPER_ADMIN_FULL_NAME,
      passwordHash,
      isActive: true,
      isSuperAdmin: true,
      roles: [superAdminRole],
    });
  } else {
    superAdminUser.email = env.SUPER_ADMIN_EMAIL;
    superAdminUser.fullName = env.SUPER_ADMIN_FULL_NAME;
    superAdminUser.passwordHash = passwordHash;
    superAdminUser.isActive = true;
    superAdminUser.isSuperAdmin = true;
    superAdminUser.roles = [superAdminRole];
  }

  await userRepo.save(superAdminUser);

  console.log('Seed completed');
  console.log(`Super admin username: ${env.SUPER_ADMIN_USERNAME}`);
}

seed()
  .then(async () => {
    await closeDataSource();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await closeDataSource();
    process.exit(1);
  });
