import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closeDataSource, initializeDataSource } from '../config/data-source.js';
import {
  Department,
  Menu,
  Medication,
  Permission,
  RegistrationSource,
  Role,
  Specialization,
  User,
  Ward,
  Bed,
  InventoryBatch,
  StockTransaction,
  Supplier,
  LaboratoryTest,
  RadiologyModality,
  OperatingRoom,
} from './entities/index.js';

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
  { code: 'doctors.account_link', module: 'doctors', action: 'account_link', description: 'Link verified doctor records to staff login accounts' },
  { code: 'patients.view', module: 'patients', action: 'view', description: 'View patients' },
  { code: 'patients.create', module: 'patients', action: 'create', description: 'Register patients' },
  { code: 'patients.update', module: 'patients', action: 'update', description: 'Update patients' },
  { code: 'patients.registration_sources.manage', module: 'patients', action: 'registration_sources_manage', description: 'Manage patient registration sources' },
  { code: 'patients.delete', module: 'patients', action: 'delete', description: 'Deactivate patients' },
  { code: 'patients.merge', module: 'patients', action: 'merge', description: 'Merge duplicate patients' },
  { code: 'patients.export', module: 'patients', action: 'export', description: 'Export patient demographic record for interoperability' },
  {
    code: 'appointments.view',
    module: 'appointments',
    action: 'view',
    description: 'View appointments',
  },
  {
    code: 'appointments.create',
    module: 'appointments',
    action: 'create',
    description: 'Book appointments',
  },
  {
    code: 'appointments.update',
    module: 'appointments',
    action: 'update',
    description: 'Update appointment status and check-in',
  },
  {
    code: 'appointments.delete',
    module: 'appointments',
    action: 'delete',
    description: 'Cancel appointments',
  },
  {
    code: 'visits.view',
    module: 'visits',
    action: 'view',
    description: 'View OP check-in list',
  },
  {
    code: 'visits.checkin',
    module: 'visits',
    action: 'checkin',
    description: 'Perform OP check-in',
  },
  { code: 'visits.consult', module: 'visits', action: 'consult', description: 'Start OP consultation' },
  {
    code: 'visits.checkout',
    module: 'visits',
    action: 'checkout',
    description: 'Check out OP visits',
  },
  { code: 'clinical.view', module: 'clinical', action: 'view', description: 'View clinical encounters' },
  { code: 'clinical.create', module: 'clinical', action: 'create', description: 'Create clinical encounters' },
  { code: 'clinical.update', module: 'clinical', action: 'update', description: 'Update clinical encounters' },
  { code: 'clinical.catalog.manage', module: 'clinical', action: 'catalog_manage', description: 'Manage diagnosis terminology catalog' },
  { code: 'pharmacy.view', module: 'pharmacy', action: 'view', description: 'View prescriptions and pharmacy data' },
  { code: 'pharmacy.create', module: 'pharmacy', action: 'create', description: 'Create prescriptions' },
  { code: 'pharmacy.inventory.view', module: 'pharmacy_inventory', action: 'view', description: 'View pharmacy inventory' },
  { code: 'pharmacy.inventory.create', module: 'pharmacy_inventory', action: 'create', description: 'Receive pharmacy stock' },
  { code: 'pharmacy.inventory.update', module: 'pharmacy_inventory', action: 'update', description: 'Dispense pharmacy stock' },
  { code: 'pharmacy.inventory.adjust', module: 'pharmacy_inventory', action: 'adjust', description: 'Reconcile counted pharmacy batch stock' },
  { code: 'pharmacy.procurement.view', module: 'pharmacy_procurement', action: 'view', description: 'View pharmacy suppliers and purchase orders' },
  { code: 'pharmacy.procurement.create', module: 'pharmacy_procurement', action: 'create', description: 'Create pharmacy suppliers and purchase orders' },
  { code: 'pharmacy.procurement.update', module: 'pharmacy_procurement', action: 'update', description: 'Receive pharmacy purchase orders' },
  { code: 'laboratory.view', module: 'laboratory', action: 'view', description: 'View laboratory tests and orders' },
  { code: 'laboratory.create', module: 'laboratory', action: 'create', description: 'Order laboratory tests' },
  { code: 'laboratory.update', module: 'laboratory', action: 'update', description: 'Enter laboratory results' },
  { code: 'laboratory.verify', module: 'laboratory', action: 'verify', description: 'Verify laboratory results entered by another staff member' },
  { code: 'laboratory.release', module: 'laboratory', action: 'release', description: 'Release verified laboratory results' },
  { code: 'laboratory.amend', module: 'laboratory', action: 'amend', description: 'Append a correction to released laboratory results' },
  { code: 'laboratory.cancel', module: 'laboratory', action: 'cancel', description: 'Cancel an uncollected laboratory order with a reason' },
  { code: 'laboratory.catalog.manage', module: 'laboratory', action: 'catalog.manage', description: 'Manage laboratory test catalog' },
  { code: 'radiology.view', module: 'radiology', action: 'view', description: 'View radiology modalities and orders' },
  { code: 'radiology.create', module: 'radiology', action: 'create', description: 'Order radiology studies' },
  { code: 'radiology.update', module: 'radiology', action: 'update', description: 'Enter radiology reports' },
  { code: 'radiology.cancel', module: 'radiology', action: 'cancel', description: 'Cancel a pending imaging order with a reason' },
  { code: 'radiology.resources.manage', module: 'radiology', action: 'resources_manage', description: 'Manage radiology scanner and room resources' },
  { code: 'operations.view', module: 'operations', action: 'view', description: 'View hospital operations dashboard' },
  { code: 'audit.view', module: 'audit', action: 'view', description: 'View system audit logs' },
  { code: 'inpatient.view', module: 'inpatient', action: 'view', description: 'View wards, beds, and admissions' },
  { code: 'inpatient.create', module: 'inpatient', action: 'create', description: 'Admit patients' },
  { code: 'inpatient.update', module: 'inpatient', action: 'update', description: 'Update and discharge admissions' },
  { code: 'inpatient.handoff.reassign', module: 'inpatient', action: 'handoff_reassign', description: 'Reassign an unacknowledged nursing handoff with a reason' },
  { code: 'inpatient.handoff.escalate', module: 'inpatient', action: 'handoff_escalate', description: 'Escalate an overdue nursing handoff to another staff member' },
  { code: 'billing.view', module: 'billing', action: 'view', description: 'View invoices and balances' },
  { code: 'billing.closeout', module: 'billing', action: 'closeout', description: 'Close cashier cash drawer' },
  { code: 'billing.deposit', module: 'billing', action: 'deposit', description: 'Record bank deposits against closed cash' },
  { code: 'billing.deposit.void', module: 'billing', action: 'deposit_void', description: 'Void an erroneous cash deposit with a reason' },
  { code: 'billing.reconcile', module: 'billing', action: 'reconcile', description: 'Match cash deposits to bank statements' },
  { code: 'billing.create', module: 'billing', action: 'create', description: 'Create invoices' },
  { code: 'billing.update', module: 'billing', action: 'update', description: 'Record invoice payments' },
  { code: 'billing.charges.manage', module: 'billing_charges', action: 'manage', description: 'Create and update billing charge prices' },
  { code: 'emergency.view', module: 'emergency', action: 'view', description: 'View emergency queue and triage records' },
  { code: 'emergency.create', module: 'emergency', action: 'create', description: 'Create emergency triage records' },
  { code: 'emergency.update', module: 'emergency', action: 'update', description: 'Update emergency case status and disposition' },
  { code: 'surgery.view', module: 'surgery', action: 'view', description: 'View operating theatre schedule' },
  { code: 'surgery.create', module: 'surgery', action: 'create', description: 'Schedule surgery cases' },
  { code: 'surgery.update', module: 'surgery', action: 'update', description: 'Update surgery case status' },
  { code: 'roster.view', module: 'roster', action: 'view', description: 'View staff duty shifts' },
  { code: 'roster.manage', module: 'roster', action: 'manage', description: 'Schedule and close staff duty shifts' },
  { code: 'ambulance.view', module: 'ambulance', action: 'view', description: 'View ambulance vehicles and dispatch trips' },
  { code: 'blood_bank.view', module: 'blood_bank', action: 'view', description: 'View blood component units and traceability events' },
  { code: 'blood_bank.manage', module: 'blood_bank', action: 'manage', description: 'Receive, release, and discard blood units' },
  { code: 'blood_bank.issue', module: 'blood_bank', action: 'issue', description: 'Issue released blood units to patients' },
  { code: 'ambulance.dispatch', module: 'ambulance', action: 'dispatch', description: 'Dispatch ambulances and update trips' },
  { code: 'ambulance.manage', module: 'ambulance', action: 'manage', description: 'Create and update ambulance vehicles' },
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

