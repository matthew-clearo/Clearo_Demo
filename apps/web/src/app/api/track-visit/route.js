import sql from "@/app/api/utils/sql";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import {
  VISITOR_LOG_RETENTION_DAYS,
  isAnalyticsPathAllowed,
  normalizePathname,
} from "@/privacy/consent";

function getClientIp(request) {
  // Vercel / Cloudflare / standard proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return null;
}

async function recordVisit({ pagePath, referrer, ipAddress, userAgent, country, region, city }) {
  await sql`
    INSERT INTO visitor_logs (
      user_id,
      ip_address,
      user_agent,
      page_path,
      referrer,
      country,
      city,
      region
    )
    VALUES (
      ${null},
      ${ipAddress || null},
      ${userAgent || null},
      ${pagePath},
      ${referrer || null},
      ${country || null},
      ${city || null},
      ${region || null}
    )
  `;
}

export async function GET(request) {
  return withFullProtection(request, "analytics", async () => {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  });
}

export async function POST(request) {
  return withFullProtection(request, "analytics", async () => {
    try {
      const body = await request.json();
      const pagePath = normalizePathname(body?.pagePath || "/");
      if (!body?.consentGranted || !isAnalyticsPathAllowed(pagePath)) {
        return Response.json({
          success: true,
          skipped: true,
          retentionDays: VISITOR_LOG_RETENTION_DAYS,
        }, { status: 202 });
      }

      await recordVisit({
        pagePath,
        referrer: body?.referrer || body?.referrerHost || null,
        ipAddress: getClientIp(request),
        userAgent: body?.userAgent || request.headers.get("user-agent") || null,
        country: request.headers.get("x-vercel-ip-country") || null,
        region: request.headers.get("x-vercel-ip-country-region") || null,
        city: decodeURIComponent(request.headers.get("x-vercel-ip-city") || "") || null,
      });

      return Response.json({
        success: true,
        retentionDays: VISITOR_LOG_RETENTION_DAYS,
      });
    } catch {
      return Response.json({ success: false }, { status: 200 });
    }
  });
}
