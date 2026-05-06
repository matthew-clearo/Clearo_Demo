/**
 * JSON-LD Structured Data Builders
 *
 * Generates schema.org structured data for Google rich results,
 * knowledge panels, and AI discovery.
 */

export function buildWebSiteSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Clearo",
    url: origin,
    description:
      "Compare medical imaging pricing and availability across participating clinics.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Clearo",
    url: origin,
    logo: `${origin}/favicon.ico`,
    description:
      "Medical imaging marketplace for comparing MRI, CT, X-ray and ultrasound pricing and availability.",
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    knowsAbout: [
      "Medical Imaging",
      "MRI Scans",
      "CT Scans",
      "X-Ray",
      "Ultrasound",
      "Radiology",
    ],
  };
}

export function buildMedicalBusinessSchema(clinic, origin) {
  if (!clinic) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: clinic.name,
    description: clinic.description || undefined,
    url: `${origin}/clinic/${clinic.public_id || clinic.id}`,
    medicalSpecialty: "Diagnostic Radiology",
  };

  if (clinic.address || clinic.street_address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: clinic.street_address || clinic.address || undefined,
      addressLocality: clinic.city || clinic.suburb || undefined,
      addressRegion: clinic.state || undefined,
      postalCode: clinic.postcode || undefined,
      addressCountry: "AU",
    };
  }

  if (clinic.phone) {
    schema.telephone = clinic.phone;
  }

  if (clinic.latitude && clinic.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: clinic.latitude,
      longitude: clinic.longitude,
    };
  }

  return schema;
}

export function buildBreadcrumbSchema(items, origin) {
  if (!items || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${origin}${item.url}`,
    })),
  };
}

export function buildFAQSchema(items) {
  if (!items || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildHowToSchema({ name, description, steps, origin }) {
  if (!steps || steps.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: name || "How to Use Clearo",
    description:
      description ||
      "Compare medical imaging prices and book appointments online.",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url ? (step.url.startsWith("http") ? step.url : `${origin}${step.url}`) : undefined,
    })),
  };
}

export function buildAboutPageSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Clearo",
    url: `${origin}/about`,
    description:
      "Learn how Clearo helps patients compare medical imaging clinics with transparent pricing and real-time availability.",
    isPartOf: {
      "@type": "WebSite",
      name: "Clearo",
      url: origin,
    },
  };
}

export function buildWebPageSchema({ name, description, url, origin }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "Clearo",
      url: origin,
    },
  };
}
