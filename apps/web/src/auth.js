import CreateAuth from "@auth/create";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

const { auth: baseAuth } = CreateAuth();

async function authFromRequest(request) {
  const fallbackBase = getRequiredPublicAppOrigin();
  const requestUrl = new URL(request.url, fallbackBase);
  const sessionUrl = new URL("/api/auth/session", requestUrl.origin);

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }

  // Preserve forwarded host/protocol so Auth.js can resolve callbacks consistently.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");
  if (forwardedHost) headers.set("x-forwarded-host", forwardedHost);
  if (forwardedProto) headers.set("x-forwarded-proto", forwardedProto);
  if (host) headers.set("host", host);

  const response = await fetch(sessionUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const session = await response.json().catch(() => null);
  if (!session || typeof session !== "object") {
    return null;
  }
  return session;
}

export async function auth(request) {
  if (request instanceof Request) {
    return authFromRequest(request);
  }
  return baseAuth();
}
