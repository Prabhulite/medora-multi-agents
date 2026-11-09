import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closeDataSource, initializeDataSource } from '../config/data-source.js';
import { Department, Menu, Permission, Role, Specialization, User } from './entities/index.js';

const PERMISSIONS = [
  { code: 'users.view', module: 'users', action: 'view', description: 'View users' },
  { code: 'users.create', module: 'users', action: 'create', description: 'Create users' },
  { code: 'users.update', module: 'users', action: 'update', description: 'Update users' },
  { code: 'users.delete', module: 'users', action: 'delete', description: 'Delete users' },
  { code: 'roles.view', module: 'roles', action: 'view', description: 'View roles' },
  { code: 'roles.create', module: 'roles', action: 'create', description: 'Create roles' },
  { code: 'roles.update', module: 'roles', action: 'update', description: 'Update roles' },
  { code: 'roles.delete', module: 'roles', action: 'delete', description: 'Delete roles' },
  { code: 'departments.view', module: 'departments', action: 'view', description: 'View departments' },
  { code: 'departments.create', module: 'departments', action: 'create', description: 'Create departments' },
  { code: 'departments.update', module: 'departments', action: 'update', description: 'Update departments' },
  { code: 'departments.delete', module: 'departments', action: 'delete', description: 'Delete departments' },
  {
    code: 'hospital_profile.view',
    module: 'hospital_profile',
    action: 'view',
    description: 'View hospital profile',
  },
  {
    code: 'hospital_profile.update',
    module: 'hospital_profile',
    action: 'update',
    description: 'Update hospital profile',
  },
  {
    code: 'specializations.view',
    module: 'specializations',
    action: 'view',
    description: 'View specializations',
  },
  {
    code: 'specializations.create',
    module: 'specializations',
    action: 'create',
    description: 'Create specializations',
  },
  {
    code: 'specializations.update',
    module: 'specializations',
    action: 'update',
    description: 'Update specializations',
  },
  {
    code: 'specializations.delete',
    module: 'specializations',
    action: 'delete',
    description: 'Delete specializations',
  },
  { code: 'doctors.view', module: 'doctors', action: 'view', description: 'View doctors' },
  { code: 'doctors.create', module: 'doctors', action: 'create', description: 'Create doctors' },
  { code: 'doctors.update', module: 'doctors', action: 'update', description: 'Update doctors' },
  { code: 'doctors.delete', module: 'doctors', action: 'delete', description: 'Delete doctors' },
  { code: 'permissions.view', module: 'permissions', action: 'view', description: 'View permissions' },
  { code: 'menus.view', module: 'menus', action: 'view', description: 'View menus' },
  { code: 'menus.create', module: 'menus', action: 'create', description: 'Create menus' },
  { code: 'menus.update', module: 'menus', action: 'update', description: 'Update menus' },
  { code: 'menus.delete', module: 'menus', action: 'delete', description: 'Delete menus' },
] as const;

const DEPARTMENTS = [
  { code: 'admin', name: 'Administration' },
  { code: 'it', name: 'Information Technology' },
  { code: 'hr', name: 'Human Resources' },
  { code: 'finance', name: 'Finance' },
  { code: 'clinical', name: 'Clinical' },
  { code: 'front_office', name: 'Front Office' },
] as const;

const SPECIALIZATIONS = [
  { code: 'general_medicine', name: 'General Medicine' },
  { code: 'cardiology', name: 'Cardiology' },
  { code: 'orthopedics', name: 'Orthopedics' },
  { code: 'gynecology', name: 'Gynecology' },
  { code: 'pediatrics', name: 'Pediatrics' },
  { code: 'ivf', name: 'IVF' },
  { code: 'dermatology', name: 'Dermatology' },
  { code: 'ent', name: 'ENT' },
  { code: 'neurology', name: 'Neurology' },
  { code: 'ophthalmology', name: 'Ophthalmology' },
] as const;

