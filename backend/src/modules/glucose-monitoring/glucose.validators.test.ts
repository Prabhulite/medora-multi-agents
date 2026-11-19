import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGlucoseReading, patientParams } from './glucose.validators.js';

const valid = { valueMgDl: 126.5, context: 'fasting', measuredAt: '2026-01-02T09:30:00+05:30', notes: 'Before breakfast' };
test('accepts a patient scoped, timestamped reading', () => {
  assert.equal(patientParams.parse({ patientId: '42' }).patientId, 42);
  assert.equal(createGlucoseReading.parse(valid).valueMgDl, 126.5);
});
test('rejects invalid values, context, and timestamps', () => {
  for (const change of [{ valueMgDl: -1 }, { valueMgDl: 1001 }, { valueMgDl: 120.22 }, { context: 'unknown' }, { measuredAt: '2035-01-01T00:00:00Z' }, { measuredAt: '2026-01-02' }]) {
    assert.equal(createGlucoseReading.safeParse({ ...valid, ...change }).success, false);
  }
  assert.equal(patientParams.safeParse({ patientId: 0 }).success, false);
});
