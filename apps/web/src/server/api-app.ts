import { AsyncLocalStorage } from 'node:async_hooks';
import nodeConsole from 'node:console';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { serializeError } from 'serialize-error';
import { API_BASENAME } from './api-paths';
import { withFullProtection } from '@/app/api/utils/ddosProtection';
import { getMaintenanceMode } from '@/app/api/utils/maintenanceMode';
import {
  getStartupOfflineMessage,
  waitForStartupValidation,
} from '@/app/api/utils/startupValidation';
import {
  DEFAULT_API_BODY_LIMIT_BYTES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UPLOAD_FILE_TOO_LARGE_MESSAGE,
  getApiBodyLimitBytes,
} from '@/utils/uploadLimits';
import { getPublicAppHost, resolveSiteSurfaceFromHost } from '@/utils/siteSurface';
import { captureError, flushSentry } from '@/utils/monitoring/sentry.server';

const als = new AsyncLocalStorage<{ requestId: string }>();

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = nodeConsole[method].bind(console);
  console[method] = (...args: unknown[]) => {
    const requestId = als.getStore()?.requestId;
    if (requestId) {
      original(`[traceId:${requestId}]`, ...args);
      return;
    }
    original(...args);
  };
}


function isHtmlNavigationRequest(request: Request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function shouldBypassMaintenance(path: string) {
  return (
    path === '/maintenance' ||
    path.startsWith('/api/auth') ||
    path.startsWith('/account/signin') ||
    path === '/signin' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-email' ||
    path === '/mfa-setup' ||
    path === '/mfa-challenge' ||
    path.startsWith('/api/csrf-token') ||
    path.startsWith('/api/ping')
  );
}

function isClinicOnlyPath(path: string) {
  return (
    path.startsWith('/clinic-admin') ||
    path.startsWith('/clinic-onboarding') ||
    path.startsWith('/api/clinic') ||
    path.startsWith('/api/clinic-admin')
  );
}

function isPatientOwnedPath(path: string) {
  return path.startsWith('/account') || path.startsWith('/api/auth');
}

function getRequestHost(c: { req: { header: (name: string) => string | undefined } }) {
  return String(c.req.header('x-forwarded-host') || c.req.header('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function getRequestProto(c: { req: { header: (name: string) => string | undefined } }) {
  return String(c.req.header('x-forwarded-proto') || 'https')
    .split(',')[0]
    .trim()
    .toLowerCase() || 'https';
}

export function createApiApp() {
  const app = new Hono();
  const defaultApiBodyLimit = bodyLimit({
    maxSize: DEFAULT_API_BODY_LIMIT_BYTES,
    onError: (c) => c.json({ error: 'Body size limit exceeded' }, 413),
  });
  const uploadApiBodyLimit = bodyLimit({
    maxSize: MAX_UPLOAD_FILE_SIZE_BYTES,
    onError: (c) => c.json({ error: UPLOAD_FILE_TOO_LARGE_MESSAGE }, 413),
  });

  app.use('*', requestId());
  app.use('*', (c, next) => {
    const id = c.get('requestId');
    return als.run({ requestId: id }, () => next());
  });
  app.use(contextStorage());

  app.use('*', async (c, next) => {
    const host = getRequestHost(c);
    const publicHost = getPublicAppHost();

    if (publicHost && host === `www.${publicHost}`) {
      const url = new URL(c.req.url);
      url.protocol = `${getRequestProto(c)}:`;
      url.host = publicHost;
      return c.redirect(url.toString(), 301);
    }

    return next();
  });

  app.use('*', async (c, next) => {
    const state = await waitForStartupValidation();

    if (state.status !== 'failed') {
      return next();
    }

    if (c.req.path === '/maintenance') {
      return next();
    }

    const message = getStartupOfflineMessage();
    c.header('Retry-After', '300');

    if (c.req.path.startsWith('/api/')) {
      return c.json(
        {
          error: 'Service temporarily unavailable',
          code: 'STARTUP_VALIDATION_FAILED',
          message,
        },
        503
      );
    }

    if (isHtmlNavigationRequest(c.req.raw)) {
      const maintenanceUrl = new URL('/maintenance', c.req.url);
      if (c.req.url !== maintenanceUrl.toString()) {
        return c.redirect(maintenanceUrl.toString(), 302);
      }
    }

    return c.text(message, 503);
  });

  app.use('*', async (c, next) => {
    const path = c.req.path;

    if (shouldBypassMaintenance(path)) {
      return next();
    }

    const state = await getMaintenanceMode();
    if (!state.enabled) {
      return next();
    }

    if (path.startsWith('/api/')) {
      c.header('Retry-After', '300');
      return c.json(
        {
          error: 'Service temporarily unavailable',
          code: 'MAINTENANCE_MODE',
          message:
            state.message || 'Clearo is temporarily unavailable while maintenance is in progress.',
        },
        503
      );
    }

    if (isHtmlNavigationRequest(c.req.raw)) {
      const maintenanceUrl = new URL('/maintenance', c.req.url);
      if (c.req.url !== maintenanceUrl.toString()) {
        return c.redirect(maintenanceUrl.toString(), 302);
      }
    }

    return next();
  });

  if (process.env.NODE_ENV === 'production') {
    app.use('*', async (c, next) => {
      const path = c.req.path;
      const host = getRequestHost(c);
      const surface = resolveSiteSurfaceFromHost(host);

      if (surface === 'unknown') {
        return c.json({ error: 'Not found' }, 404);
      }

      if (isClinicOnlyPath(path) && surface !== 'clinic') {
        return c.json({ error: 'Not found' }, 404);
      }

      if (isPatientOwnedPath(path) && surface !== 'public') {
        return c.json({ error: 'Not found' }, 404);
      }

      return next();
    });
  }

  // Path traversal protection — check raw URL before framework normalizes it
  app.use('*', async (c, next) => {
    const rawUrl = c.req.url;
    if (/\.\.[/\\]|\.\.%2f|\.\.%5c/i.test(rawUrl)) {
      return c.json({ error: 'Invalid request path' }, 400);
    }
    await next();
  });

  // Security headers — applied to all responses
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header(
      'Permissions-Policy',
      'camera=("https://assets.hcaptcha.com" "https://newassets.hcaptcha.com"), microphone=("https://assets.hcaptcha.com" "https://newassets.hcaptcha.com"), geolocation=(self)'
    );
    if (process.env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      c.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.ingest.sentry.io; frame-ancestors 'none';"
      );
    }
  });

  if (process.env.CORS_ORIGINS) {
    app.use(
      '/api/*',
      cors({
        origin: process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
      })
    );
  }

  for (const method of ['post', 'put', 'patch'] as const) {
    app[method](
      '/api/*',
      async (c, next) => {
        const limit = getApiBodyLimitBytes(c.req.path);
        const middleware = limit === MAX_UPLOAD_FILE_SIZE_BYTES ? uploadApiBodyLimit : defaultApiBodyLimit;
        return middleware(c, next);
      }
    );
  }

  app.onError((err, c) => {
    const reqId = c.get('requestId') as string | undefined;
    console.error('API SERVER ERROR:', err);

    // Report to Sentry with request context (PHI is scrubbed in beforeSend)
    captureError(err, {
      requestId: reqId,
      tags: {
        route: c.req.path,
        method: c.req.method,
      },
      extra: {
        url: c.req.url,
        statusCode: 500,
      },
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
    return c.json(
      {
        error: 'An error occurred in your API',
        message: isDevelopment ? err.message : 'Internal server error',
        stack: isDevelopment ? err.stack : undefined,
        details: isDevelopment ? serializeError(err) : undefined,
      },
      500
    );
  });

  return app;
}