const MENUS = [
  {
    code: 'dashboard',
    label: 'Dashboard',
    route: '/',
    icon: 'dashboard',
    permissionCode: null as string | null,
    parentCode: null as string | null,
    sortOrder: 10,
  },
  {
    code: 'master',
    label: 'Master',
    route: '/master',
    icon: 'master',
    permissionCode: null as string | null,
    parentCode: null as string | null,
    sortOrder: 20,
  },
  {
    code: 'hospital_profile',
    label: 'Hospital Profile',
    route: '/hospital-profile',
    icon: 'hospital',
    permissionCode: 'hospital_profile.view',
    parentCode: 'master',
    sortOrder: 21,
  },
  {
    code: 'users',
    label: 'User Management',
    route: '/users',
    icon: 'users',
    permissionCode: 'users.view',
    parentCode: 'master',
    sortOrder: 22,
  },
  {
    code: 'departments',
    label: 'Department Master',
    route: '/departments',
    icon: 'departments',
    permissionCode: 'departments.view',
    parentCode: 'master',
    sortOrder: 23,
  },
  {
    code: 'specializations',
    label: 'Specialization Master',
    route: '/specializations',
    icon: 'specializations',
    permissionCode: 'specializations.view',
    parentCode: 'master',
    sortOrder: 24,
  },
  {
    code: 'doctors',
    label: 'Doctor Master',
    route: '/doctors',
    icon: 'doctors',
    permissionCode: 'doctors.view',
    parentCode: 'master',
    sortOrder: 25,
  },
  {
    code: 'roles',
    label: 'Role Management',
    route: '/roles',
    icon: 'roles',
    permissionCode: 'roles.view',
    parentCode: 'master',
    sortOrder: 26,
  },
  {
    code: 'menus',
    label: 'Menu Management',
    route: '/menus',
    icon: 'menus',
    permissionCode: 'menus.view',
    parentCode: 'master',
    sortOrder: 27,
  },
] as const;

async function seed(): Promise<void> {
  const dataSource = await initializeDataSource();
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const menuRepo = dataSource.getRepository(Menu);
  const departmentRepo = dataSource.getRepository(Department);
  const specializationRepo = dataSource.getRepository(Specialization);

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

  for (const department of DEPARTMENTS) {
    const existing = await departmentRepo.findOne({ where: { code: department.code } });
    if (existing) {
      existing.name = department.name;
      existing.isActive = true;
      await departmentRepo.save(existing);
    } else {
      await departmentRepo.save(
        departmentRepo.create({
          ...department,
          isActive: true,
        }),
      );
    }
  }

  for (const specialization of SPECIALIZATIONS) {
    const existing = await specializationRepo.findOne({ where: { code: specialization.code } });
    if (existing) {
      existing.name = specialization.name;
      existing.isActive = true;
      await specializationRepo.save(existing);
    } else {
      await specializationRepo.save(
        specializationRepo.create({
          ...specialization,
          isActive: true,
        }),
      );
    }
  }

  for (const menu of MENUS) {
    const existing = await menuRepo.findOne({ where: { code: menu.code } });
    if (existing) {
      existing.label = menu.label;
      existing.route = menu.route;
      existing.icon = menu.icon;
      existing.permissionCode = menu.permissionCode;
      existing.sortOrder = menu.sortOrder;
      existing.isSystem = true;
      existing.isActive = true;
      await menuRepo.save(existing);
    } else {
      await menuRepo.save(
        menuRepo.create({
          code: menu.code,
          label: menu.label,
          route: menu.route,
          icon: menu.icon,
          permissionCode: menu.permissionCode,
          sortOrder: menu.sortOrder,
          parentId: null,
          isSystem: true,
          isActive: true,
        }),
      );
    }
  }

  const menusByCode = new Map(
    (await menuRepo.find()).map((menu) => [menu.code, menu] as const),
  );

  for (const menu of MENUS) {
    const current = menusByCode.get(menu.code);
    if (!current) continue;
    const parent = menu.parentCode ? menusByCode.get(menu.parentCode) : null;
    current.parentId = parent?.id ?? null;
    await menuRepo.save(current);
  }

  const allPermissions = await permissionRepo.find();
  const adminDepartment = await departmentRepo.findOne({ where: { code: 'admin' } });

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
      employeeId: 'EMP-0001',
      username: env.SUPER_ADMIN_USERNAME,
      email: env.SUPER_ADMIN_EMAIL,
      fullName: env.SUPER_ADMIN_FULL_NAME,
      mobileNumber: '9999999999',
      gender: null,
      designation: 'System Administrator',
      departmentId: adminDepartment?.id ?? null,
      passwordHash,
      isActive: true,
      isSuperAdmin: true,
      roles: [superAdminRole],
    });
  } else {
    superAdminUser.employeeId = superAdminUser.employeeId || 'EMP-0001';
    superAdminUser.email = env.SUPER_ADMIN_EMAIL;
    superAdminUser.fullName = env.SUPER_ADMIN_FULL_NAME;
    superAdminUser.mobileNumber = superAdminUser.mobileNumber || '9999999999';
    superAdminUser.designation = superAdminUser.designation || 'System Administrator';
    superAdminUser.departmentId = superAdminUser.departmentId ?? adminDepartment?.id ?? null;
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
