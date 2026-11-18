import 'reflect-metadata';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initializeDataSource } from './config/data-source.js';
import { sendOverdueHandoffReminders } from './modules/inpatient/services/handoff-reminder.service.js';

async function bootstrap() {
  await initializeDataSource();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Medora API running on ${env.APP_URL}`);
    let running = false;
    const remind = async () => {
      if (running) return;
      running = true;
      try {
        const sent = await sendOverdueHandoffReminders();
        if (sent) console.log(`Sent ${sent} overdue nursing handoff reminder(s)`);
      } catch (error) { console.error('Overdue nursing handoff reminder failed:', error); }
      finally { running = false; }
    };
    void remind();
    setInterval(() => { void remind(); }, 60_000).unref();
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
