import Apple from "@auth/core/providers/apple";
import Credentials from "@auth/core/providers/credentials";
import Google from "@auth/core/providers/google";
import { authHandler, initAuthConfig } from "@hono/auth-js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { Hono } from "hono";
import { contextStorage, getContext } from "hono/context-storage";
import ws from "ws";
import NeonAdapter from "../../../../server/adapter";
import { AUTH_API_BASENAME } from "../../../../server/api-paths";
import { getAuthActionDetails } from "../../../../server/is-auth-action";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { authorizePatientCredentials } from "@/app/api/utils/patientCredentialAuth";
import { getPatientAccountStatus } from "@/app/api/utils/patientAccountStatus";
import { ensurePatientSessionColumns } from "@/app/api/utils/patientSessions";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = NeonAdapter(pool);
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const SESSION_ROTATION_WINDOW_SECONDS = 15 * 60;

function shouldRefreshJwtExpiry({ token, user, trigger }) {
  if (user?.id || trigger === "update") {
    return true;
  }

  const exp = Number(token?.exp);
  if (!Number.isFinite(exp)) {
    return true;
  }

  return exp - Math.floor(Date.now() / 1000) <= SESSION_ROTATION_WINDOW_SECONDS;
}

function rotateJwtExpiry(token) {
  const now = Math.floor(Date.now() / 1000);
  token.iat = now;
  token.exp = now + SESSION_MAX_AGE_SECONDS;
  return token;
}

function getOauthProviders() {
  const providers = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: process.env.AUTH_APPLE_SECRET,
      }),
    );
  }

  return providers;
}

const app = new Hono();
app.use("*", contextStorage());

if (authSecret) {
  app.use(
    "*",
    initAuthConfig(() => ({
      secret: authSecret,
      basePath: AUTH_API_BASENAME,
      trustHost: true,
      pages: {
        signIn: "/account/signin",
        signOut: "/account/logout",
      },
      session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE_SECONDS, // 8 hours — HIPAA §164.312(a)(2)(iii) automatic logoff
      },
      callbacks: {
        async jwt({ token, user, trigger }) {
          await ensurePatientSessionColumns();

          const userId = user?.id || token?.sub;
          if (!userId) {
            return token;
          }

          const accountStatus = await getPatientAccountStatus(userId);
          if (!accountStatus || accountStatus.disabled) {
            return {};
          }

          const sessionVersion = Number(accountStatus.session_version || 0);
          const tokenSessionVersion = Number(token?.sessionVersion ?? sessionVersion);
          if (tokenSessionVersion !== sessionVersion) {
            return {};
          }

          token.sub = String(userId);
          token.role = user?.role || accountStatus.role || token?.role || null;
          token.sessionVersion = sessionVersion;

          if (shouldRefreshJwtExpiry({ token, user, trigger })) {
            rotateJwtExpiry(token);
          }

          return token;
        },
        async session({ session, user, token }) {
          const userId = user?.id || token?.sub;
          if (!userId) {
            return null;
          }

          const accountStatus = await getPatientAccountStatus(userId);
          if (!accountStatus || accountStatus.disabled) {
            return null;
          }

          const role = user?.role || accountStatus.role || token?.role || null;
          const sessionVersion = Number(accountStatus.session_version || 0);
          if (Number(token?.sessionVersion ?? sessionVersion) !== sessionVersion) {
            return null;
          }

          session.user.id = String(userId);
          session.user.role = role;
          if (token?.exp) {
            session.expires = new Date(Number(token.exp) * 1000).toISOString();
          }
          return session;
        },
      },
      cookies: {
        csrfToken: {
          options: {
            secure: true,
            sameSite: "lax",
          },
        },
        sessionToken: {
          options: {
            secure: true,
            sameSite: "lax",
          },
        },
        callbackUrl: {
          options: {
            secure: true,
            sameSite: "lax",
          },
        },
      },
      providers: [
        ...getOauthProviders(),
        Credentials({
          id: "credentials-signin",
          name: "Credentials Sign in",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
            captchaToken: { label: "CAPTCHA Token", type: "text" },
          },
          authorize: async (credentials) => {
            const request = getContext()?.req?.raw || null;
            return authorizePatientCredentials({ request, adapter, credentials });
          },
        }),
        Credentials({
          id: "credentials-signup",
          name: "Credentials Sign up",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
            name: { label: "Name", type: "text" },
            image: { label: "Image", type: "text", required: false },
          },
          authorize: async () => {
            return null;
          },
        }),
      ],
    })),
  );
}

app.use(`${AUTH_API_BASENAME}/*`, async (c, next) => {
  if (!authSecret) {
    return c.json(
      { error: "Authentication service is not configured. Please contact support." },
      500,
    );
  }
  const actionDetails = getAuthActionDetails(c.req.path);
  if (!actionDetails) {
    return c.json({ error: "API route not found", path: c.req.path }, 404);
  }

  const isCredentialSigninPost =
    c.req.method === "POST" &&
    actionDetails.providerId === "credentials-signin" &&
    (actionDetails.action === "callback" || actionDetails.action === "signin");

  if (isCredentialSigninPost) {
    return withFullProtection(c.req.raw, "auth-login", () => authHandler()(c, next));
  }

  return authHandler()(c, next);
});

function handleAuth(request) {
  return app.fetch(request);
}

export const GET = handleAuth;
export const POST = handleAuth;
