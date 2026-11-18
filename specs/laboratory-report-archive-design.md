# Spec: Laboratory Report Archive

## Objective

Create an internal, immutable report snapshot when a verified laboratory result is released. Authorized staff must be able to retrieve the archived report and its metadata without changing it. The archive preserves the released result and the addenda that existed at release time; later approved corrections remain separate and visible as dated addenda, not silent changes to the original archive.

Success means a released result has one immutable, attributed archive record, the report can be viewed through a permission-checked endpoint and UI action, later corrections do not mutate the archived release, and all state changes are patient audited. This is not a regulated electronic signature, an externally trusted timestamp, a PDF certificate, or LIS integration.

## Assumptions

- The archive will be stored in MySQL as a canonical JSON snapshot plus checksum and metadata, rather than as a PDF/blob or external object storage.
- `laboratory.release` remains the authority to create the archive atomically at release time.
- `laboratory.view` is sufficient to read released report archive metadata and contents; unreleased results remain unavailable to view-only users.
- Later approved addenda are not retroactively embedded into the original archive. A future formal amended-report archive may be added as a distinct workflow.

## Tech Stack

- Backend: TypeScript, Express, TypeORM, MySQL
- Frontend: React, TypeScript, existing Medora UI components
- Tests: `backend/src/integration-check.ts`, local Chromium smoke script

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

- `backend/src/database/entities/` contains TypeORM archive entity definitions.
- `backend/src/database/migrations/` contains additive database migrations.
- `backend/src/modules/laboratory/` contains validators, routes, controller, and archive-aware service behavior.
- `frontend/src/features/laboratory/` contains API types and the report archive user interface.
- `backend/src/integration-check.ts` proves authorization, immutability, archive timing, and audit behavior.
- `docs/ADVANCED-HMS-ROADMAP.md` records the workflow and its limits.

## Code Style

Follow the established service pattern: lock the source row inside a transaction, use typed repositories, reject invalid state with the existing errors, and return deliberate response shapes.

```ts
const order = await manager.getRepository(LaboratoryOrder)
  .createQueryBuilder('order')
  .setLock('pessimistic_write')
  .where('order.id = :id', { id: orderId })
  .getOne();
if (!order) throw new NotFoundError('Laboratory order not found');
if (order.status !== 'verified') throw new ConflictError('Only verified results can be released');
```

## Testing Strategy

- Integration tests create and release a verified result, then assert exactly one archive exists with an immutable result snapshot and checksum.
- Integration tests prove unauthorized, unknown, and unreleased archive requests fail appropriately.
- Integration tests prove released addenda and archives cannot be duplicated under repeated or concurrent release attempts.
- Backend and frontend production builds validate TypeScript contracts.
- Browser smoke verifies the released-report archive action renders for an authenticated authorized user when the local environment contains an archived released result.

## Boundaries

- Always: use an additive migration, enforce server-side permission and released-state checks, keep report contents out of notification text and audit free text, verify builds/tests before committing.
- Ask first: external object storage, PDF generation/storage, cryptographic signing, legal/regulatory claims, changes to roles outside the seeded permission.
- Never: alter an archive row after creation, expose an archive for an unreleased result, add real patient data to logs, commit credentials or generated build output.

## Success Criteria

- Releasing a verified result creates one immutable archive snapshot in the same transaction.
- Repeated/concurrent release cannot create duplicate archives.
- An archive exposes only released-result content and limited staff identity needed by the report.
- The archive includes order/patient/test identifiers, result fields, verification/release metadata, timestamp, checksum, and addenda present at release.
- Later addenda do not mutate the original archive.
- Authorized users can open the archived snapshot from the laboratory report UI; unauthorized users receive `403` and unreleased orders receive `409`/`404` without data leakage.
- Patient audit records the archive creation without copying report text.

## Follow-up Scope

- This slice deliberately uses a MySQL JSON snapshot with a SHA-256 checksum. It does not generate or retain a PDF, use external storage, or provide a legally regulated signature or timestamp.
- A later approved correction does not revise the original archive. A separately versioned amended-report archive remains future work.
