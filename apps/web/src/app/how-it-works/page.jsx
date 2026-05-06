"use client";

import { useLoaderData } from "react-router";
import {
  Search,
  DollarSign,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  Heart,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { buildHowToSchema } from "@/utils/jsonLd";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";
import SiteFooter from "@/components/SiteFooter";
import WarpCTA from "@/components/ui/WarpCTA";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";

const SAGE = "#3D6B5E";

export async function loader({ request }) {
  return loadSeoData(request, { path: "/how-it-works" });
}

const steps = [
  {
    num: "01",
    label: "Step 01",
    title: "Search for Your Scan",
    description:
      "Choose your scan type (MRI, CT, X-Ray, or Ultrasound) and enter your suburb or postcode. We'll show listed clinic options where available.",
    Icon: Search,
    bg: "#3D6B5E",
  },
  {
    num: "02",
    label: "Step 02",
    title: "Compare Prices & Clinics",
    description:
      "See listed pricing from clinics side by side. Filter by distance, price, and availability to compare options.",
    Icon: DollarSign,
    bg: "#5B7B94",
  },
  {
    num: "03",
    label: "Step 03",
    title: "Choose a Booking Time",
    description:
      "Pick a time that works for you from available clinic slots and submit the details needed for the appointment.",
    Icon: Calendar,
    bg: "#B8845F",
  },
  {
    num: "04",
    label: "Step 04",
    title: "Attend Your Appointment",
    description:
      "Bring or upload your referral when required and follow any clinic preparation instructions.",
    Icon: CheckCircle2,
    bg: "#8B6E7F",
  },
];

const trustPoints = [
  { Icon: Shield, label: "Clear clinic profiles" },
  { Icon: DollarSign, label: "Transparent pricing" },
  { Icon: Clock, label: "Available appointment slots" },
  { Icon: Heart, label: "Patient-first design" },
];

export default function HowItWorksPage() {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo("/how-it-works");
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      <SeoHead
        seo={seo}
        jsonLd={buildHowToSchema({
          name: "How to Use Clearo",
          description: "Compare medical imaging prices and book appointments online in 4 simple steps.",
          steps: steps.map((s) => ({ name: s.title, text: s.description })),
          origin: seo.origin,
        })}
      />
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-28 lg:py-36">
        <SoftHeroBackground />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <span
            className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-5"
            style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
          >
            How It Works
          </span>
          <h1
            className="text-4xl lg:text-5xl xl:text-6xl font-heading font-semibold text-gray-900 mb-6"
            style={{ letterSpacing: "-0.025em", lineHeight: "1.1" }}
          >
            Four steps to<br className="hidden sm:block" /> better care.
          </h1>
          <p
            className="text-base lg:text-lg font-inter leading-relaxed max-w-2xl mx-auto mb-12"
            style={{ color: "#555" }}
          >
            From your first search to your appointment, every step is designed to
            be effortless.
          </p>
          <a
            href="/search"
            className="px-10 py-4 rounded-lg text-white font-inter font-semibold text-[17px] hover:opacity-90 active:scale-[0.97] transition-all inline-flex items-center gap-3"
            style={{
              backgroundColor: "#3D6B5E",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            Get Started
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* ── Sage dot divider ── */}
      <div className="flex justify-center py-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "rgba(61,107,94,0.3)" }}
        />
      </div>

      {/* ── Stacking step cards ── */}
      <section style={{ backgroundColor: "#FBF8F3" }}>
        <div className="pt-24 lg:pt-32 pb-10 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto text-center">
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-4"
              style={{ letterSpacing: "-0.025em" }}
            >
              The Process
            </h2>
            <p
              className="text-base lg:text-lg font-inter max-w-2xl mx-auto"
              style={{ color: "#555" }}
            >
              Each step brings you closer to your appointment
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-12 pb-24 lg:pb-32">
          <div className="max-w-6xl mx-auto">
            {steps.map((item, index) => {
              const Icon = item.Icon;
              const stickyTop = 100 + index * 66;

              return (
                <div
                  key={item.num}
                  className="sticky mb-6"
                  style={{ top: `${stickyTop}px`, zIndex: index + 1 }}
                >
                  <div
                    className="rounded-[12px] overflow-hidden"
                    style={{
                      backgroundColor: item.bg,
                      boxShadow: "0 -4px 30px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                        <span
                          className="inline-flex self-start font-inter font-medium mb-5"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 4,
                            backgroundColor: "rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.75)",
                          }}
                        >
                          {item.label}
                        </span>
                        <h3
                          className="text-2xl lg:text-3xl xl:text-4xl font-heading font-semibold text-white mb-3"
                          style={{ lineHeight: "1.15" }}
                        >
                          {item.title}
                        </h3>
                        <p
                          className="text-base lg:text-lg font-inter leading-relaxed mb-8"
                          style={{ color: "rgba(255,255,255,0.8)" }}
                        >
                          {item.description}
                        </p>
                        <a
                          href="/search"
                          className="inline-flex self-start items-center px-6 py-3 rounded-lg font-semibold font-inter text-sm hover:opacity-90 active:scale-[0.97] transition-all"
                          style={{
                            backgroundColor: "#FFFFFF",
                            color: "#1A1A1A",
                          }}
                        >
                          Get started
                        </a>
                      </div>

                      <div
                        className="hidden lg:flex items-center justify-center p-6"
                        style={{ minHeight: "340px" }}
                      >
                        <div
                          className="w-full h-full rounded-[8px] flex items-center justify-center"
                          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        >
                          <Icon size={72} className="text-white/25" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div
            className="rounded-[12px] grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
            }}
          >
            {trustPoints.map((tp, i) => {
              const Icon = tp.Icon;
              return (
                <div key={i} className="p-6 lg:p-8 text-center">
                  <div
                    className="h-10 w-10 rounded-[6px] flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: "rgba(61,107,94,0.07)" }}
                  >
                    <Icon size={18} style={{ color: SAGE }} />
                  </div>
                  <div className="text-sm font-inter font-medium text-gray-900">
                    {tp.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <WarpCTA
        badge="Start today"
        heading={
          <>
            Ready to find<br className="hidden sm:block" /> your scan?
          </>
        }
        description="Search clinics, compare listed prices, and choose an appointment time through Clearo."
        primaryLabel="Find a Clinic"
        primaryHref="/search"
        secondaryLabel="Are you a Provider?"
        secondaryHref="/for-providers"
      />

      <SiteFooter />
    </div>
  );
}
