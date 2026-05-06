import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

const DEFAULT_SEO_BY_PATH = {
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

function getOrigin(request) {
  if (request?.headers) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const rawHost = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim();
    const host = rawHost?.startsWith("www.") ? rawHost.slice(4) : rawHost;

    if (host) {
      const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
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

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return getRequiredPublicAppOrigin();
}

export function getFallbackSeo(path = "/", request) {
  const resolvedPath = path || "/";
  const defaults = DEFAULT_SEO_BY_PATH[resolvedPath] || DEFAULT_SEO_BY_PATH["/"];
  const origin = getOrigin(request);

  return {
    title: defaults.title,
    description: defaults.description,
    ogTitle: defaults.ogTitle || defaults.title,
    ogDescription: defaults.ogDescription || defaults.description,
    canonicalUrl: `${origin}${resolvedPath === "/" ? "" : resolvedPath}`,
    robotsIndex: defaults.robotsIndex ?? true,
    robotsFollow: defaults.robotsFollow ?? true,
    ogImage: `${origin}/og-image.jpg`,
    ogType: "website",
    origin,
    routePath: resolvedPath,
  };
}

export async function loadSeoData(request, params) {
  const path = params?.resolvedPath || params?.path || "/";

  try {
    const url = new URL("/api/seo/resolve", request.url);

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        cookie: request.headers.get("cookie") || "",
        "x-forwarded-host":
          request.headers.get("x-forwarded-host") ||
          request.headers.get("host") ||
          new URL(request.url).host,
        "x-forwarded-proto":
          request.headers.get("x-forwarded-proto") ||
          new URL(request.url).protocol.replace(":", "") ||
          "https",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to resolve SEO metadata");
    }

    const data = await response.json();
    if (data?.seo) {
      return data;
    }
  } catch (error) {
    console.error("Failed to load SEO metadata, using fallback.", error);
  }

  return { seo: getFallbackSeo(path, request) };
}
