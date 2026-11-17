# Deployment Design

The repository now includes a production-oriented Docker Compose topology:

- MySQL 8 with a persistent named volume and health check
- Backend container that runs migrations/seeding before starting the API
- Nginx frontend container with SPA fallback and `/api` reverse proxy
- Backend and frontend health-gated startup ordering

Copy `.env.production.example` to `.env`, replace every placeholder secret and both public HTTPS URLs, then run:

```bash
docker compose up --build -d
```

The Compose frontend listens only on host loopback. Place an HTTPS reverse proxy on the same host and forward it to `127.0.0.1:80`. The HTTPS proxy must **overwrite** `X-Forwarded-For` with the connecting client IP and set `X-Forwarded-Proto` to `https`; do not pass client-supplied forwarding headers through. Nginx forwards that IP to the backend, where Express trusts one proxy hop. Review this chain if deploying behind a load balancer or using a different network topology. Production startup rejects HTTP or placeholder public origins and placeholder credentials. Move the process-local rate-limit state to Redis if scaling the backend beyond one instance.

The backend container now runs compiled migration and seed commands, matching its production-only dependencies. Configure a separate database backup job and practice restoration using [DB-BACKUP-RESTORE.md](DB-BACKUP-RESTORE.md); the named MySQL volume alone is not a backup.
