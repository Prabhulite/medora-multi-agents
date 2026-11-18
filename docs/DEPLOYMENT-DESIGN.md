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

The Compose frontend listens only on host loopback. Place an HTTPS reverse proxy on the same host and forward it to the configured loopback port. The HTTPS proxy must **overwrite** `X-Forwarded-For` with the connecting client IP and set `X-Forwarded-Proto` to `https`; do not pass client-supplied forwarding headers through. Nginx forwards that IP to the backend, where Express trusts one proxy hop. Review this chain if deploying behind a load balancer or using a different network topology. Production startup rejects HTTP or placeholder public origins and placeholder credentials. Move the process-local rate-limit state to Redis if scaling the backend beyond one instance.

The backend container now runs compiled migration and seed commands, matching its production-only dependencies. Configure a separate database backup job and practice restoration using [DB-BACKUP-RESTORE.md](DB-BACKUP-RESTORE.md); the named MySQL volume alone is not a backup.

### HTTPS on the deployment host

For a new installation using host Caddy, set `FRONTEND_PORT=8080` in the Compose environment. Set both public URLs to the same hospital HTTPS origin. Point DNS at the host and allow inbound TCP 80 and 443. Use the actual hostname in this Caddyfile site block.

```caddyfile
hms.your-hospital.org {
    reverse_proxy 127.0.0.1:8080 {
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto https
    }
}
```

The internal frontend port defaults to 80 for existing deployments. Match the upstream port to the configured loopback binding. After loading the proxy configuration, open the login page over HTTPS and verify that `/health/ready` returns JSON with `data.database` equal to `ready`. The production-compose CI job exercises container startup and the internal HTTP path. Public TLS and the hospital login flow require verification on the destination host.

### Database bootstrap

For a fresh volume, use the example's `MYSQL_APP_USER` and set independent random values for `DB_PASSWORD` and `MYSQL_ROOT_PASSWORD`. The application account receives grants on the Medora database. Existing volumes keep their existing accounts. Before switching an existing installation to `MYSQL_APP_USER`, provision that account on its Medora schema and verify migration access. MySQL initialization variables only apply to new volumes.

Production bootstrap omits development medication and diagnostics catalogs, stock, suppliers, wards, beds and operating rooms. Configure the hospital's actual catalog, prices and capacity before staff acceptance. Existing records are preserved. Review imported or previously seeded inventory against physical stock before enabling dispensing.
