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
  let loginResult = await evaluate(`fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${JSON.stringify(credentials)}) }).then(response => ({ status: response.status, retryAfter: Number(response.headers.get('Retry-After') || 0) }))`);
  if (loginResult.status === 429 && loginResult.retryAfter > 0) {
    await new Promise((resolve) => setTimeout(resolve, loginResult.retryAfter * 1000));
    loginResult = await evaluate(`fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${JSON.stringify(credentials)}) }).then(response => ({ status: response.status, retryAfter: Number(response.headers.get('Retry-After') || 0) }))`);
  }
  assert.equal(loginResult.status, 200, `Browser login returned ${loginResult.status}`);
  const cookies = await send('Network.getCookies', { urls: ['http://localhost:5173'] });
  assert.ok(cookies.cookies.some((cookie: { name: string }) => cookie.name === 'medora_session'), 'Browser session cookie was not set');
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
  let communicationQueueReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { communicationQueueReady = await evaluate('Boolean(document.querySelector(".laboratory-communication-queue table")) || document.body.innerText.includes("No verified urgent, STAT, or corrected results awaiting communication.")'); } catch { /* navigation resets the execution context */ }
    if (communicationQueueReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(communicationQueueReady, 'Urgent result communication queue did not finish loading');
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load communication follow-up queue")'), false, 'Urgent result communication queue showed a load error');
  await evaluate('history.pushState({}, "", "/radiology"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let radiologyQueueReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { radiologyQueueReady = await evaluate('document.body.innerText.includes("Radiology diagnostics") && (Boolean(document.querySelector(".radiology-communication-queue table")) || document.body.innerText.includes("No urgent, STAT, or corrected findings awaiting communication."))'); } catch { /* navigation resets the execution context */ }
    if (radiologyQueueReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const radiologyState = await evaluate('({ path: location.pathname, page: document.body.innerText.includes("Radiology diagnostics"), queue: document.body.innerText.includes("Finding communication follow-up"), empty: document.body.innerText.includes("No urgent, STAT, or corrected findings awaiting communication."), error: document.body.innerText.includes("Unable to load finding contact queue"), table: Boolean(document.querySelector(".radiology-communication-queue table")) })');
  assert.ok(radiologyQueueReady, `Radiology finding communication queue did not finish loading: ${JSON.stringify(radiologyState)}`);
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load finding contact queue")'), false, 'Radiology finding communication queue showed a load error');
  let radiologyWorklistReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { radiologyWorklistReady = await evaluate('Boolean(document.querySelector(".radiology-worklist table")) || document.body.innerText.includes("No matching radiology orders found.")'); } catch { /* navigation resets the execution context */ }
    if (radiologyWorklistReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(radiologyWorklistReady, 'Radiology worklist did not finish loading');
  assert.equal(await evaluate('Boolean(document.querySelector(".radiology-worklist .ui-table-search input")) && Boolean(document.querySelector(".radiology-worklist .ui-table-toolbar__entries select"))'), true, 'Radiology worklist search and paging controls did not render');
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load radiology worklist")'), false, 'Radiology worklist showed a load error');
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.innerText === "Order imaging")?.click(); true');
  assert.equal(await evaluate('document.querySelector(".radiology-modal")?.innerText.includes("Search patient by name or MRD") && Boolean(document.querySelector(".radiology-modal button[type=submit]:disabled"))'), true, 'Radiology order form did not require patient selection');
  await evaluate('document.querySelector(".radiology-modal__header button").click(); true');
  const finalOrderLookup = await evaluate('fetch("/api/radiology/worklist?status=reported&page=1&pageSize=10", { credentials: "include" }).then(async response => ({ status: response.status, body: await response.json() }))') as { status: number; body: { data?: { items?: Array<{ orderNumber: string; reportedById: number | null; reportedByName: string | null; reportText: string | null }> } } };
  assert.equal(finalOrderLookup.status, 200, `Finalized radiology worklist returned ${finalOrderLookup.status}`);
  const finalOrder = finalOrderLookup.body.data?.items?.[0];
  const finalOrderNumber = finalOrder?.orderNumber ?? null;
  if (finalOrderNumber) {
    assert.ok(finalOrder?.reportText, 'Finalized report has no report text');
    if (finalOrder?.reportedById) assert.ok(finalOrder.reportedByName, 'Finalized report is missing reporting staff name');
    await evaluate(`(() => { const input = document.querySelector('.radiology-worklist .ui-table-search input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, ${JSON.stringify(finalOrderNumber)}); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    let reportRowReady = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      reportRowReady = await evaluate(`Array.from(document.querySelectorAll('.radiology-worklist tbody tr')).some(row => row.innerText.includes(${JSON.stringify(finalOrderNumber)}) && row.innerText.includes('View final report'))`);
      if (reportRowReady) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(reportRowReady, 'Finalized report was absent from the radiology worklist');
    await evaluate(`(() => { const row = Array.from(document.querySelectorAll('.radiology-worklist tbody tr')).find(item => item.innerText.includes(${JSON.stringify(finalOrderNumber)})); Array.from(row.querySelectorAll('button')).find(button => button.innerText.includes('View final report')).click(); return true; })()`);
    let printReady = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      printReady = await evaluate('Boolean(Array.from(document.querySelectorAll(".radiology-report__actions button")).find(button => button.innerText === "Print report" && !button.disabled))');
      if (printReady) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(printReady, 'Final report print action did not become ready');
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    const printState = await evaluate(`({ reportVisible: getComputedStyle(document.querySelector(".radiology-report")).visibility === "visible", actionsHidden: getComputedStyle(document.querySelector(".radiology-report__actions")).display === "none", correctionHidden: !document.querySelector(".radiology-report__correction") || getComputedStyle(document.querySelector(".radiology-report__correction")).display === "none", content: document.querySelector(".radiology-report").innerText.includes(${JSON.stringify(finalOrder.reportText)}), order: document.querySelector(".radiology-report__details")?.innerText.includes(${JSON.stringify(finalOrderNumber)}), reporter: document.querySelector(".radiology-report__details")?.innerText.includes("Reporting staff") })`);
    assert.deepEqual(printState, { reportVisible: true, actionsHidden: true, correctionHidden: true, content: true, order: true, reporter: true }, `Radiology print layout failed: ${JSON.stringify(printState)}`);
    const printed = await send('Page.printToPDF', { printBackground: true });
    assert.ok(printed.data?.startsWith('JVBERi0') && printed.data.length > 5000, 'Radiology report PDF print output was empty');
    await send('Emulation.setEmulatedMedia', { media: 'screen' });
  }
  await evaluate('history.pushState({}, "", "/inpatient"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let inpatientLoaded = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { inpatientLoaded = await evaluate('Boolean(document.querySelector(".inpatient-page .inpatient-kpis"))'); } catch { /* navigation resets the execution context */ }
    if (inpatientLoaded) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const inpatientState = await evaluate('({ path: location.pathname, login: document.body.innerText.includes("Sign in"), inpatient: document.body.innerText.includes("Inpatient Management"), active: document.body.innerText.includes("Active admissions"), page: Boolean(document.querySelector(".inpatient-page")), kpis: Boolean(document.querySelector(".inpatient-kpis")), loadError: document.body.innerText.includes("Unable to load inpatient dashboard") })');
  assert.ok(inpatientLoaded, `Inpatient dashboard did not render: ${JSON.stringify(inpatientState)}`);
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load inpatient dashboard")'), false, 'Inpatient dashboard showed a load error');
  console.log(`Browser smoke passed: authenticated laboratory and radiology worklists, communication queues, inpatient dashboard${finalOrderNumber ? ', and finalized radiology report print output' : ''} rendered in headless Chrome.`);
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
