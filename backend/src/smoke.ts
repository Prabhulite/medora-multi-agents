import { env } from './config/env.js';

const baseUrl = env.APP_URL.replace(/\/$/, '');
const checks: Array<[string, string]> = [
  ['health', '/health'],
  ['menus', '/api/menus'],
  ['inventory', '/api/pharmacy/inventory'],
  ['laboratory tests', '/api/laboratory/tests'],
  ['radiology modalities', '/api/radiology/modalities'],
  ['operations dashboard', '/api/operations/dashboard'],
  ['audit logs', '/api/audit-logs?limit=1&page=1'],
];

async function smoke(): Promise<void> {
  const health = await fetch(`${baseUrl}/health`);
  if (!health.ok) throw new Error(`health failed: ${health.status}`);
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: env.SUPER_ADMIN_USERNAME, password: env.SUPER_ADMIN_PASSWORD }) });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  const loginPayload = await login.json() as { data?: { token?: string } };
  const token = loginPayload.data?.token;
  if (!token) throw new Error('login response did not include a token');
  for (const [label, path] of checks.slice(1)) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`${label} failed: ${response.status}`);
  }
  const csv = await fetch(`${baseUrl}/api/operations/dashboard.csv`, { headers: { authorization: `Bearer ${token}` } });
  if (!csv.ok || !(csv.headers.get('content-type') || '').includes('text/csv')) throw new Error(`operations CSV failed: ${csv.status}`);
  console.log(`Smoke checks passed: ${checks.length + 1} protected/public endpoints verified.`);
}

smoke().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
