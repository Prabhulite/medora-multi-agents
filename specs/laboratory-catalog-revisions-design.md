# Spec: Laboratory Catalog Revisions

## Objective

Allow authorized laboratory catalog managers to revise active or retired laboratory-test defaults while preserving an immutable, attributed history of each change. Existing laboratory orders continue to reference their existing test and stored order data; a revision only affects future ordering defaults.

Success means a manager can update test name, category, default priority, turnaround time, and price; every material revision records before/after fields and actor; duplicate/no-op updates are rejected; revision history is viewable under `laboratory.catalog.manage`; and no result, order, or release record is modified.

## Assumptions

- Test codes are immutable identifiers in this slice. Changing a code requires creating a new test and retiring the old one.
- Both active and retired tests may be revised, because inactive tests sometimes need corrected historical catalog metadata; retirement status is not changed by this endpoint.
- Revision history stores catalog fields only—not result text, order data, or patient data.
- Existing orders intentionally retain their original test relationship. This is not a test-version foreign-key migration.

## Tech Stack

- Backend: TypeScript, Express, TypeORM, MySQL
- Frontend: React and existing Medora catalog modal
- Tests: `backend/src/integration-check.ts`, production builds, local browser smoke

## Commands

```powershell
cd backend; npm run build
cd frontend; npm run build
cd backend; npm run test:integration
cd backend; npm run migration:run
cd backend; npm run db:seed
cd backend; npm run browser:smoke
```

## Project Structure

- `backend/src/database/entities/` defines append-only test revision records.
- `backend/src/database/migrations/` adds the revision table and indexes.
- `backend/src/modules/laboratory/` owns validation, revision/write services, routes, and responses.
- `frontend/src/features/laboratory/` provides catalog edit and history access.
- `backend/src/integration-check.ts` verifies validation, authorization, persistence, and order isolation.

## Code Style

Lock the test before comparing and changing fields. Store only changed keys in JSON before/after data.

```ts
const test = await manager.getRepository(LaboratoryTest)
  .createQueryBuilder('test')
  .setLock('pessimistic_write')
  .where('test.id = :id', { id })
  .getOne();
if (!test) throw new NotFoundError('Laboratory test not found');
if (Object.keys(changes).length === 0) throw new ConflictError('No catalog fields changed');
```

## Testing Strategy

- Integration tests verify invalid/no-op updates are rejected and a valid update yields one attributed revision with scoped before/after fields.
- Integration tests verify unprivileged users receive `403`, code is not editable, and existing orders remain unchanged.
- Builds validate backend/frontend contracts; browser smoke keeps existing catalog rendering coverage.

## Boundaries

- Always: use an additive migration, lock on update, enforce `laboratory.catalog.manage`, validate at the route boundary, and avoid copying patient/result data into revisions.
- Ask first: test-code renames, versioning each order against a catalog revision, reference-range modeling, external LIS synchronization, or retroactive result changes.
- Never: update or delete historical revision rows, rewrite laboratory results/orders, expose revisions to users without catalog-management permission, or commit credentials.

## Success Criteria

- A revision records changed catalog fields, before/after values, actor, and timestamp.
- No-op updates and attempted code changes fail with deliberate validation/conflict errors.
- Existing orders remain valid and are not rewritten.
- Catalog managers can edit a test and inspect revision history from the UI.
- Unprivileged users receive `403`.

## Implementation Tasks

- [ ] Add revision entity and migration.
- [ ] Add guarded update and history backend endpoints with integration tests.
- [ ] Add catalog edit/history UI and typed API contracts.
- [ ] Update roadmap, build, migrate, seed, smoke-test, and commit.
