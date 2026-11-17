import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const chromePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const profile = mkdtempSync(join(tmpdir(), 'medora-browser-smoke-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

async function waitForPort() {
  const file = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt++) {
    if (existsSync(file)) return Number(readFileSync(file, 'utf8').split('\n')[0]);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Chrome debugging port did not start');
}

try {
  const port = await waitForPort();
  const tab = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:5173/login`, { method: 'PUT' }).then((response) => response.json()) as { webSocketDebuggerUrl: string };
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => { socket.onopen = () => resolve(); socket.onerror = () => reject(new Error('Chrome debugging socket failed')); });
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const handler = pending.get(message.id)!; pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
  };
  const send = (method: string, params: Record<string, unknown> = {}) => new Promise<any>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression: string) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate('document.readyState === "complete" && Boolean(document.querySelector("input[type=password]"))')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const credentials = { username: process.env.SUPER_ADMIN_USERNAME, password: process.env.SUPER_ADMIN_PASSWORD };
  assert.ok(credentials.username && credentials.password, 'Set local super admin credentials for the browser smoke check');
  const loginStatus = await evaluate(`fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${JSON.stringify(credentials)}) }).then(response => response.status)`);
  assert.equal(loginStatus, 200, `Browser login returned ${loginStatus}`);
  await send('Page.navigate', { url: 'http://localhost:5173/laboratory' });
  let loaded = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { loaded = await evaluate('document.body.innerText.includes("Laboratory diagnostics") && document.body.innerText.includes("Laboratory orders")'); } catch { /* navigation resets the execution context */ }
    if (loaded) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const pageState = await evaluate('({ path: location.pathname, login: document.body.innerText.includes("Sign in"), laboratory: document.body.innerText.includes("Laboratory diagnostics"), orders: document.body.innerText.includes("Laboratory orders"), loadError: document.body.innerText.includes("Unable to load laboratory diagnostics") })');
  assert.ok(loaded, `Laboratory workbench did not render: ${JSON.stringify(pageState)}`);
  let worklistReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { worklistReady = await evaluate('Boolean(document.querySelector(".laboratory-section table")) || document.body.innerText.includes("No matching laboratory orders found")'); } catch { /* navigation resets the execution context */ }
    if (worklistReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(worklistReady, 'Laboratory orders did not finish loading');
  assert.equal(await evaluate('Boolean(document.querySelector(".laboratory-section .ui-table-search input")) && Boolean(document.querySelector(".laboratory-section .ui-table-toolbar__entries select"))'), true, 'Worklist search and paging controls did not render');
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load laboratory diagnostics")'), false, 'Laboratory workbench showed a load error');
  console.log('Browser smoke passed: authenticated laboratory workbench rendered in headless Chrome.');
  await send('Browser.close').catch(() => undefined);
  socket.close();
} finally {
  chrome.kill();
  const resolvedProfile = realpathSync(profile);
  assert.equal(dirname(resolvedProfile).toLowerCase(), realpathSync(tmpdir()).toLowerCase(), 'Chrome profile escaped temporary directory');
  assert.ok(resolvedProfile.startsWith(join(realpathSync(tmpdir()), 'medora-browser-smoke-')), 'Unexpected Chrome profile path');
  for (let attempt = 0; attempt < 20; attempt++) {
    try { rmSync(resolvedProfile, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); break; }
    catch (error) {
      if (attempt === 19) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
