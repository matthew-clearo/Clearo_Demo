import { handle } from 'hono/vercel';
import { initSentry } from '../src/utils/monitoring/sentry.server';
import { createApiApp } from '../src/server/api-app';

initSentry();
const app = createApiApp();
export default handle(app);