const MEDICATIONS = [
  { medicineCode: 'PARA-500', genericName: 'Paracetamol', brandName: 'Paracetamol 500 mg', form: 'tablet', strength: '500', unit: 'mg' },
  { medicineCode: 'AMOX-500', genericName: 'Amoxicillin', brandName: 'Amoxicillin 500 mg', form: 'capsule', strength: '500', unit: 'mg' },
  { medicineCode: 'OMEP-20', genericName: 'Omeprazole', brandName: 'Omeprazole 20 mg', form: 'capsule', strength: '20', unit: 'mg' },
  { medicineCode: 'ORS-001', genericName: 'Oral rehydration salts', brandName: 'ORS Solution', form: 'sachet', strength: null, unit: null },
] as const;

const WARDS = [
  { code: 'GEN', name: 'General Ward', wardType: 'general', floor: 1, beds: ['GEN-01', 'GEN-02', 'GEN-03'] },
  { code: 'ICU', name: 'Intensive Care Unit', wardType: 'icu', floor: 1, beds: ['ICU-01', 'ICU-02'] },
] as const;

const OPERATING_ROOMS = [
  { code: 'OT-1', name: 'Operating Theatre 1' },
  { code: 'OT-2', name: 'Operating Theatre 2' },
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
  {
    code: 'front_office',
    label: 'Front Office',
    route: '/front-office',
    icon: 'front_office',
    permissionCode: null as string | null,
    parentCode: null as string | null,
    sortOrder: 30,
  },
  {
    code: 'patient_registration',
    label: 'Patient Registration',
    route: '/patients',
    icon: 'patients',
    permissionCode: 'patients.view',
    parentCode: 'front_office',
    sortOrder: 31,
  },
  {
    code: 'appointments',
    label: 'Appointments',
    route: '/appointments',
    icon: 'appointments',
    permissionCode: 'appointments.view',
    parentCode: 'front_office',
    sortOrder: 32,
  },
  {
    code: 'op_checkin',
    label: 'Check-in',
    route: '/checkin',
    icon: 'appointments',
    permissionCode: 'visits.view',
    parentCode: 'front_office',
    sortOrder: 33,
  },
  {
    code: 'inpatient',
    label: 'Inpatient Management',
    route: '/inpatient',
    icon: 'hospital_profile',
    permissionCode: 'inpatient.view',
    parentCode: 'front_office',
    sortOrder: 35,
  },
  {
    code: 'billing',
    label: 'Billing & Payments',
    route: '/billing',
    icon: 'menus',
    permissionCode: 'billing.view',
    parentCode: 'front_office',
    sortOrder: 36,
  },
  {
    code: 'pharmacy_inventory',
    label: 'Pharmacy Inventory',
    route: '/pharmacy',
    icon: 'medications',
    permissionCode: 'pharmacy.inventory.view',
    parentCode: 'front_office',
    sortOrder: 37,
  },
  {
    code: 'pharmacy_procurement',
    label: 'Pharmacy Procurement',
    route: '/pharmacy/procurement',
    icon: 'medications',
    permissionCode: 'pharmacy.procurement.view',
    parentCode: 'front_office',
    sortOrder: 38,
  },
  {
    code: 'laboratory',
    label: 'Laboratory',
    route: '/laboratory',
    icon: 'clinical',
    permissionCode: 'laboratory.view',
    parentCode: 'front_office',
    sortOrder: 39,
  },
  { code: 'radiology', label: 'Radiology', route: '/radiology', icon: 'clinical', permissionCode: 'radiology.view', parentCode: 'front_office', sortOrder: 38 },
  { code: 'emergency', label: 'Emergency Triage', route: '/emergency', icon: 'clinical', permissionCode: 'emergency.view', parentCode: 'front_office', sortOrder: 39 },
  { code: 'surgery', label: 'Operating Theatre', route: '/surgery', icon: 'hospital_profile', permissionCode: 'surgery.view', parentCode: 'front_office', sortOrder: 40 },
  { code: 'roster', label: 'Duty Roster', route: '/roster', icon: 'users', permissionCode: 'roster.view', parentCode: 'front_office', sortOrder: 41 },
  { code: 'ambulance', label: 'Ambulance Dispatch', route: '/ambulance', icon: 'hospital_profile', permissionCode: 'ambulance.view', parentCode: 'front_office', sortOrder: 42 },
  { code: 'operations', label: 'Operations Dashboard', route: '/operations', icon: 'dashboard', permissionCode: 'operations.view', parentCode: null as string | null, sortOrder: 15 },
  { code: 'audit', label: 'Audit Logs', route: '/audit-logs', icon: 'roles', permissionCode: 'audit.view', parentCode: 'master', sortOrder: 28 },
] as const;

