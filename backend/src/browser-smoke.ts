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
  await send('Page.reload', { ignoreCache: true });
  let sessionRestored = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { sessionRestored = await evaluate('location.pathname !== "/login" && !document.body.innerText.includes("Loading Medora")'); } catch { /* reload resets the execution context */ }
    if (sessionRestored) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(sessionRestored, 'Frontend did not restore the authenticated session after login');
  await evaluate('history.pushState({}, "", "/laboratory"); window.dispatchEvent(new PopStateEvent("popstate")); true');
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
  const patientLookup = await evaluate('fetch("/api/radiology/patients?search=MRD", { credentials: "include" }).then(async response => ({ status: response.status, body: await response.json() }))') as { status: number; body: { data?: Array<{ id: number; mrdNumber: string }> } };
  assert.equal(patientLookup.status, 200, 'Radiology patient lookup failed');
  if (patientLookup.body.data?.length) {
    const patient = patientLookup.body.data[0];
    await evaluate(`(() => { const input = document.querySelector('#search-patient-by-name-or-mrd'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, ${JSON.stringify(patient.mrdNumber)}); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    let matchReady = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      matchReady = await evaluate(`Boolean(document.querySelector('.radiology-modal #matching-patients option[value=${JSON.stringify(String(patient.id))}]'))`);
      if (matchReady) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(matchReady, 'Patient search result did not appear in radiology order form');
    await evaluate(`(() => { const select = document.querySelector('#matching-patients'); select.value = ${JSON.stringify(String(patient.id))}; select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await evaluate('(() => { const input = document.querySelector("#study-name"); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(input, "Browser smoke study"); input.dispatchEvent(new Event("input", { bubbles: true })); return true; })()');
    assert.equal(await evaluate('Boolean(document.querySelector(".radiology-modal button[type=submit]:not(:disabled)"))'), true, 'Patient selection did not enable radiology order submission');
  }
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
  await evaluate('history.pushState({}, "", "/pharmacy"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let pharmacyReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    pharmacyReady = await evaluate('document.body.innerText.includes("Pharmacy inventory") && Boolean(Array.from(document.querySelectorAll("button")).find(button => button.innerText === "Dispense stock"))');
    if (pharmacyReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(pharmacyReady, 'Pharmacy inventory did not render');
  assert.equal(await evaluate('Boolean(document.querySelector(".pharmacy-alert-filters button"))'), true, 'Pharmacy alert filters did not render');
  await evaluate('Array.from(document.querySelectorAll(".pharmacy-alert-filters button")).find(button => button.textContent === "Expiry watch").click(); true');
  let expiryFilterReady = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    expiryFilterReady = await evaluate('location.search === "?alert=expiring-stock" && document.querySelector(".pharmacy-alert-filters button.is-active")?.textContent === "Expiry watch"');
    if (expiryFilterReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(expiryFilterReady, 'Pharmacy expiry filter did not update the URL and selection');
  await evaluate('Array.from(document.querySelectorAll(".pharmacy-alert-filters button")).find(button => button.textContent === "All batches").click(); true');
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.innerText === "Receive stock").click(); true');
  assert.equal(await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Catalog medication") && Boolean(document.querySelector(".pharmacy-modal button[type=submit]:disabled"))'), true, 'Pharmacy receipt form did not require catalog medication selection');
  let medicationCatalogReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    medicationCatalogReady = await evaluate('document.querySelector(".pharmacy-modal #catalog-medication")?.options.length > 1');
    if (medicationCatalogReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(medicationCatalogReady, 'Active medication catalog did not load in stock receipt form');
  await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.innerText === "Dispense stock").click(); true');
  let dispenseReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    dispenseReady = await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Patient (optional)")');
    if (dispenseReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(dispenseReady, 'Pharmacy dispense form did not show patient search');
  assert.equal(await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Search stocked medication")'), true, 'Pharmacy dispense form did not show medication lookup');
  await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.innerText === "Dispense history").click(); true');
  assert.equal(await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Search patient by name or MRD") && Boolean(document.querySelector(".pharmacy-modal button[type=submit]:disabled"))'), true, 'Pharmacy history did not require patient selection');
  await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
  const hasBatch = await evaluate('Boolean(document.querySelector(".pharmacy-section table tbody tr button"))');
  if (hasBatch) {
    await evaluate('Array.from(document.querySelectorAll(".pharmacy-section table tbody tr button")).find(button => button.innerText === "Movements").click(); true');
    let movementsReady = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      movementsReady = await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Stock movements") && !document.querySelector(".pharmacy-modal")?.innerText.includes("Loading movements")');
      if (movementsReady) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(movementsReady, 'Pharmacy batch movements did not load');
    await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
    await evaluate('Array.from(document.querySelectorAll(".pharmacy-section table tbody tr button")).find(button => button.innerText === "Adjust count").click(); true');
    assert.equal(await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Counted quantity") && Boolean(document.querySelector(".pharmacy-modal button[type=submit]:disabled"))'), true, 'Pharmacy adjustment form did not require a changed count and reason');
    await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
    await evaluate('Array.from(document.querySelectorAll(".pharmacy-section table tbody tr button")).find(button => button.innerText === "Quarantine").click(); true');
    assert.equal(await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Reason for quarantine") && Boolean(document.querySelector(".pharmacy-modal button[type=submit]:disabled"))'), true, 'Pharmacy quarantine form did not require a reason');
    await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
  }
  const disposeAction = await evaluate('Boolean(Array.from(document.querySelectorAll(".pharmacy-section table tbody tr button")).find(button => button.innerText === "Dispose stock"))');
  if (disposeAction) {
    await evaluate('Array.from(document.querySelectorAll(".pharmacy-section table tbody tr button")).find(button => button.innerText === "Dispose stock").click(); true');
    assert.equal(await evaluate('document.querySelector(".pharmacy-modal")?.innerText.includes("Quantity to dispose") && document.querySelector(".pharmacy-modal")?.innerText.includes("Reason for disposal") && Boolean(document.querySelector(".pharmacy-modal button[type=submit]:disabled"))'), true, 'Pharmacy disposal form did not require quantity and reason');
    await evaluate('document.querySelector(".pharmacy-modal__header button").click(); true');
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
  assert.equal(await evaluate('Boolean(document.querySelector("select#handoff-assignment")) && Boolean(document.querySelector(".inpatient-handoff-filters input[type=checkbox]"))'), true, 'Pending handoff filters did not render');
  assert.equal(await evaluate('Boolean(document.querySelector(".inpatient-section[aria-label^=Pending]"))'), true, 'Pending handoff queue did not render');
  await evaluate('history.pushState({}, "", "/patients"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let patientPageReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { patientPageReady = await evaluate('Boolean(document.querySelector(".patient-mrd-lookup")) && !document.body.innerText.includes("Loading...")'); } catch { /* navigation resets the execution context */ }
    if (patientPageReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(patientPageReady, 'Patient registration page did not load');
  const hasPatientRow = await evaluate('Boolean(document.querySelector(".ui-table tbody tr .ui-action-menu__trigger"))');
  if (hasPatientRow) {
    await evaluate('document.querySelector(".ui-table tbody tr .ui-action-menu__trigger").click(); true');
    const mergeItem = await evaluate('Boolean(Array.from(document.querySelectorAll("[role=menuitem]")).find(button => button.innerText.includes("Merge into another patient")))');
    assert.ok(mergeItem, 'Patient merge action was unavailable to super admin');
    await evaluate('Array.from(document.querySelectorAll("[role=menuitem]")).find(button => button.innerText.includes("Merge into another patient")).click(); true');
    assert.equal(await evaluate('Boolean(document.querySelector("[role=dialog] #patient-merge-search")) && Boolean(document.querySelector("[role=dialog] button.ui-btn--danger:disabled"))'), true, 'Merge dialog did not require target selection and source confirmation');
    const mergeSourceMrd = await evaluate('document.querySelector("[role=dialog] .patient-merge p")?.innerText.split("(").pop().split(")")[0]');
    const mergeTargets = await evaluate(`fetch('/api/patients', { credentials: 'include' }).then(async response => (await response.json()).data?.filter(patient => patient.mrdNumber !== ${JSON.stringify(mergeSourceMrd)}) || [])`) as Array<{ mrdNumber: string }>;
    if (mergeTargets.length) {
      await evaluate(`(() => { const input = document.querySelector('#patient-merge-search'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, ${JSON.stringify(mergeTargets[0].mrdNumber)}); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await evaluate('document.querySelector(".patient-merge form").requestSubmit(); true');
      let targetReady = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        targetReady = await evaluate('Boolean(document.querySelector(".patient-merge__candidates button"))');
        if (targetReady) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const mergeSearchState = await evaluate('({ value: document.querySelector("#patient-merge-search")?.value, error: document.querySelector(".patient-merge .ui-alert")?.innerText, text: document.querySelector(".patient-merge")?.innerText.slice(0, 400) })');
      assert.ok(targetReady, `Merge destination search did not return an active patient: ${JSON.stringify(mergeSearchState)}`);
      await evaluate('document.querySelector(".patient-merge__candidates button").click(); true');
      assert.equal(await evaluate('Boolean(document.querySelector("#patient-merge-confirm")) && Boolean(document.querySelector("[role=dialog] button.ui-btn--danger:disabled"))'), true, 'Merge destination selection did not require source MRD confirmation');
    }
    await evaluate('document.querySelector("[role=dialog] .ui-modal__close").click(); true');
  }
  await evaluate('history.pushState({}, "", "/patients/registration-sources"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let sourcePageReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    sourcePageReady = await evaluate('Boolean(document.querySelector(".registration-sources-page .registration-sources-form")) && document.body.innerText.includes("Registration Sources")');
    if (sourcePageReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(sourcePageReady, 'Registration source management page did not render');
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load registration sources")'), false, 'Registration source catalog failed to load');
  let sourceHistoryReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    sourceHistoryReady = await evaluate('Boolean([...document.querySelectorAll(".registration-sources-actions button")].find(button => button.textContent?.includes("History")))');
    if (sourceHistoryReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const sourcePageState = await evaluate('({ text: document.querySelector(".registration-sources-page")?.innerText.slice(0, 650), rows: document.querySelectorAll(".registration-sources-actions").length, error: document.querySelector(".ui-alert")?.innerText })');
  assert.ok(sourceHistoryReady, `Registration source catalog did not show seeded rows: ${JSON.stringify(sourcePageState)}`);
  await evaluate('[...document.querySelectorAll(".registration-sources-actions button")].find(button => button.textContent?.includes("History")).click(); true');
  let sourceHistoryLoaded = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    sourceHistoryLoaded = await evaluate('Boolean(document.querySelector("[role=dialog]")?.getAttribute("aria-label")?.startsWith("History:")) && !document.body.innerText.includes("Loading history...")');
    if (sourceHistoryLoaded) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(sourceHistoryLoaded, 'Registration source history did not open');
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load source history")'), false, 'Registration source history API failed');
  await evaluate('document.querySelector("[role=dialog] .ui-modal__close").click(); document.querySelector(".registration-sources-report form").requestSubmit(); true');
  let sourceReportReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    sourceReportReady = await evaluate('Boolean(document.querySelector(".registration-sources-report__table tbody tr"))');
    if (sourceReportReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(sourceReportReady, 'Registration source report did not render rows');
  assert.equal(await evaluate('document.body.innerText.includes("Unable to load source report")'), false, 'Registration source report API failed');
  await evaluate('history.pushState({}, "", "/billing"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let billingReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    billingReady = await evaluate('document.body.innerText.includes("Billing & Payments") && Boolean([...document.querySelectorAll("button")].find(button => button.textContent?.includes("Cashier report")))');
    if (billingReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(billingReady, 'Billing page and cashier report action did not render');
  await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent?.includes("Cashier report")).click(); true');
  let cashierReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    cashierReady = await evaluate('Boolean(document.querySelector("#cashier-report-title")) && document.body.innerText.includes("Cash handled by staff")');
    if (cashierReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const cashierState = await evaluate('({ dialog: document.querySelector("[role=dialog]")?.innerText.slice(0, 600), path: location.pathname })');
  assert.ok(cashierReady, `Cashier operator breakdown did not render: ${JSON.stringify(cashierState)}`);
  assert.equal(await evaluate('Boolean(Array.from(document.querySelectorAll("#cashier-report-title ~ * button, #cashier-report-title + * button, .billing-modal button")).find(button => button.textContent?.includes("Export CSV")))'), true, 'Cashier report export action did not render');
  await evaluate('document.querySelector("#cashier-report-title").closest("[role=dialog]").querySelector("button[aria-label]").click(); [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Receivables")).click(); true');
  let receivablesReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    receivablesReady = await evaluate('Boolean(document.querySelector("#receivables-title")) && document.body.innerText.includes("Invoice details") && Boolean(document.querySelector("#receivables-title").closest("[role=dialog]").querySelector(".billing-ledger-table tbody tr"))');
    if (receivablesReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(receivablesReady, 'Receivables report did not render');
  await evaluate('document.querySelector("#receivables-title").closest("[role=dialog]").querySelector("button[aria-label]").click(); [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Cash closeouts")).click(); true');
  let closeoutsReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    closeoutsReady = await evaluate('Boolean(document.querySelector("#cash-closeout-title")) && Boolean(document.querySelector(".billing-ledger-table"))');
    if (closeoutsReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(closeoutsReady, 'Cash closeout review did not render');
  assert.equal(await evaluate('document.querySelector("#cash-closeout-title")?.closest("[role=dialog]")?.innerText.includes("Recorded bank deposits")'), true, 'Cash deposit register did not render');
  const closeoutFetch = await evaluate('fetch(`/api/billing/closeouts?date=${document.querySelector("#cash-closeout-title").closest("[role=dialog]").querySelector("input[type=date]").value}`, { credentials: "include" }).then(async response => ({ status: response.status, rows: (await response.json()).data }))');
  assert.equal(closeoutFetch.status, 200, 'Cash closeout review API failed');
  assert.ok(Array.isArray(closeoutFetch.rows), 'Cash closeout review did not return rows');
  await evaluate('history.pushState({}, "", "/checkin"); window.dispatchEvent(new PopStateEvent("popstate")); true');
  let opdQueueReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    opdQueueReady = await evaluate('document.body.innerText.includes("Track today\'s OP check-ins") && [...document.querySelectorAll("option")].some(option => option.value === "waiting") && [...document.querySelectorAll("option")].some(option => option.value === "consulting")');
    if (opdQueueReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(opdQueueReady, 'OPD consultation queue filters did not render');
  console.log(`Browser smoke passed: authenticated laboratory and radiology worklists, communication queues, pharmacy patient forms${hasBatch ? ', stock movements and count form' : ''}, inpatient dashboard, patient registration${hasPatientRow ? ' and merge confirmation' : ''}, registration source management, history and report${patientLookup.body.data?.length ? ', radiology patient selection' : ''}${finalOrderNumber ? ', finalized radiology report print output' : ''}, cashier and receivables reports, cash closeout review, and OPD queue rendered in headless Chrome.`);
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
