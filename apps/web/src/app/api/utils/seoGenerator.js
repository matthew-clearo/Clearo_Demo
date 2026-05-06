import sql from "@/app/api/utils/sql";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

const TITLE_IDEAL = { min: 30, max: 60 };
const DESCRIPTION_IDEAL = { min: 120, max: 160 };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CORE_KEYWORDS = [
  "medical imaging",
  "MRI",
  "CT scan",
  "X-ray",
  "ultrasound",
  "compare prices",
  "book online",
  "Australia",
];

const STATIC_ROUTE_BLUEPRINTS = {
  "/": {
    label: "Clearo",
    audience: "patients comparing imaging options",
    keywords: ["medical imaging prices", "MRI prices", "CT scan prices", "book imaging online"],
    titles: [
      "Compare Medical Imaging Prices & Book Online | Clearo",
      "Clearo | Compare MRI, CT, X-ray & Ultrasound Prices",
    ],
    descriptions: [
      "Compare MRI, CT, X-ray and ultrasound prices across listed clinics. View appointment options and book medical imaging online.",
      "Clearo helps Australians compare medical imaging prices, check clinic availability and book MRI, CT, X-ray and ultrasound appointments online.",
    ],
  },
  "/about": {
    label: "About Clearo",
    audience: "patients and clinics learning about Clearo",
    keywords: ["medical imaging marketplace", "price transparency", "clinic booking"],
    titles: [
      "About Clearo | Medical Imaging Price Transparency",
      "About Clearo | Transparent Medical Imaging Marketplace",
    ],
    descriptions: [
      "Learn how Clearo makes medical imaging clearer with listed clinics, scan pricing and simple online booking for Australian patients.",
      "Clearo is building a transparent medical imaging marketplace where patients compare clinics, view prices and book scans with less friction.",
    ],
  },
  "/for-patients": {
    label: "For Patients",
    audience: "patients who need to book a scan",
    keywords: ["compare scan prices", "book MRI online", "book CT scan", "ultrasound prices"],
    titles: [
      "Compare MRI, CT & Ultrasound Prices | Clearo",
      "For Patients | Compare Scan Prices and Book Online",
    ],
    descriptions: [
      "Compare clinics, listed MRI, CT, X-ray and ultrasound pricing, then book medical imaging online with Clearo.",
      "Find medical imaging clinics near you, compare scan prices and choose a booking time that works without phone tag or hidden costs.",
    ],
  },
  "/for-providers": {
    label: "For Providers",
    audience: "medical imaging clinics",
    keywords: ["imaging clinic bookings", "scanner utilisation", "clinic scheduling software"],
    titles: [
      "Grow Imaging Bookings & Fill Scanner Capacity | Clearo",
      "For Providers | Grow Medical Imaging Bookings",
    ],
    descriptions: [
      "List your imaging clinic on Clearo to reach patients actively comparing scan prices, publish availability and grow confirmed bookings online.",
      "Clearo helps imaging providers fill scanner capacity, publish transparent pricing and convert patient demand into confirmed bookings.",
    ],
  },
  "/how-it-works": {
    label: "How Clearo Works",
    audience: "patients learning the booking process",
    keywords: ["how to book medical imaging", "compare clinics", "scan booking process"],
    titles: [
      "How Clearo Works | Compare and Book Medical Imaging",
      "How to Compare Scan Prices and Book Online | Clearo",
    ],
    descriptions: [
      "See how Clearo helps patients search imaging clinics, compare listed scan prices and book MRI, CT, X-ray or ultrasound appointments.",
      "Learn how to use Clearo to find clinics, compare medical imaging prices and book your scan online.",
    ],
  },
  "/search": {
    label: "Search Imaging Clinics",
    audience: "patients searching for a clinic",
    keywords: ["search imaging clinics", "compare scan prices", "clinic availability"],
    titles: [
      "Search Imaging Clinics and Compare Scan Prices | Clearo",
      "Search MRI, CT, X-ray & Ultrasound Clinics | Clearo",
    ],
    descriptions: [
      "Search imaging clinics, compare MRI, CT, X-ray and ultrasound prices, and view appointment options across Clearo.",
      "Find medical imaging clinics by location, scan type, price and availability with Clearo's transparent clinic search.",
    ],
    robotsIndex: false,
    robotsFollow: true,
  },
};

function cleanWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeSeoRoutePath(value) {
  const raw = cleanWhitespace(value || "/").split(/[?#]/)[0] || "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

function unique(values) {
  const seen = new Set();
  return values
    .map((value) => cleanWhitespace(value))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function humanizeRoute(routePath) {
  if (routePath === "/") return "Clearo";
  return routePath
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/[\[\]]/g, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(" ");
}

function canonicalFor(origin, routePath) {
  return `${origin}${routePath === "/" ? "" : routePath}`;
}

function fitSentence(value, max) {
  const text = cleanWhitespace(value);
  if (text.length <= max) return text;

  const trimmed = text.slice(0, max + 1);
  const sentenceBreak = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf("; "),
    trimmed.lastIndexOf(", "),
  );
  const cutAt = sentenceBreak > max * 0.68 ? sentenceBreak + 1 : trimmed.lastIndexOf(" ");

  return cleanWhitespace(trimmed.slice(0, cutAt > 0 ? cutAt : max));
}

function chooseByLength(candidates, ideal) {
  const cleaned = unique(candidates);
  const idealCandidate = cleaned.find(
    (candidate) => candidate.length >= ideal.min && candidate.length <= ideal.max,
  );
  if (idealCandidate) return idealCandidate;

  const underMax = cleaned
    .filter((candidate) => candidate.length <= ideal.max)
    .sort((a, b) => Math.abs(ideal.min - a.length) - Math.abs(ideal.min - b.length))[0];
  if (underMax) return underMax;

  return fitSentence(cleaned[0] || "", ideal.max);
}

function normalizeFocusKeywords(focusKeywords) {
  if (Array.isArray(focusKeywords)) {
    return unique(focusKeywords).slice(0, 6);
  }

  return unique(String(focusKeywords || "").split(",")).slice(0, 6);
}

function scoreCheck(label, passed, detail) {
  return { label, status: passed ? "pass" : "warn", detail };
}

export function scoreSeoSuggestion(suggestion) {
  const titleLength = (suggestion.title || "").length;
  const descriptionLength = (suggestion.description || "").length;
  const checks = [
    scoreCheck(
      "Title length",
      titleLength >= TITLE_IDEAL.min && titleLength <= TITLE_IDEAL.max,
      `${titleLength} characters`,
    ),
    scoreCheck(
      "Description length",
      descriptionLength >= DESCRIPTION_IDEAL.min && descriptionLength <= DESCRIPTION_IDEAL.max,
      `${descriptionLength} characters`,
    ),
    scoreCheck("Open Graph", Boolean(suggestion.ogTitle && suggestion.ogDescription), "Social sharing fields ready"),
    scoreCheck("Canonical", Boolean(suggestion.canonicalUrl), suggestion.canonicalUrl || "Missing canonical URL"),
    scoreCheck("Robots", suggestion.robotsFollow !== false, suggestion.robotsIndex ? "index, follow" : "noindex, follow"),
  ];

  const score = Math.round(
    (checks.filter((check) => check.status === "pass").length / checks.length) * 100,
  );

  return { score, checks };
}

async function getClinicContext(routePath) {
  const match = routePath.match(/^\/clinic\/([^/]+)$/);
  if (!match || !UUID_PATTERN.test(match[1])) return null;

  const [clinic] = await sql`
    SELECT id, public_id, name, description, city, state, rating, total_reviews
    FROM clinics
    WHERE public_id = ${match[1]}
      AND approval_status = 'approved'
    LIMIT 1
  `;

  if (!clinic) return null;

  const scans = await sql`
    SELECT st.name, cs.price
    FROM clinic_scans cs
    JOIN scan_types st ON st.id = cs.scan_type_id
    WHERE cs.clinic_id = ${clinic.id}
      AND cs.available = true
    ORDER BY cs.price ASC
    LIMIT 6
  `;

  return {
    ...clinic,
    scans: scans.map((scan) => ({
      name: cleanWhitespace(scan.name),
      price: scan.price,
    })),
  };
}

function generateClinicSuggestion({ routePath, origin, focusKeywords, clinic }) {
  const location = cleanWhitespace([clinic.city, clinic.state].filter(Boolean).join(", "));
  const scanNames = unique(clinic.scans?.map((scan) => scan.name) || []);
  const scanPhrase = scanNames.length > 0 ? scanNames.slice(0, 4).join(", ") : "MRI, CT, X-ray and ultrasound";
  const cityPhrase = clinic.city ? ` in ${clinic.city}` : "";
  const keywords = unique([
    ...focusKeywords,
    `${clinic.name} medical imaging`,
    location ? `medical imaging ${location}` : "",
    ...scanNames.map((scan) => `${scan} ${clinic.city || ""}`),
    "book medical imaging online",
  ]);

  const title = chooseByLength(
    [
      `${clinic.name} | Medical Imaging${cityPhrase} | Clearo`,
      `${clinic.name} | ${location || "Medical Imaging"} Scan Prices`,
      `Book ${scanNames[0] || "Medical Imaging"}${cityPhrase} | Clearo`,
    ],
    TITLE_IDEAL,
  );

  const description = chooseByLength(
    [
      `Compare ${scanPhrase} services, prices and availability at ${clinic.name}${cityPhrase}. Book medical imaging online with Clearo.`,
      `${clinic.name}${cityPhrase} offers ${scanPhrase} services. View transparent scan pricing, clinic details and booking availability on Clearo.`,
      clinic.description
        ? `${clinic.description} Compare available scans, pricing and booking options with Clearo.`
        : "",
    ],
    DESCRIPTION_IDEAL,
  );

  return {
    routePath,
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonicalUrl: canonicalFor(origin, routePath),
    robotsIndex: true,
    robotsFollow: true,
    focusKeywords: keywords.slice(0, 8),
    rationale: [
      `Targets local intent for ${clinic.name}${location ? ` in ${location}` : ""}.`,
      scanNames.length > 0
        ? `Includes available scan services: ${scanNames.slice(0, 4).join(", ")}.`
        : "Uses core scan service keywords for clinic discovery.",
      "Keeps title and description inside practical search-result length ranges.",
    ],
    source: "clinic_profile",
  };
}

function generateStaticSuggestion({ routePath, origin, focusKeywords }) {
  const blueprint = STATIC_ROUTE_BLUEPRINTS[routePath] || {
    label: humanizeRoute(routePath),
    audience: "search visitors",
    keywords: CORE_KEYWORDS,
    titles: [
      `${humanizeRoute(routePath)} | Clearo`,
      `${humanizeRoute(routePath)} | Medical Imaging | Clearo`,
    ],
    descriptions: [
      `Explore ${humanizeRoute(routePath)} on Clearo. Compare medical imaging clinics, transparent scan pricing and online booking options across Australia.`,
      `Use Clearo to compare medical imaging clinics, scan prices and appointment availability for ${humanizeRoute(routePath).toLowerCase()}.`,
    ],
  };

  const keywords = unique([...focusKeywords, ...(blueprint.keywords || []), ...CORE_KEYWORDS]).slice(0, 8);
  const title = chooseByLength(blueprint.titles, TITLE_IDEAL);
  const description = chooseByLength(blueprint.descriptions, DESCRIPTION_IDEAL);

  return {
    routePath,
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonicalUrl: canonicalFor(origin, routePath),
    robotsIndex: blueprint.robotsIndex !== false,
    robotsFollow: blueprint.robotsFollow !== false,
    focusKeywords: keywords,
    rationale: [
      `Matches ${blueprint.label} to ${blueprint.audience}.`,
      `Prioritises keywords: ${keywords.slice(0, 4).join(", ")}.`,
      "Balances search snippets with share-card metadata and canonical URL hygiene.",
    ],
    source: STATIC_ROUTE_BLUEPRINTS[routePath] ? "route_blueprint" : "generic_route",
  };
}

export async function generateSeoSuggestion({ routePath, focusKeywords = [], origin: requestedOrigin = "" }) {
  const normalizedRoutePath = normalizeSeoRoutePath(routePath);
  const origin = requestedOrigin || getRequiredPublicAppOrigin();
  const normalizedFocusKeywords = normalizeFocusKeywords(focusKeywords);
  const clinic = await getClinicContext(normalizedRoutePath);

  const suggestion = clinic
    ? generateClinicSuggestion({
        routePath: normalizedRoutePath,
        origin,
        focusKeywords: normalizedFocusKeywords,
        clinic,
      })
    : generateStaticSuggestion({
        routePath: normalizedRoutePath,
        origin,
        focusKeywords: normalizedFocusKeywords,
      });

  return {
    ...suggestion,
    ...scoreSeoSuggestion(suggestion),
  };
}
