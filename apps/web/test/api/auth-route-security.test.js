/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const useHandlers = [];
const withFullProtectionMock = vi.fn(async (_request, _key, handler) => handler());
const authHandlerMiddlewareMock = vi.fn(async () => Response.json({ ok: true }));
const getPatientAccountStatusMock = vi.fn();
let currentRequest = null;
let authConfigFactory = null;

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: withFullProtectionMock,
}));

vi.mock("@auth/core/providers/apple", () => ({
  default: vi.fn(() => ({ id: "apple" })),
}));

vi.mock("@auth/core/providers/google", () => ({
  default: vi.fn(() => ({ id: "google" })),
}));

vi.mock("@auth/core/providers/credentials", () => ({
  default: vi.fn((config) => config),
}));

vi.mock("@neondatabase/serverless", () => ({
  Pool: vi.fn(() => ({})),
  neonConfig: {},
}));

vi.mock("ws", () => ({
  default: {},
}));

vi.mock("../../src/server/adapter", () => ({
  default: vi.fn(() => ({
    getUserByEmail: vi.fn(),
  })),
}));

vi.mock("@/server/api-paths", () => ({
  AUTH_API_BASENAME: "/api/auth",
}));

vi.mock("@hono/auth-js", () => ({
  initAuthConfig: vi.fn((factory) => {
    authConfigFactory = factory;
    return async (_c, next) => next();
  }),
  authHandler: vi.fn(() => authHandlerMiddlewareMock),
}));

vi.mock("hono/context-storage", () => ({
  contextStorage: vi.fn(() => async (_c, next) => next()),
  getContext: vi.fn(() => ({
    req: {
      raw: currentRequest,
    },
  })),
}));

vi.mock("hono", () => ({
  Hono: class {
    use(path, handler) {
      useHandlers.push({ path, handler });
    }

    async fetch(request) {
      currentRequest = request;
      const url = new URL(request.url);
      const c = {
        req: {
          raw: request,
          path: url.pathname,
          method: request.method,
        },
        json: (body, status = 200) => Response.json(body, { status }),
      };

      const matchingHandlers = useHandlers
        .filter(({ path }) => path === "*" || (path.endsWith("/*") && url.pathname.startsWith(path.slice(0, -1))))
        .map(({ handler }) => handler);

      let index = -1;
      const dispatch = async () => {
        index += 1;
        const handler = matchingHandlers[index];
        if (!handler) return Response.json({ ok: false }, { status: 404 });
        return handler(c, dispatch);
      };

      return dispatch();
    }
  },
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  getPatientAccountStatus: getPatientAccountStatusMock,
}));

describe("/api/auth/[...auth] security wrapper", () => {
  beforeEach(() => {
    useHandlers.length = 0;
    vi.resetModules();
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret";
    authConfigFactory = null;
  });

  it("rate limits patient credential sign-in callback posts", async () => {
    const { POST } = await import("@/app/api/auth/[...auth]/route");

    const response = await POST(
      new Request("http://localhost/api/auth/callback/credentials-signin", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(withFullProtectionMock).toHaveBeenCalledWith(
      expect.any(Request),
      "auth-login",
      expect.any(Function),
    );
    expect(authHandlerMiddlewareMock).toHaveBeenCalled();
  });

  it("does not wrap OAuth callbacks in the credential login limiter", async () => {
    const { POST } = await import("@/app/api/auth/[...auth]/route");

    const response = await POST(
      new Request("http://localhost/api/auth/callback/google", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(withFullProtectionMock).not.toHaveBeenCalled();
    expect(authHandlerMiddlewareMock).toHaveBeenCalled();
  });

  it("clears session state for disabled patients during auth session refresh", async () => {
    getPatientAccountStatusMock.mockResolvedValue({
      id: 42,
      role: "disabled",
      admin_disabled_at: "2026-03-17T00:00:00.000Z",
      disabled: true,
    });

    await import("@/app/api/auth/[...auth]/route");
    const config = authConfigFactory();

    const jwtResult = await config.callbacks.jwt({
      token: { sub: "42", role: "patient" },
      user: undefined,
    });
    const sessionResult = await config.callbacks.session({
      session: { user: {} },
      user: undefined,
      token: { sub: "42", role: "patient" },
    });

    expect(jwtResult).toEqual({});
    expect(sessionResult).toBeNull();
  });

  it("rotates jwt expiry when the client explicitly refreshes the session", async () => {
    getPatientAccountStatusMock.mockResolvedValue({
      id: 42,
      role: "patient",
      admin_disabled_at: null,
      disabled: false,
    });

    await import("@/app/api/auth/[...auth]/route");
    const config = authConfigFactory();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const jwtResult = await config.callbacks.jwt({
      token: { sub: "42", role: "patient", exp: nowSeconds + 60 },
      user: undefined,
      trigger: "update",
    });
    const sessionResult = await config.callbacks.session({
      session: { user: {} },
      user: undefined,
      token: jwtResult,
    });

    expect(jwtResult.exp).toBeGreaterThan(nowSeconds + 7 * 60 * 60);
    expect(sessionResult.user.id).toBe("42");
    expect(Date.parse(sessionResult.expires)).toBe(jwtResult.exp * 1000);
  });
});
