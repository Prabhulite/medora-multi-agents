# Spec: Radiology Report Archive

## Objective

Create one immutable internal report snapshot when staff finalize a radiology report. Authorized staff must be able to open the original release snapshot, including patient/order/study identifiers, report, impression, attestation, reporting staff, and any addenda present at finalization. Later addenda must remain separate and never silently rewrite that archived report.

Success means finalization atomically creates one attributed snapshot with a SHA-256 checksum; `radiology.view` users can retrieve it only for a final report; a user without that permission receives `403`; the UI exposes it from the final-report view; and the patient audit records archive creation without copying report content. This is not a legally regulated signature, an external timestamp, a PDF certificate, PACS image storage, or RIS/PACS integration.

## Assumptions

- The first slice stores the canonical snapshot in MySQL JSON, not PDF/blob or external object storage.
- `radiology.view` remains the permission to view a final report and its archive; `radiology.update` remains the authority to finalize it.
- Historical reported orders created before this migration may have no archive. The archive endpoint returns `404` for those records rather than fabricating a later snapshot.
- A later report addendum does not alter the original archive. A separately versioned amended-report archive is future work.

## Tech Stack

- Backend: TypeScript, Express, TypeORM, MySQL
- Frontend: React, TypeScript, existing Medora UI components
- Tests: `backend/src/integration-check.ts`, local Chromium browser smoke script

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

- `backend/src/database/entities/` contains the TypeORM archive entity.
- `backend/src/database/migrations/` contains the additive archive-table migration.
- `backend/src/modules/radiology/` owns finalization, archive retrieval, validation, and routing.
- `frontend/src/features/radiology/` contains archive API types and final-report UI behavior.
- `backend/src/integration-check.ts` verifies state, authorization, immutability, and audit behavior.
- `docs/ADVANCED-HMS-ROADMAP.md` records operational scope and limitations.

## Code Style

Keep snapshot creation inside the existing finalization transaction and lock the source order before checking its state.

```ts
const order = await manager.getRepository(RadiologyOrder)
  .createQueryBuilder('order')
  .setLock('pessimistic_write')
  .where('order.id = :id', { id: orderId })
  .getOne();
if (!order) throw new NotFoundError('Radiology order not found');
if (order.status !== 'performed') throw new ConflictError('Mark the study performed before final reporting');
```

## Testing Strategy

- Integration tests finalize a performed report, retrieve the archive, and validate the snapshot and SHA-256 checksum.
- Integration tests prove an unreleased/draft report is unavailable, an unprivileged account receives `403`, and the view-only role can retrieve the archive.
- Integration tests prove an addendum after finalization does not change the original checksum or archived addenda.
- Backend and frontend production builds validate TypeScript contracts.
- Browser smoke opens the archive action when a current archived final report exists in the local environment.

## Boundaries

- Always: use an additive migration, create the snapshot in the finalization transaction, apply server-side permission and final-state checks, run builds/tests before commit, and avoid report text in notifications or audit summaries.
- Ask first: external storage, PDF generation, cryptographic signing, legal/regulatory claims, PACS/RIS work, or role-model changes.
- Never: mutate archive rows, expose an archive for a non-final report, fabricate historical snapshots, log real report text, commit credentials, or add generated build output.

## Success Criteria

- Finalizing a performed report creates one immutable archive in the same transaction.
- Repeated/concurrent finalization cannot produce duplicate archive rows.
- The snapshot captures patient/order/study identifiers, report and impression, review attestation, reporting metadata, timestamp, checksum, and addenda present at finalization.
- Later addenda do not alter the original archive.
- The archive endpoint returns only released final-report content, uses `radiology.view`, returns `403` when unauthorized, `409` for non-finalized reports, and `404` for missing legacy archives.
- The final-report UI displays the original snapshot and checksum to authorized users.
- Patient audit captures archive creation without report text.

## Implementation Tasks

- [ ] Add archive entity and additive migration.
  - Acceptance: one archive row per radiology order, with database uniqueness and foreign keys.
  - Verify: migration runs against local MySQL.
- [ ] Capture and expose snapshots in the radiology service and route.
  - Acceptance: finalization writes the snapshot atomically and the guarded GET endpoint returns it.
  - Verify: integration authorization, timing, checksum, and immutability assertions pass.
- [ ] Add archive view to the final-report UI and browser smoke coverage.
  - Acceptance: authorized users can open the snapshot from a final report.
  - Verify: frontend build and browser smoke pass.
- [ ] Document behavior and commit the verified slice.
  - Acceptance: roadmap accurately states capabilities and limits.
  - Verify: clean working tree after a scoped commit.

## Follow-up Scope

- A separately versioned archive for approved addenda is intentionally excluded.
- A PDF certificate, external durable object storage, trusted timestamp, cryptographic signature, and PACS/RIS integration remain future work.
