import type { LoaderFunctionArgs } from "react-router";
// @ts-ignore
import sql from "@/app/api/utils/sql";
// @ts-ignore
import { ensureAdminPhase2Tables } from "@/app/api/utils/adminPhase2";
import { getSiteOrigin } from "@/app/utils/seo.server";

const STATIC_PAGES = [
  {
    path: "/",
    title: "Home",
    description:
      "Search and compare medical imaging clinics with listed pricing and appointment options. Book MRI, CT, X-ray, and ultrasound appointments online.",
  },
  {
    path: "/for-patients",
    title: "For Patients",
    description:
      "Learn how Clearo helps patients compare imaging clinics, see listed MRI, CT, X-ray and ultrasound pricing, and book appointments online.",
  },
  {
    path: "/for-providers",
    title: "For Providers",
    description:
      "Learn how your imaging clinic can list on Clearo, publish pricing, manage appointment slots, and handle patient bookings.",
  },
  {
    path: "/how-it-works",
    title: "How It Works",
    description:
      "Step-by-step guide: 1) Search for your scan type and location. 2) Compare prices across listed clinics. 3) Choose an appointment time. 4) Attend your appointment.",
  },
  {
    path: "/about",
    title: "About Clearo",
    description:
      "Clearo's mission is to make medical imaging clear, fast, and fair. We believe everyone deserves access to affordable, high-quality imaging regardless of where they live.",
  },
  {
    path: "/search",
    title: "Search Clinics",
    description:
      "Search imaging clinics by scan type (MRI, CT, X-ray, ultrasound), suburb, postcode, or state. Filter by price range, distance, and availability.",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = getSiteOrigin(request);

  let dynamicPages: { path: string; title: string; description: string }[] = [];
  let clinicPages: { path: string; title: string; description: string }[] = [];
  try {
    await ensureAdminPhase2Tables();
    const rows = await sql`
      SELECT route_path, title, description
      FROM admin_page_metadata
      WHERE robots_index = true
      ORDER BY route_path ASC
    `;
    dynamicPages = rows
      .filter((r: any) => r.title && r.description)
      .map((r: any) => ({
        path: r.route_path,
        title: r.title,
        description: r.description,
      }));
  } catch {
    // fallback to static pages only
  }

  try {
    const clinics = await sql`
      SELECT
        c.public_id,
        c.name,
        c.city,
        c.state,
        c.description,
        MIN(cs.price) as starting_price,
        STRING_AGG(DISTINCT st.name, ', ' ORDER BY st.name) as services
      FROM clinics c
      LEFT JOIN clinic_scans cs ON cs.clinic_id = c.id AND cs.available = true
      LEFT JOIN scan_types st ON st.id = cs.scan_type_id
      WHERE c.approval_status = 'approved'
      GROUP BY c.public_id, c.name, c.city, c.state, c.description
      ORDER BY c.city ASC, c.name ASC
      LIMIT 100
    `;

    clinicPages = clinics.map((clinic: any) => {
      const location = [clinic.city, clinic.state].filter(Boolean).join(", ");
      const services = clinic.services || "medical imaging services";
      const price = clinic.starting_price ? ` Prices start from $${clinic.starting_price}.` : "";
      const description =
        clinic.description ||
        `${clinic.name}${location ? ` in ${location}` : ""} offers ${services}.`;

      return {
        path: `/clinic/${clinic.public_id}`,
        title: `${clinic.name}${location ? ` - ${location}` : ""}`,
        description: `${description} Available services include ${services}.${price}`,
      };
    });
  } catch {
    // Clinic data is helpful for AI crawlers, but llms-full.txt should never fail without it.
  }

  const seenPaths = new Set<string>();
  const allPages = [...STATIC_PAGES];
  for (const page of [...dynamicPages, ...clinicPages]) {
    if (!seenPaths.has(page.path) && !STATIC_PAGES.some((s) => s.path === page.path)) {
      allPages.push(page);
    }
    seenPaths.add(page.path);
  }

  const sections = allPages.map((page) => {
    const url = `${origin}${page.path === "/" ? "" : page.path}`;
    return `## ${page.title}\n\nURL: ${url}\n\n${page.description}`;
  });

  const body = `# Clearo — Full Site Description

> Medical imaging booking platform. Compare MRI, CT, X-ray and ultrasound pricing across listed clinics and book appointments online.

Clearo connects patients with medical imaging clinics across Australia. The platform provides:

- Transparent, upfront pricing for all scan types
- Appointment options from listed clinics
- Online booking flow
- Side-by-side clinic comparison by price, distance, and availability

Clinic profiles show information available in the platform. Clinics remain responsible for their own clinical standards and patient care.

---

${sections.join("\n\n---\n\n")}

---

## Technical Details

- Country: Australia
- Website: ${origin}
- Sitemap: ${origin}/sitemap.xml
- Robots: ${origin}/robots.txt
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
