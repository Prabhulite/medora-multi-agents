import 'reflect-metadata';
import { closeDataSource, initializeDataSource } from './config/data-source.js';
import { LaboratoryOrder, LaboratoryTest, Patient } from './database/entities/index.js';

const fixtureMrd = 'CI-SMOKE-OPS-001';
const fixtureOrderNumber = 'CI-SMOKE-LAB-001';

export async function ensureBrowserSmokeFixture() {
  await initializeDataSource();
  try {
    await (await initializeDataSource()).transaction(async (manager) => {
      const patients = manager.getRepository(Patient);
      let patient = await patients.findOne({ where: { mrdNumber: fixtureMrd } });
      if (!patient) {
        patient = await patients.save(patients.create({
          mrdNumber: fixtureMrd, familyId: null, registrationAt: new Date(), title: null, firstName: 'CI', middleName: null, lastName: 'Smoke Patient', gender: 'other', dateOfBirth: null, ageYears: null, ageIsApproximate: false, bloodGroup: null, maritalStatus: null, nationality: null, religion: null, photoData: null, occupation: null, patientCategory: 'general', referredBy: null, referralDoctorId: null, preferredLanguage: null, specialRemarks: 'Disposable browser smoke fixture', registrationSourceId: null, mergedIntoPatientId: null, isActive: true, createdById: null, updatedById: null,
        }));
      }
      const tests = manager.getRepository(LaboratoryTest);
      const test = await tests.findOne({ where: { isActive: true }, order: { id: 'ASC' } });
      if (!test) throw new Error('Browser smoke fixture requires an active laboratory test from db:seed');
      const orders = manager.getRepository(LaboratoryOrder);
      const existing = await orders.findOne({ where: { orderNumber: fixtureOrderNumber } });
      if (!existing) await orders.save(orders.create({
        orderNumber: fixtureOrderNumber, patientId: patient.id, testId: test.id, testCodeSnapshot: test.testCode, testNameSnapshot: test.testName, doctorId: null, status: 'ordered', priority: 'routine', criticalResult: false, criticalReason: null, clinicalNotes: 'Disposable browser smoke fixture', orderedAt: new Date(), collectedAt: null, specimenLabel: null, collectedById: null, completedAt: null, cancelledAt: null, cancelledById: null, cancellationReason: null, verifiedAt: null, verifiedById: null, releasedById: null, resultValue: null, resultUnit: null, referenceRange: null, resultNotes: null, createdById: null, resultedById: null,
      }));
    });
  } finally {
    await closeDataSource();
  }
}
