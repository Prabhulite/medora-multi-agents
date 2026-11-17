# Database backup and restore

Medora uses MySQL as its transactional database. Backups contain patient, clinical, staff, and financial information. Store them in encrypted, access-controlled storage outside the application server, and test restores regularly.

## Requirements

- MySQL 8 `mysqldump` and `mysql` command-line clients on the machine running these commands. Set `MYSQLDUMP_BIN` and `MYSQL_BIN` if they are not on `PATH`; on Windows the scripts also check the standard MySQL Server 8.0 installation directory.
- Backend environment variables for the database connection. The database user needs read access for backup and `CREATE DATABASE` plus schema creation rights for restore.
- Enough free space for the SQL dump and a second restored database.

## Create a backup

From `backend/`:

```text
npm run db:backup -- D:\secure-backups\medora-2026-11-16.sql
```

Omit the path to write into `backend/backups/`. This directory is ignored by Git, but is **not** a long-term storage location. The command writes a SQL file and a matching `.manifest.json` containing the byte count and SHA-256 hash. It refuses to overwrite existing files. MySQL credentials are passed through the process environment, not command-line arguments.

In a production image or host with compiled backend files, use `npm run db:backup:prod -- <path>` instead. Copy the SQL file and its manifest together to encrypted backup storage. Apply retention and access rules appropriate to the hospital; keep at least one off-site copy. Monitor command exit codes and backup size. A successful dump is not proof of recoverability; perform a test restore.

## Restore into a new database

Restores never overwrite the configured database. Choose a **new** database name beginning with `medora_restore_`:

```text
npm run db:restore -- D:\secure-backups\medora-2026-11-16.sql medora_restore_20261116_test
```

Use `npm run db:restore:prod -- <sql> <target>` on a machine with compiled backend files. The command verifies the manifest checksum **before** creating the target database, rejects an existing target, creates the new database, and imports the SQL. If import fails, it leaves the new database for inspection and reports the failure. Do not point the application at it until validation is complete.

Verify the restored schema, migration history, row counts for key tables, and a sample of patient, invoice, and clinical records with authorized staff. Test login and key workflows against a non-public application instance configured with the restored database. Once approved for recovery, stop writes to the old instance, update `DB_NAME` to the restored database, and restart the application. Keep the old database unchanged until the recovery is confirmed. Record the backup timestamp and any writes that occurred after it; those writes are not present in the restored copy.

## Automated verification

Run `npm run db:backup-check` from `backend/` with MySQL available. It creates a uniquely named temporary database, runs all compiled Medora migrations and seed data, adds a probe row, backs it up, and restores it to another new database. It compares migration history and key table counts, verifies the probe and seeded user records, and checks overwrite refusal and checksum rejection. It then removes the temporary databases and files. It never selects the configured working `DB_NAME` database.

## Docker Compose note

The backend container starts from compiled JavaScript and does not include MySQL command-line clients. Run the backup/restore scripts from a secured operator host that can reach the MySQL service, or use a dedicated MySQL 8 client container on the Compose network with equivalent `mysqldump`/`mysql` options. Do not treat the Docker named volume as a backup: a separate, tested copy is required.
