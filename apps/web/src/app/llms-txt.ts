import type { LoaderFunctionArgs } from "react-router";
import { getSiteOrigin } from "@/app/utils/seo.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = getSiteOrigin(request);

  const body = `# Clearo

> Medical imaging booking platform. Compare MRI, CT, X-ray and ultrasound pricing across listed clinics and book online.

## Key Pages

- [Home](${origin}): Search and compare medical imaging clinics with transparent pricing.
- [For Patients](${origin}/for-patients): How patients use Clearo to find affordable imaging.
- [For Providers](${origin}/for-providers): How imaging clinics can list on Clearo and grow bookings.
- [How It Works](${origin}/how-it-works): Step-by-step guide to searching, comparing, and booking.
- [About](${origin}/about): Our mission to make medical imaging clear, fast, and fair.
- [Search](${origin}/search): Search imaging clinics by scan type, location, and price.

## What Clearo Does

Clearo is a marketplace that connects patients with medical imaging clinics across Australia. Patients can:

- Search for MRI, CT, X-ray, and ultrasound clinics by location
- Compare listed prices across providers
- View appointment options
- Book appointments online

Clearo shows clinic and pricing information available in the platform. Clinics remain responsible for their own clinical standards and patient care.

## Contact

- Website: ${origin}
- Country: Australia
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
