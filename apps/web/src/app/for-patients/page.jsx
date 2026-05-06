"use client";

import { useLoaderData } from "react-router";
import {
  Search,
  Calendar,
  Shield,
  DollarSign,
  Clock,
  Heart,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { buildWebPageSchema } from "@/utils/jsonLd";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";
import SiteFooter from "@/components/SiteFooter";
import WarpCTA from "@/components/ui/WarpCTA";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";

const SAGE = "#3D6B5E";

export async function loader({ request }) {
  return loadSeoData(request, { path: "/for-patients" });
}

const benefits = [
  {
    Icon: DollarSign,
    title: "Transparent Pricing",
    subtitle: "No surprises",
    description:
      "See listed scan prices before you book so you can compare clinic options with less guesswork.",
    color: "#B8845F",
    stat: "Listed",
    statLabel: "scan prices",
  },
  {
    Icon: Clock,
    title: "Choose an Appointment",
    subtitle: "Clear steps",
    description:
      "Pick your scan, choose a clinic, and select an available time from the booking flow.",
    color: "#3D6B5E",
    stat: "Online",
    statLabel: "booking flow",
  },
  {
    Icon: Shield,
    title: "Your Privacy, Protected",
    subtitle: "Always secure",
    description:
      "Your account stores booking details needed for the appointment flow, including referrals and safety answers where required.",
    color: "#B8845F",
    stat: "Secure",
    statLabel: "booking data",
  },
  {
    Icon: Heart,
    title: "Clinic Details",
    subtitle: "Compare options",
    description:
      "Review clinic location, services, listed prices, and available appointment options before choosing.",
    color: "#3D6B5E",
    stat: "Clear",
    statLabel: "clinic profiles",
  },
];

const steps = [
  {
    num: "01",
    title: "Search",
    description: "Pick your scan type and enter your suburb or postcode.",
    Icon: Search,
  },
  {
    num: "02",
    title: "Compare",
    description: "See listed prices and appointment options side by side.",
    Icon: DollarSign,
  },
  {
    num: "03",
    title: "Book",
    description: "Choose the clinic and time that suits you.",
    Icon: Calendar,
  },
  {
    num: "04",
    title: "Attend",
    description: "Bring your referral to your appointment. That's it.",
    Icon: CheckCircle2,
  },
];

export default function ForPatientsPage() {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo("/for-patients");
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
            For Patients
          </span>
          <h1
            className="text-4xl lg:text-5xl xl:text-6xl font-heading font-semibold text-gray-900 mb-6"
            style={{ letterSpacing: "-0.025em", lineHeight: "1.1" }}
          >
            Medical imaging,<br className="hidden sm:block" /> made simple.
          </h1>
          <p
            className="text-base lg:text-lg font-inter leading-relaxed max-w-2xl mx-auto mb-12"
            style={{ color: "#555" }}
          >
            Find listed prices, compare clinics, and book your MRI, CT,
            X-Ray, or Ultrasound appointment. Bring or upload your referral when required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/search"
              className="px-10 py-4 rounded-lg text-white font-inter font-semibold text-[17px] hover:opacity-90 active:scale-[0.97] transition-all inline-flex items-center gap-3"
              style={{
                backgroundColor: "#3D6B5E",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              Find a Clinic
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

      {/* ── Sage dot divider ── */}
      <div className="flex justify-center py-2">
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
              Why Clearo
            </span>
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
              style={{ letterSpacing: "-0.025em" }}
            >
              Built Around You
            </h2>
            <p
              className="text-base lg:text-lg font-inter max-w-xl mx-auto"
              style={{ color: "#555" }}
            >
              Every part of Clearo is designed to put patients first.
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

      {/* ── How It Works — numbered steps ── */}
      <section className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 lg:mb-20">
            <span
              className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-4"
              style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
            >
              How It Works
            </span>
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
              style={{ letterSpacing: "-0.025em" }}
            >
              Four Simple Steps
            </h2>
            <p
              className="text-base lg:text-lg font-inter max-w-xl mx-auto"
              style={{ color: "#555" }}
            >
              From search to appointment, designed to be effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {steps.map((step) => {
              const Icon = step.Icon;
              return (
                <div
                  key={step.num}
                  className="relative rounded-[12px] p-7 lg:p-8 flex flex-col justify-between min-h-[260px]"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.04)",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span
                        className="text-xs font-inter font-medium tracking-[0.15em] uppercase"
                        style={{ color: SAGE }}
                      >
                        Step {step.num}
                      </span>
                      <div
                        className="h-9 w-9 rounded-[6px] flex items-center justify-center"
                        style={{ backgroundColor: "rgba(61,107,94,0.07)" }}
                      >
                        <Icon size={16} style={{ color: SAGE }} />
                      </div>
                    </div>
                    <h3
                      className="text-xl font-heading font-semibold text-gray-900 mb-2"
                      style={{ lineHeight: "1.2" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm font-inter leading-relaxed" style={{ color: "#555" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <WarpCTA
        badge="Ready to book?"
        heading={
          <>
            Your scan is just<br className="hidden sm:block" /> a few clicks away.
          </>
        }
        description="Search clinics, compare listed prices, and choose an appointment time."
        primaryLabel="Find a Clinic"
        primaryHref="/search"
        secondaryLabel="How It Works"
        secondaryHref="/how-it-works"
      />

      <SiteFooter />
    </div>
  );
}
