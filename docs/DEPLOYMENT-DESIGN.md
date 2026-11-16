# Deployment Design

The repository now includes a production-oriented Docker Compose topology:

- MySQL 8 with a persistent named volume and health check
- Backend container that runs migrations/seeding before starting the API
- Nginx frontend container with SPA fallback and `/api` reverse proxy
- Backend and frontend health-gated startup ordering

Copy `.env.production.example` to `.env`, replace every placeholder secret, then run:

```bash
docker compose up --build -d
```

Before public exposure, place the stack behind HTTPS and move the process-local rate-limit state to Redis if scaling the backend beyond one instance.

The backend container now runs compiled migration and seed commands, matching its production-only dependencies. Configure a separate database backup job and practice restoration using [DB-BACKUP-RESTORE.md](DB-BACKUP-RESTORE.md); the named MySQL volume alone is not a backup.
