import sql from "@/app/api/utils/sql";
import { ensureAdminPhase2Tables } from "@/app/api/utils/adminPhase2";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";
import { isSiteIndexingEnabled } from "@/app/api/utils/seoSettings";

function firstHeaderValue(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0];
}

function canonicalHost(host) {
  return String(host || "").startsWith("www.")
    ? String(host).slice(4)
    : String(host || "");
}

export function getSiteOrigin(request) {
  if (request?.headers) {
    const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
    const host = canonicalHost(forwardedHost || firstHeaderValue(request.headers.get("host")));

    if (host) {
      const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
      const proto =
        forwardedProto ||
        (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  if (request?.url) {
    try {
      return new URL(request.url).origin;
    } catch {
      // Fall through to configured public origin.
    }
  }

  return getRequiredPublicAppOrigin();
}

function canonicalFrom({ candidate, origin, routePath }) {
  const fallback = `${origin}${routePath === "/" ? "" : routePath}`;
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate, origin);
    const originUrl = new URL(origin);

    if (url.hostname.endsWith(".vercel.app") && !originUrl.hostname.endsWith(".vercel.app")) {
      return `${origin}${url.pathname === "/" ? "" : url.pathname}${url.search}`;
    }

    return url.toString();
  } catch {
    return fallback;
  }
}

async function getPageMetadata(routePaths = []) {
  await ensureAdminPhase2Tables();

  for (const routePath of routePaths) {
    if (!routePath) continue;
    const [row] = await sql`
      SELECT *
      FROM admin_page_metadata
      WHERE route_path = ${routePath}
      LIMIT 1
    `;
    if (row) return row;
  }

  return null;
}

export async function getManagedPageContent(key) {
  if (!key) return null;
  await ensureAdminPhase2Tables();

  const [row] = await sql`
    SELECT *
    FROM admin_page_content
    WHERE key = ${key} AND status = 'published'
    LIMIT 1
  `;

  return row || null;
}

export async function buildSeoPayload({
  request,
  routePaths,
  defaults,
}) {
  const origin = getSiteOrigin(request);
  const [metadata, indexingEnabled] = await Promise.all([
    getPageMetadata(routePaths),
    isSiteIndexingEnabled(),
  ]);
  const routePath = routePaths?.[0] || "/";
  const canonicalUrl = canonicalFrom({
    candidate: metadata?.canonical_url || defaults.canonicalUrl,
    origin,
    routePath,
  });

  return {
    title: metadata?.title || defaults.title,
    description: metadata?.description || defaults.description,
    ogTitle: metadata?.og_title || metadata?.title || defaults.ogTitle || defaults.title,
    ogDescription:
      metadata?.og_description ||
      metadata?.description ||
      defaults.ogDescription ||
      defaults.description,
    canonicalUrl,
    robotsIndex: indexingEnabled ? (metadata?.robots_index ?? defaults.robotsIndex ?? true) : false,
    robotsFollow: indexingEnabled ? (metadata?.robots_follow ?? defaults.robotsFollow ?? true) : false,
    ogImage: defaults.ogImage || `${origin}/og-image.jpg`,
    ogType: defaults.ogType || "website",
    origin,
    routePath,
  };
}