const REGISTRATION_SOURCES = [
  { code: 'walk_in', name: 'Walk-in' },
  { code: 'referral', name: 'Referral' },
  { code: 'online', name: 'Online' },
  { code: 'camp', name: 'Medical Camp' },
] as const;

async function seed(): Promise<void> {
  const dataSource = await initializeDataSource();
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const menuRepo = dataSource.getRepository(Menu);
  const departmentRepo = dataSource.getRepository(Department);
  const specializationRepo = dataSource.getRepository(Specialization);
  const registrationSourceRepo = dataSource.getRepository(RegistrationSource);
  const medicationRepo = dataSource.getRepository(Medication);
  const wardRepo = dataSource.getRepository(Ward);
  const bedRepo = dataSource.getRepository(Bed);
  const inventoryRepo = dataSource.getRepository(InventoryBatch);
  const stockTransactionRepo = dataSource.getRepository(StockTransaction);
  const supplierRepo = dataSource.getRepository(Supplier);
  const laboratoryTestRepo = dataSource.getRepository(LaboratoryTest);
  const radiologyModalityRepo = dataSource.getRepository(RadiologyModality);
  const operatingRoomRepo = dataSource.getRepository(OperatingRoom);

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

  for (const source of REGISTRATION_SOURCES) {
    const existing = await registrationSourceRepo.findOne({ where: { code: source.code } });
    if (!existing) {
      await registrationSourceRepo.save(
        registrationSourceRepo.create({
          ...source,
          isActive: true,
        }),
      );
    }
  }

  for (const medication of MEDICATIONS) {
    const existing = await medicationRepo.findOne({ where: { medicineCode: medication.medicineCode } });
    if (existing) {
      Object.assign(existing, medication, { isActive: true });
      await medicationRepo.save(existing);
    } else {
      await medicationRepo.save(medicationRepo.create({ ...medication, isActive: true }));
    }
  }

  const medicationByCode = new Map((await medicationRepo.find()).map((medication) => [medication.medicineCode, medication] as const));
  const STOCK = [
    { code: 'PARA-500', batchNumber: 'PARA-2026-A', expiryDate: '2027-12-31', purchasePrice: '1.20', sellingPrice: '2.00', quantity: 100, reorderLevel: 20, storageLocation: 'Shelf A1' },
    { code: 'AMOX-500', batchNumber: 'AMOX-2026-A', expiryDate: '2027-10-31', purchasePrice: '4.00', sellingPrice: '6.50', quantity: 60, reorderLevel: 15, storageLocation: 'Shelf A2' },
    { code: 'OMEP-20', batchNumber: 'OMEP-2026-A', expiryDate: '2028-03-31', purchasePrice: '2.50', sellingPrice: '4.00', quantity: 80, reorderLevel: 15, storageLocation: 'Shelf A3' },
  ] as const;
  for (const stock of STOCK) {
    const medication = medicationByCode.get(stock.code);
    if (!medication) continue;
    let batch = await inventoryRepo.findOne({ where: { medicationId: medication.id, batchNumber: stock.batchNumber } });
    if (!batch) {
      batch = await inventoryRepo.save(inventoryRepo.create({ medicationId: medication.id, batchNumber: stock.batchNumber, expiryDate: stock.expiryDate, purchasePrice: stock.purchasePrice, sellingPrice: stock.sellingPrice, quantity: stock.quantity, reorderLevel: stock.reorderLevel, storageLocation: stock.storageLocation, isActive: true }));
      await stockTransactionRepo.save(stockTransactionRepo.create({ batchId: batch.id, type: 'receipt', quantity: stock.quantity, reference: 'SEED-OPENING-STOCK', notes: 'Opening stock supplied with demo environment', createdById: null }));
    }
  }

  const openingSupplier = await supplierRepo.findOne({ where: { code: 'MED-SUP-001' } });
  if (!openingSupplier) await supplierRepo.save(supplierRepo.create({ code: 'MED-SUP-001', name: 'Medora Medical Distributors', contactPerson: 'Procurement Desk', phone: '+91 90000 00000', email: 'procurement@medora.local', address: 'Medora Hospital campus', isActive: true }));

  const LAB_TESTS = [
    { testCode: 'CBC', testName: 'Complete Blood Count', category: 'Hematology', priority: 'routine' as const, turnaroundHours: 6, price: '450.00' },
    { testCode: 'RFT', testName: 'Renal Function Test', category: 'Biochemistry', priority: 'routine' as const, turnaroundHours: 12, price: '650.00' },
    { testCode: 'LFT', testName: 'Liver Function Test', category: 'Biochemistry', priority: 'routine' as const, turnaroundHours: 12, price: '700.00' },
    { testCode: 'TROP-I', testName: 'Troponin I', category: 'Cardiac', priority: 'urgent' as const, turnaroundHours: 2, price: '900.00' },
  ] as const;
  for (const test of LAB_TESTS) {
    const existing = await laboratoryTestRepo.findOne({ where: { testCode: test.testCode } });
    if (existing) { Object.assign(existing, test, { isActive: true }); await laboratoryTestRepo.save(existing); }
    else await laboratoryTestRepo.save(laboratoryTestRepo.create({ ...test, isActive: true }));
  }
  const MODALITIES = [
    { modalityCode: 'XRAY', modalityName: 'Digital X-Ray', category: 'X-Ray', turnaroundHours: 4, price: '500.00' },
    { modalityCode: 'USG', modalityName: 'Ultrasound Abdomen', category: 'Ultrasound', turnaroundHours: 8, price: '1200.00' },
    { modalityCode: 'CT', modalityName: 'CT Scan', category: 'CT', turnaroundHours: 24, price: '3500.00' },
    { modalityCode: 'MRI', modalityName: 'MRI Brain', category: 'MRI', turnaroundHours: 48, price: '6500.00' },
  ] as const;
  for (const modality of MODALITIES) {
    const existing = await radiologyModalityRepo.findOne({ where: { modalityCode: modality.modalityCode } });
    if (existing) { Object.assign(existing, modality, { isActive: true }); await radiologyModalityRepo.save(existing); }
    else await radiologyModalityRepo.save(radiologyModalityRepo.create({ ...modality, isActive: true }));
  }

  for (const wardSeed of WARDS) {
    let ward = await wardRepo.findOne({ where: { code: wardSeed.code } });
    if (!ward) ward = await wardRepo.save(wardRepo.create({ code: wardSeed.code, name: wardSeed.name, wardType: wardSeed.wardType, floor: wardSeed.floor, isActive: true }));
    for (const number of wardSeed.beds) {
      const existing = await bedRepo.findOne({ where: { wardId: ward.id, number } });
      if (!existing) await bedRepo.save(bedRepo.create({ wardId: ward.id, number, status: 'available', isActive: true }));
    }
  }

  for (const roomSeed of OPERATING_ROOMS) {
    const existing = await operatingRoomRepo.findOne({ where: { code: roomSeed.code } });
    if (!existing) await operatingRoomRepo.save(operatingRoomRepo.create({ ...roomSeed, isActive: true }));
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

  let superAdminUser = await userRepo.findOne({
    where: { username: env.SUPER_ADMIN_USERNAME },
    relations: { roles: true },
  });

  if (!superAdminUser) {
    const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12);
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
