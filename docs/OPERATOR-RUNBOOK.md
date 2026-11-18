# Medora Operator Runbook

This runbook coordinates release, support, backup, recovery, and sign-off. It does not replace hospital clinical policy or vendor procedures.

## Assign accountable roles

- Release operator: deploys approved revisions and records evidence.
- Database operator: owns encrypted backups, restores, and restore drills.
- Clinical owner: validates representative OPD, IPD, billing, pharmacy, laboratory, and radiology workflows.
- Incident owner: receives availability, backup, and security alerts.

Record actual names, escalation contacts, backup destination, and retention policy in the hospital-controlled operations record, not in Git.

## Release procedure

1. Confirm the approved commit, clean worktree, and release window.
2. Run frontend and backend production builds, `npm run test:integration` from `backend/`, and `npm audit --omit=dev --audit-level=high` in both applications.
3. Verify unique production secrets, a database password, and public HTTPS `APP_URL` and `FRONTEND_URL` values. Do not reuse development or CI credentials.
4. Confirm a recent encrypted backup and its manifest are stored outside the application host.
5. Start the approved revision with `docker compose up --build -d`.
6. Verify HTTPS access plus `GET /health` and `GET /health/ready`; readiness must return HTTP 200.
7. Record commit, operator, deployment time, migration/seed result, health result, and clinical-owner acceptance.

See [DEPLOYMENT-DESIGN.md](DEPLOYMENT-DESIGN.md) for the Compose and reverse-proxy design. The proxy must overwrite untrusted forwarding headers.

## Monitoring and first-line support

- Monitor `/health/ready`, database capacity, backup job exit codes, backup size trends, access logs, and audit logs on the cadence set by the incident owner.
- Escalate failed backups, missing manifests, migration failures, repeated authentication failures, and elevated 5xx responses.
- For an incident, record user impact and time; check HTTPS reachability, health, readiness, container status, database connectivity, and the deployed revision.
- If database integrity is uncertain, stop writes and involve the database operator before restart or restore.

## Backup and recovery

Create backups on a secured operator host with `npm run db:backup:prod -- <path>`. Keep each SQL dump and manifest together in encrypted, access-controlled storage.

Restore only into a new `medora_restore_*` database with `npm run db:restore:prod -- <sql> <target>`. Validate migration history, row counts, selected records, login, and key workflows in a non-public instance before cutover. Never treat a Docker volume as a backup.

Follow [DB-BACKUP-RESTORE.md](DB-BACKUP-RESTORE.md) for the detailed procedure. A recorded production-like restore drill remains an operational release gate.

## Sign-off evidence

Before release approval, record build, integration, browser-smoke, dependency-audit, migration/seed, readiness, backup, role-review, secret-rotation, and clinical-owner walkthrough outcomes. Only check items in [ADVANCED-HMS-COMPLETION-CHECKLIST.md](ADVANCED-HMS-COMPLETION-CHECKLIST.md) when their required evidence exists.
