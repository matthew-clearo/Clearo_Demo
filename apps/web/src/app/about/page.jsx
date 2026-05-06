"use client";

import { useLoaderData } from "react-router";
import {
  Eye,
  Target,
  Heart,
  Shield,
  Users,
  Lightbulb,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { buildAboutPageSchema, buildOrganizationSchema } from "@/utils/jsonLd";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";
import SiteFooter from "@/components/SiteFooter";
import WarpCTA from "@/components/ui/WarpCTA";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";

const SAGE = "#3D6B5E";

export async function loader({ request }) {
  return loadSeoData(request, { path: "/about" });
}

const values = [
  {
    Icon: Eye,
    title: "Transparency",
    description:
      "Patients see real prices before they book. No hidden fees, no surprises, ever.",
  },
  {
    Icon: Heart,
    title: "Patient First",
    description:
      "Every decision we make starts with a simple question: does this make things better for the patient?",
  },
  {
    Icon: Shield,
    title: "Privacy & Trust",
    description:
      "We collect only the information needed to support account, referral, safety, and booking workflows, and we treat that data carefully.",
  },
  {
    Icon: Lightbulb,
    title: "Simplicity",
    description:
      "Healthcare is complicated enough. We strip away the friction so you can focus on what matters: getting care.",
  },
  {
    Icon: Users,
    title: "Partnership",
    description:
      "We succeed when clinics succeed. Our tools help providers fill capacity, reduce admin, and deliver better experiences.",
  },
  {
    Icon: Target,
    title: "Access",
    description:
      "Everyone deserves affordable, high-quality medical imaging, regardless of where they live or who they know.",
  },
];

export default function AboutPage() {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo("/about");
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      <SeoHead seo={seo} jsonLd={[buildAboutPageSchema(seo.origin), buildOrganizationSchema(seo.origin)]} />
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-28 lg:py-36">
        <SoftHeroBackground />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <span
            className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-5"
            style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
          >
            About Clearo
          </span>
          <h1
            className="text-4xl lg:text-5xl xl:text-6xl font-heading font-semibold text-gray-900 mb-6"
            style={{ letterSpacing: "-0.025em", lineHeight: "1.1" }}
          >
            Making imaging<br className="hidden sm:block" /> clear, fast &amp; fair.
          </h1>
          <p
            className="text-base lg:text-lg font-inter leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#555" }}
          >
            Clearo is a medical imaging booking platform. We help patients
            search clinics, compare listed pricing, and choose appointment
            options with a clearer booking flow.
          </p>
        </div>
      </section>

      {/* ── Sage dot divider ── */}
      <div className="flex justify-center py-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "rgba(61,107,94,0.3)" }}
        />
      </div>

      {/* ── Mission / Vision — two large colored cards ── */}
      <section className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {/* What We Believe */}
            <div
              className="rounded-[12px] p-8 lg:p-12 flex flex-col justify-between min-h-[320px]"
              style={{
                backgroundColor: "#3D6B5E",
                boxShadow: "0 4px 30px rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <p
                  className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-6"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Our Belief
                </p>
                <h3
                  className="text-2xl lg:text-3xl font-heading font-semibold text-white mb-4"
                  style={{ lineHeight: "1.2" }}
                >
                  What We Believe
                </h3>
                <p
                  className="text-base font-inter leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  Patients deserve price transparency and the ability to book care
                  as easily as booking travel. Clinics deserve the tools to
                  showcase quality care without heavy admin. Healthcare should work
                  for everyone, not just those who know the system.
                </p>
              </div>
            </div>

            {/* What We're Building */}
            <div
              className="rounded-[12px] p-8 lg:p-12 flex flex-col justify-between min-h-[320px]"
              style={{
                backgroundColor: "#B8845F",
                boxShadow: "0 4px 30px rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <p
                  className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-6"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Our Mission
                </p>
                <h3
                  className="text-2xl lg:text-3xl font-heading font-semibold text-white mb-4"
                  style={{ lineHeight: "1.2" }}
                >
                  What We're Building
                </h3>
                <p
                  className="text-base font-inter leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  A supply-first marketplace where imaging centres list machines,
                  set availability, and publish transparent pricing. Patients
                  search, compare, and book with the key details in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sage dot divider ── */}
      <div className="flex justify-center py-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "rgba(61,107,94,0.3)" }}
        />
      </div>

      {/* ── Values — white cards ── */}
      <section className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 lg:mb-20">
            <span
              className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-4"
              style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
            >
              Our Values
            </span>
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
              style={{ letterSpacing: "-0.025em" }}
            >
              What Drives Us
            </h2>
            <p
              className="text-base lg:text-lg font-inter max-w-xl mx-auto"
              style={{ color: "#555" }}
            >
              The principles behind every feature, decision, and line of code.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {values.map((v, i) => {
              const Icon = v.Icon;
              return (
                <div
                  key={i}
                  className="rounded-[12px] p-8 lg:p-10"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.04)",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    className="h-12 w-12 rounded-[6px] flex items-center justify-center mb-6"
                    style={{ backgroundColor: "rgba(61,107,94,0.07)" }}
                  >
                    <Icon size={22} style={{ color: SAGE }} />
                  </div>
                  <h3
                    className="text-xl font-heading font-semibold text-gray-900 mb-3"
                    style={{ lineHeight: "1.2" }}
                  >
                    {v.title}
                  </h3>
                  <p
                    className="text-sm font-inter leading-relaxed"
                    style={{ color: "#555" }}
                  >
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <WarpCTA
        badge="Join us"
        heading={
          <>
            Experience the<br className="hidden sm:block" /> difference.
          </>
        }
        description="Whether you're a patient looking for transparent pricing or a clinic ready to grow, Clearo is built for you."
        primaryLabel="Find a Clinic"
        primaryHref="/search"
        secondaryLabel="For Providers"
        secondaryHref="/for-providers"
      />

      <SiteFooter />
    </div>
  );
}
