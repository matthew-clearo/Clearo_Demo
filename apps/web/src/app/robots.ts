import type { LoaderFunctionArgs } from "react-router";
import { getSiteOrigin } from "@/app/utils/seo.server";
// @ts-ignore
import { isSiteIndexingEnabled } from "@/app/api/utils/seoSettings";

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = getSiteOrigin(request);
  const indexingEnabled = await isSiteIndexingEnabled();

  const lines: string[] = ["User-agent: *"];

  if (indexingEnabled) {
    lines.push(
      "Allow: /",
      "Allow: /search",
      "Allow: /api/clinics",
      "Allow: /api/scan-types",
      "Allow: /api/locations",
      "Allow: /api/locations/cities",
      "Disallow: /account",
      "Disallow: /api",
      "Disallow: /clinic-admin",
      "",
      "Allow: /llms.txt",
      "Allow: /llms-full.txt",
    );
  } else {
    lines.push("Disallow: /");
  }

  lines.push("", `Sitemap: ${origin}/sitemap.xml`, "");

  const body = lines.join("\n");
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  };

  if (!indexingEnabled) {
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }

  return new Response(body, { headers });
}
