import { ensureBrowserSmokeFixture } from './browser-smoke-fixture.js';

await ensureBrowserSmokeFixture();
process.env.BROWSER_SMOKE_REQUIRE_LAB_QUEUE = '1';
await import('./browser-smoke.js');
