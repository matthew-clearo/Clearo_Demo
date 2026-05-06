"use client";

import { useEffect } from "react";
import { useLoaderData } from "react-router";
import SeoHead from "@/components/SeoHead";
import { buildOrganizationSchema } from "@/utils/jsonLd";
import { useSearchData } from "@/hooks/useSearchData";
import { HeroSection } from "@/components/HomePage/HeroSection";
import { BenefitsSection } from "@/components/HomePage/BenefitsSection";
import { HowItWorksSection } from "@/components/HomePage/HowItWorksSection";
import { TrustSection } from "@/components/HomePage/TrustSection";
import { FinalCTASection } from "@/components/HomePage/FinalCTASection";
import { BeyondSection } from "@/components/HomePage/BeyondSection";
import { FAQSection } from "@/components/HomePage/FAQSection";
import { JourneySection } from "@/components/HomePage/JourneySection";
import { ScanFinderSection } from "@/components/HomePage/ScanFinderSection";
import { SectionDivider } from "@/components/HomePage/SectionDivider";
import SiteFooter from "@/components/SiteFooter";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";
import { isClinicHost } from "@/utils/clinicPortal";

export async function loader({ request }) {
  return loadSeoData(request, { path: "/" });
}

export default function HomePage() {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo("/");
  const clinicSurface = isClinicHost();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (clinicSurface) window.location.replace("/clinic-admin/signin");
  }, [clinicSurface]);

  if (clinicSurface) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-700 font-inter">Loading clinic portal…</div>
      </div>
    );
  }

  const { scanTypes = [] } = useSearchData("", "", "", { min: "", max: "" }, "");

  return (
    <div className="min-h-screen">
      <SeoHead
        seo={seo}
        jsonLd={buildOrganizationSchema(seo.origin)}
      />
      <HeroSection scanTypes={scanTypes} />

      {/* Rest of the page */}
      <div>
        <JourneySection />
        <SectionDivider bg="cream" />
        <HowItWorksSection />
        <ScanFinderSection />
        <SectionDivider bg="cream" />
        <BenefitsSection />
        <SectionDivider bg="cream" />
        <BeyondSection />
        <SectionDivider bg="cream" />
        <TrustSection />
        <SectionDivider bg="cream" />
        <FAQSection />
        <SectionDivider bg="cream" />
        <FinalCTASection />

        <SiteFooter />
      </div>
    </div>
  );
}
