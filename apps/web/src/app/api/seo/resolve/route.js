import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { buildSeoPayload } from "@/app/utils/seo.server";

const DEFAULTS_BY_PATH = {
  "/": {
    title: "Clearo | Compare Medical Imaging Prices and Book Online",
    description:
      "Compare MRI, CT, X-ray and ultrasound pricing across listed clinics. View appointment options and book medical imaging online.",
  },
  "/about": {
    title: "About Clearo | Transparent Medical Imaging Marketplace",
    description:
      "Learn how Clearo helps patients compare medical imaging clinics, listed prices, and appointment options.",
  },
  "/for-patients": {
    title: "For Patients | Compare Scan Prices and Book Imaging Online",
    description:
      "Compare clinics, listed MRI, CT, X-ray and ultrasound pricing, and book medical imaging online.",
  },
  "/for-providers": {
    title: "For Providers | Grow Imaging Bookings with Clearo",
    description:
      "Help your imaging clinic publish pricing, expose availability, and win more patient bookings through Clearo.",
  },
  "/how-it-works": {
    title: "How Clearo Works | Compare and Book Medical Imaging",
    description:
      "See how Clearo helps patients search, compare and book medical imaging clinics with listed pricing and appointment options.",
  },
  "/search": {
    title: "Search Imaging Clinics | Clearo",
    description:
      "Search imaging clinics, compare scan pricing, and explore appointment options across listed providers.",
    robotsIndex: false,
    robotsFollow: true,
  },
};

export async function GET(request) {
  return withFullProtection(request, "public", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const path = searchParams.get("path") || "/";
      const resolvedPath = searchParams.get("resolvedPath") || path;
      const entityId = searchParams.get("entityId") || "";

      if (path === "/clinic/[id]") {
        const [clinic] = await sql`
          SELECT name, city, state, description
          FROM clinics
          WHERE public_id = ${entityId}
            AND approval_status = 'approved'
          LIMIT 1
        `;

        const seo = await buildSeoPayload({
          request,
          routePaths: [resolvedPath, path],
          defaults: {
            title: clinic?.name
              ? `${clinic.name} | Medical Imaging in ${clinic.city || "Australia"} | Clearo`
              : "Clinic Details | Clearo",
            description:
              clinic?.description ||
              (clinic?.name
                ? `Compare services, pricing and availability for ${clinic.name}${clinic?.city ? ` in ${clinic.city}` : ""}.`
                : "Compare clinic services, pricing and availability on Clearo."),
          },
        });

        return Response.json({
          seo,
          jsonLd: clinic
            ? {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: seo.origin },
                  { "@type": "ListItem", position: 2, name: "Search", item: `${seo.origin}/search` },
                  { "@type": "ListItem", position: 3, name: clinic.name, item: seo.canonicalUrl },
                ],
              }
            : null,
        });
      }

      const defaults = DEFAULTS_BY_PATH[path];
      if (!defaults) {
        return Response.json({ error: "Unknown SEO path" }, { status: 400 });
      }

      const seo = await buildSeoPayload({
        request,
        routePaths: [resolvedPath, path],
        defaults,
      });

      return Response.json({ seo });
    } catch (err) {
      logger.error({ err }, "GET /api/seo/resolve error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
