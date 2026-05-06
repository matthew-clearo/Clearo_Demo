import { createHonoServer } from 'react-router-hono-server/node';
import { kickoffStartupValidation } from '@/app/api/utils/startupValidation';
import { initSentry } from '@/utils/monitoring/sentry.server';
import { createApiApp } from './api-app';

initSentry();
await kickoffStartupValidation().catch(() => {});

const app = createApiApp();

export default await createHonoServer({
  app,
  defaultLogger: false,
});
