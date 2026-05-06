"use client";

import { useLoaderData } from "react-router";
import {
  Settings,
  Calendar,
  BadgeCheck,
  Share2,
  UserCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { buildWebPageSchema } from "@/utils/jsonLd";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";
import SiteFooter from "@/components/SiteFooter";
import WarpCTA from "@/components/ui/WarpCTA";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";
import { buildClinicPortalHref } from "@/utils/clinicPortal";

const SAGE = "#3D6B5E";

export async function loader({ request }) {
  return loadSeoData(request, { path: "/for-providers" });
}

const benefits = [
  {
    Icon: Calendar,
    title: "Fill Unused Capacity",
    subtitle: "More bookings",
    description:
      "List available appointment slots, publish scan pricing, and manage incoming booking requests from one clinic portal.",
    color: "#3D6B5E",
    stat: "Slots",
    statLabel: "published online",
  },
  {
    Icon: Share2,
    title: "Referral Workflow",
    subtitle: "Review queue",
    description:
      "Review uploaded referrals, manage referral status, and keep booking context visible for clinic staff.",
    color: "#B8845F",
    stat: "Referral",
    statLabel: "review tools",
  },
  {
    Icon: UserCheck,
    title: "Patient Details",
    subtitle: "Operational context",
    description:
      "View the patient and booking details needed to prepare for the appointment and manage clinic workflows.",
    color: "#3D6B5E",
    stat: "Booking",
    statLabel: "status tracking",
  },
  {
    Icon: Zap,
    title: "Be Seen. Get Booked.",
    subtitle: "Grow demand",
    description:
      "Make your clinic profile, scan pricing, and appointment slots available to patients searching for imaging options.",
    color: "#B8845F",
    stat: "Clinic",
    statLabel: "profile tools",
  },
];

const features = [
  {
    title: "Simple Setup",
    description:
      "Add machines, set business hours, and publish pricing in minutes. No IT required.",
    Icon: Settings,
  },
  {
    title: "Real-Time Slots",
    description:
      "Auto-generate 30-minute slots per machine with built-in double-booking prevention.",
    Icon: Clock,
  },
  {
    title: "Clinic Profile",
    description:
      "Publish clinic details, listed scan pricing, and appointment options for patients to compare.",
    Icon: BadgeCheck,
  },
];

const stats = [
  { value: "Profile", label: "Clinic details" },
  { value: "Pricing", label: "Scan price lists" },
  { value: "Slots", label: "Appointment management" },
  { value: "Team", label: "Staff access controls" },
];

export default function ForProvidersPage() {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo("/for-providers");
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      <SeoHead seo={seo} jsonLd={buildWebPageSchema({ name: seo.title, description: seo.description, url: seo.canonicalUrl, origin: seo.origin })} />
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-28 lg:py-36">
        <SoftHeroBackground />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <span
            className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-5"
            style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
          >
            For Providers
          </span>
          <h1
            className="text-4xl lg:text-5xl xl:text-6xl font-heading font-semibold text-gray-900 mb-6"
            style={{ letterSpacing: "-0.025em", lineHeight: "1.1" }}
          >
            Grow demand.<br className="hidden sm:block" />{" "}
            <span style={{ color: SAGE }}>Maximise utilisation.</span>
          </h1>
          <p
            className="text-base lg:text-lg font-inter leading-relaxed max-w-2xl mx-auto mb-12"
            style={{ color: "#555" }}
          >
            Join Clearo's imaging network to reach patients already searching for
            scans in your area, with tools for profile, pricing, slot, and booking management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={buildClinicPortalHref("/signup?callbackUrl=%2Fonboarding")}
              className="px-10 py-4 rounded-lg text-white font-inter font-semibold text-[17px] hover:opacity-90 active:scale-[0.97] transition-all inline-flex items-center gap-3"
              style={{
                backgroundColor: "#3D6B5E",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              List Your Clinic
              <ArrowRight size={18} />
            </a>
            <a
              href="/how-it-works"
              className="px-8 py-4 rounded-lg font-inter font-semibold transition-all hover:bg-white/60"
              style={{ color: "#3D6B5E", border: "1.5px solid #3D6B5E" }}
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ribbon ── */}
      <section style={{ backgroundColor: "#FBF8F3" }}>
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
            {stats.map((stat, i) => (
              <div key={i} className="p-6 lg:p-8 text-center">
                <div
                  className="text-2xl lg:text-3xl font-heading font-semibold mb-1"
                  style={{ color: SAGE }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs font-inter font-medium tracking-wide uppercase"
                  style={{ color: "#555" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sage dot divider ── */}
      <div className="flex justify-center py-8">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "rgba(61,107,94,0.3)" }}
        />
      </div>

      {/* ── Benefits — colored cards ── */}
      <section className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 lg:mb-20">
            <span
              className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-4"
              style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
            >
              Why Partner With Us
            </span>
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
              style={{ letterSpacing: "-0.025em" }}
            >
              Built for Modern Clinics
            </h2>
            <p
              className="text-base lg:text-lg font-inter max-w-xl mx-auto"
              style={{ color: "#555" }}
            >
	              Practical tools for clinic profiles, scan pricing, appointment slots, and booking workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.Icon;
              return (
                <div
                  key={index}
                  className="group relative rounded-[12px] overflow-hidden transition-all hover:-translate-y-1"
                  style={{
                    backgroundColor: benefit.color,
                    boxShadow: "0 4px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="p-8 lg:p-10">
                    <div className="flex items-center justify-between mb-8">
                      <div
                        className="h-12 w-12 rounded-[6px] flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                      >
                        <Icon size={22} className="text-white" />
                      </div>
                    </div>

                    <p
                      className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-2"
                      style={{ color: "rgba(255,255,255,0.5)", borderLeft: "2px solid rgba(255,255,255,0.35)", paddingLeft: 8 }}
                    >
                      {benefit.subtitle}
                    </p>
                    <h3
                      className="text-2xl lg:text-[1.75rem] font-heading font-semibold text-white mb-3"
                      style={{ lineHeight: "1.2" }}
                    >
                      {benefit.title}
                    </h3>
                    <p
                      className="text-sm font-inter leading-relaxed mb-8"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {benefit.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl lg:text-4xl font-heading font-semibold text-white tracking-tight">
                        {benefit.stat}
                      </span>
                      <span
                        className="text-[11px] font-inter tracking-wide uppercase"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {benefit.statLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* ── Platform Features — white cards ── */}
      <section className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 lg:mb-20">
            <span
              className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-4"
              style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
            >
              Platform Features
            </span>
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
              style={{ letterSpacing: "-0.025em" }}
            >
              Set Up in Minutes
            </h2>
            <p
              className="text-base lg:text-lg font-inter max-w-xl mx-auto"
              style={{ color: "#555" }}
            >
              A dashboard designed for clinic teams, not IT departments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {features.map((f, i) => {
              const Icon = f.Icon;
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
                    {f.title}
                  </h3>
                  <p className="text-sm font-inter leading-relaxed" style={{ color: "#555" }}>
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <WarpCTA
        badge="Join the network"
        heading={
          <>
            Ready to fill your<br className="hidden sm:block" /> empty slots?
          </>
        }
	        description="Create a clinic profile, publish scan pricing, and manage appointment availability through the clinic portal."
        primaryLabel="List Your Clinic"
        primaryHref={buildClinicPortalHref("/signup?callbackUrl=%2Fonboarding")}
        secondaryLabel="For Patients"
        secondaryHref="/for-patients"
      />

      <SiteFooter />
    </div>
  );
}
