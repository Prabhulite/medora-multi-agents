# Authentication Cookie Hardening

Successful login now sets an `HttpOnly`, `SameSite=Lax` session cookie with an eight-hour lifetime. Browser requests use `withCredentials`, and logout clears the cookie. The API still accepts bearer tokens for smoke tests and non-browser clients.

The cookie path was verified against `/api/auth/me` using a PowerShell web session. No browser-accessible token storage is required for the frontend session flow.
