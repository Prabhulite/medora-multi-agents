# Production Hardening

## Request protection

- Helmet security headers remain enabled.
- JSON request bodies are capped at 2 MB.
- General API traffic is limited to 180 requests per IP and route per minute.
- Authentication routes use an additional 20 requests per IP and route per minute limit.
- Proxy-aware IP handling is enabled for deployments behind one trusted reverse proxy.

The limiter is intentionally dependency-free and process-local for the current single-node deployment. A multi-node production deployment should move the bucket state to Redis before horizontal scaling.

## Auditability

Mutating requests are recorded by the system audit log middleware without storing request bodies, passwords, tokens, or clinical payloads.

## Dependency gate

CI runs `npm audit --omit=dev --audit-level=high` for both frontend and backend dependencies. This blocks known high- and critical-severity production dependency findings. Moderate findings still require review before release; do not use `npm audit fix --force` without evaluating the proposed major-version changes and running the full verification suite.
