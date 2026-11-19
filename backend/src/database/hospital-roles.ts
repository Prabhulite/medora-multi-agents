import type { DataSource } from 'typeorm';
import { Permission } from './entities/Permission.js';
import { Role } from './entities/Role.js';

const hospitalRoles = [
  { code: 'front_desk', name: 'Front Desk', description: 'Register patients and manage appointments and OP check-in', permissions: 'patients.view patients.create patients.update appointments.view appointments.create appointments.update doctors.view departments.view visits.view visits.checkin visits.checkout' },
  { code: 'physician', name: 'Physician', description: 'Review charts and manage consultations and clinical orders', permissions: 'patients.view doctors.workspace.view visits.view visits.consult clinical.view clinical.create clinical.update laboratory.view laboratory.create radiology.view radiology.create pharmacy.view pharmacy.create inpatient.view vaccination.view vaccination.record' },
  { code: 'ward_nurse', name: 'Ward Nurse', description: 'Manage ward care and nursing handoffs', permissions: 'patients.view clinical.view inpatient.view inpatient.update vaccination.view vaccination.record' },
  { code: 'admissions_clerk', name: 'Admissions Clerk', description: 'Register inpatient admissions and review bed availability', permissions: 'patients.view inpatient.view inpatient.create doctors.view departments.view' },
  { code: 'emergency_nurse', name: 'Emergency Triage Nurse', description: 'Record emergency arrivals and triage details', permissions: 'patients.view emergency.view emergency.create emergency.update' },
  { code: 'emergency_physician', name: 'Emergency Physician', description: 'Manage emergency care and clinical orders', permissions: 'patients.view emergency.view emergency.update clinical.view clinical.create clinical.update laboratory.view laboratory.create radiology.view radiology.create' },
  { code: 'theatre_coordinator', name: 'Operating Theatre Coordinator', description: 'Schedule and maintain theatre cases', permissions: 'patients.view surgery.view surgery.create surgery.update doctors.view' },
  { code: 'lab_technician', name: 'Lab Technician', description: 'Enter laboratory results', permissions: 'laboratory.view laboratory.update' },
  { code: 'lab_reviewer', name: 'Lab Reviewer', description: 'Verify and release laboratory results and approve amendments', permissions: 'laboratory.view laboratory.verify laboratory.release laboratory.amend.approve' },
  { code: 'radiology_technician', name: 'Radiology Technician', description: 'Update imaging workflow and study details', permissions: 'radiology.view radiology.update' },
  { code: 'radiologist', name: 'Radiologist', description: 'Review and report imaging studies', permissions: 'radiology.view radiology.update' },
  { code: 'pharmacist', name: 'Pharmacist', description: 'Dispense medications and view stock', permissions: 'pharmacy.view pharmacy.create pharmacy.inventory.view pharmacy.inventory.update' },
  { code: 'inventory_clerk', name: 'Inventory Clerk', description: 'Maintain stock records and review procurement', permissions: 'pharmacy.inventory.view pharmacy.inventory.create pharmacy.inventory.update pharmacy.procurement.view' },
  { code: 'procurement_officer', name: 'Procurement Officer', description: 'Manage purchase orders and supplier workflows', permissions: 'pharmacy.inventory.view pharmacy.procurement.view pharmacy.procurement.create pharmacy.procurement.update' },
  { code: 'cashier', name: 'Cashier', description: 'Create bills and collect deposits', permissions: 'billing.view billing.create billing.update billing.deposit' },
  { code: 'finance_officer', name: 'Finance Officer', description: 'Reconcile billing, close accounts and track expenses', permissions: 'billing.view billing.reconcile billing.closeout expenses.view expenses.manage' },
  { code: 'blood_bank_technician', name: 'Blood Bank Technician', description: 'Maintain blood bank records', permissions: 'blood_bank.view blood_bank.manage' },
  { code: 'blood_bank_issuer', name: 'Blood Bank Issuer', description: 'Review and issue blood units', permissions: 'blood_bank.view blood_bank.issue' },
  { code: 'ambulance_dispatcher', name: 'Ambulance Dispatcher', description: 'Dispatch and track ambulance trips', permissions: 'ambulance.view ambulance.dispatch' },
  { code: 'medical_records_officer', name: 'Medical Records Officer', description: 'Maintain charts and resolve duplicate records', permissions: 'patients.view patients.update patients.merge' },
  { code: 'quality_auditor', name: 'Quality Auditor', description: 'Review audit and operational reports', permissions: 'audit.view operations.view' },
  { code: 'hospital_manager', name: 'Hospital Operations Manager', description: 'Review operational dashboards and manage rosters', permissions: 'operations.view hospital_profile.view departments.view doctors.view roster.view roster.manage' },
  { code: 'support_agent', name: 'Support Agent', description: 'Review and respond to support tickets', permissions: 'support-tickets.view support-tickets.manage' },
];

export async function seedHospitalRoles(dataSource: DataSource) {
  return dataSource.transaction(async (manager) => {
    const roles = manager.getRepository(Role);
    const permissionByCode = new Map((await manager.getRepository(Permission).find())
      .map((permission) => [permission.code, permission]));
    let created = 0;
    for (const { permissions, ...role } of hospitalRoles) {
      const existing = await roles.findOne({ where: { code: role.code }, relations: { permissions: true } });
      if (existing) {
        // Repair only the missing grants needed for these two clinical workflows.
        const required = role.code === 'physician' ? ['pharmacy.create', 'vaccination.view', 'vaccination.record']
          : role.code === 'ward_nurse' ? ['vaccination.view', 'vaccination.record']
          : role.code === 'pharmacist' ? ['pharmacy.inventory.update'] : [];
        const current = new Set(existing.permissions.map((permission) => permission.code));
        const missing = required.filter((code) => !current.has(code));
        if (missing.length) {
          existing.permissions = [...existing.permissions, ...missing.map((code) => {
            const permission = permissionByCode.get(code);
            if (!permission) throw new Error(`Missing permission ${code} for ${role.code}`);
            return permission;
          })];
          await roles.save(existing);
        }
        continue;
      }
      if (await roles.exists({ where: { name: role.name } })) continue;
      const grants = permissions.split(' ').map((code) => {
        const permission = permissionByCode.get(code);
        if (!permission) throw new Error(`Missing permission ${code} for ${role.code}`);
        return permission;
      });
      await roles.save(roles.create({ ...role, isActive: true, isSystem: false, permissions: grants }));
      created++;
    }
    return created;
  });
}
