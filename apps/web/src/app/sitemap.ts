import type { LoaderFunctionArgs } from "react-router";
import sql from "@/app/api/utils/sql";
import { ensureAdminPhase2Tables } from "@/app/api/utils/adminPhase2";
import { getSiteOrigin } from "@/app/utils/seo.server";
// @ts-ignore
import { isSiteIndexingEnabled } from "@/app/api/utils/seoSettings";
// @ts-ignore
import logger from "@/app/api/utils/logger";

type UrlOptions = {
  lastmod?: string | null;
  changefreq?: string;
  priority?: string;
};

const STATIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/for-patients", changefreq: "monthly", priority: "0.7" },
  { path: "/for-providers", changefreq: "monthly", priority: "0.7" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.6" },
];

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastMod(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function toUrlTag(origin: string, path: string, opts: UrlOptions = {}) {
  const absolute = `${origin}${path === "/" ? "" : path}`;
  const lastmod = toLastMod(opts.lastmod);
  return [
    "<url>",
    `<loc>${escapeXml(absolute)}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    opts.changefreq ? `<changefreq>${escapeXml(opts.changefreq)}</changefreq>` : "",
    opts.priority ? `<priority>${escapeXml(opts.priority)}</priority>` : "",
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

async function loadDynamicSitemapRows() {
  try {
    await ensureAdminPhase2Tables();

    const [clinics, metadataRows] = await Promise.all([
      sql`
        SELECT public_id, updated_at
        FROM clinics
        WHERE approval_status = 'approved'
        ORDER BY updated_at DESC
        LIMIT 1000
      `,
      sql`
        SELECT route_path, updated_at
        FROM admin_page_metadata
        WHERE robots_index = true
        ORDER BY updated_at DESC
      `,
    ]);

    return { clinics, metadataRows };
  } catch (err) {
    logger.error({ err }, "Failed to load dynamic sitemap rows; returning static sitemap");
    return { clinics: [], metadataRows: [] };
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = getSiteOrigin(request);
  const indexingEnabled = await isSiteIndexingEnabled();

  if (!indexingEnabled) {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const { clinics, metadataRows } = await loadDynamicSitemapRows();

  const staticPathSet = new Set(STATIC_PATHS.map((s) => s.path));
  const metadataPaths = metadataRows
    .map((row: any) => row.route_path)
    .filter((path: string) => path && !path.includes("[") && !staticPathSet.has(path));

  const urls = [
    ...STATIC_PATHS.map((s) => toUrlTag(origin, s.path, { changefreq: s.changefreq, priority: s.priority })),
    ...metadataPaths.map((path: string) => toUrlTag(origin, path, { changefreq: "weekly", priority: "0.5" })),
    ...clinics.map((clinic: any) => toUrlTag(origin, `/clinic/${clinic.public_id}`, { lastmod: clinic.updated_at, changefreq: "weekly", priority: "0.8" })),
  ].join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls +
    `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
