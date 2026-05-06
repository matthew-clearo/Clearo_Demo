"use client";

import SiteFooter from "@/components/SiteFooter";
import { openCookieSettings, CONSENT_VERSION } from "@/privacy/consent";

const COOKIE_CATEGORIES = [
  {
    name: "Strictly necessary",
    status: "Always on",
    cookies: [
      { name: "Session cookie", purpose: "Maintains your authenticated session after sign-in.", duration: "Session", provider: "Clearo" },
      { name: "CSRF token", purpose: "Protects form submissions against cross-site request forgery.", duration: "Session", provider: "Clearo" },
      { name: "Cookie preferences", purpose: "Stores your cookie consent choices so we don't ask again.", duration: "1 year", provider: "Clearo" },
    ],
  },
  {
    name: "Analytics",
    status: "Off until you opt in",
    cookies: [
      { name: "Page visit log", purpose: "Records aggregated, anonymised page views on public pages only. No personal data is collected.", duration: "30 days", provider: "Clearo (first-party)" },
    ],
  },
  {
    name: "Marketing",
    status: "Off until you opt in",
    cookies: [
      { name: "None currently active", purpose: "Reserved for future campaign attribution if adopted. No marketing cookies are set today.", duration: "—", provider: "—" },
    ],
  },
];

function Section({ title, children }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-lg font-semibold text-gray-900 font-heading">{title}</h2>
      <div className="mt-4 space-y-3 text-[15px] leading-7 text-gray-600 font-inter">
        {children}
      </div>
    </section>
  );
}

function CategoryCard({ category }) {
  const isAlwaysOn = category.status === "Always on";

  return (
    <div className="rounded-[12px] border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <h3 className="text-[15px] font-semibold text-gray-900 font-inter">{category.name}</h3>
        <span
          className={`inline-flex items-center rounded-[4px] px-2.5 py-1 text-xs font-medium font-inter ${
            isAlwaysOn
              ? "bg-[#e8f3ee] text-[#3D6B5E]"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {category.status}
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {category.cookies.map((cookie, i) => (
          <div key={i} className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-[1fr_2fr_auto_auto] sm:gap-6 sm:items-start">
            <p className="text-sm font-medium text-gray-900 font-inter">{cookie.name}</p>
            <p className="text-sm leading-6 text-gray-600 font-inter">{cookie.purpose}</p>
            <p className="text-sm text-gray-500 font-inter sm:text-right">{cookie.provider}</p>
            <p className="text-sm text-gray-400 font-inter sm:text-right sm:min-w-[72px]">{cookie.duration}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Header */}
        <div className="mb-12">
          <span className="inline-block rounded-[4px] bg-[#e8f3ee] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#3D6B5E] font-inter">
            Legal
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 font-heading sm:text-4xl">
            Cookie Policy
          </h1>
          <p className="mt-2 text-sm text-gray-400 font-inter">
            Last updated {CONSENT_VERSION}
          </p>
        </div>

        {/* Intro */}
        <div className="rounded-[12px] border border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8">
          <Section title="What are cookies?">
            <p>
              Cookies are small text files placed on your device when you visit a website.
              They help the site remember your preferences, keep you signed in, and understand
              how you use the service so we can improve it.
            </p>
          </Section>

          <Section title="How we use cookies">
            <p>
              Clearo uses a minimal set of cookies. We rely on strictly necessary cookies to
              keep the platform secure and functional. Non-essential cookies (analytics and
              marketing) are disabled by default and only activated if you explicitly opt in.
            </p>
            <p>
              We do not sell your data, and our analytics are first-party and privacy-minimised.
              No personal information is collected through analytics cookies.
            </p>
          </Section>
        </div>

        {/* Cookie table */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 font-heading mb-5">
            Cookies we use
          </h2>
          <div className="space-y-4">
            {COOKIE_CATEGORIES.map((category) => (
              <CategoryCard key={category.name} category={category} />
            ))}
          </div>
        </div>

        {/* How to control */}
        <div className="mt-10 rounded-[12px] border border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8">
          <Section title="How to control your cookies">
            <p>
              You can change your non-essential cookie preferences at any time using the
              button below or from the cookie settings link in the footer. Your browser
              also allows you to delete or block cookies — refer to your browser's help
              documentation for instructions.
            </p>
            <p>
              Disabling strictly necessary cookies may prevent parts of the site from
              functioning correctly (for example, you may not be able to stay signed in).
            </p>
          </Section>

          <button
            type="button"
            onClick={openCookieSettings}
            className="mt-6 rounded-lg bg-[#3D6B5E] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#345C51] font-inter"
          >
            Manage cookie settings
          </button>
        </div>

        {/* Contact */}
        <div className="mt-10 rounded-[12px] border border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8">
          <Section title="Questions?">
            <p>
              If you have any questions about our use of cookies, please visit our{" "}
              <a href="/privacy" className="font-medium text-[#3D6B5E] hover:underline">Privacy Policy</a>{" "}
              or <a href="/contact" className="font-medium text-[#3D6B5E] hover:underline">contact us</a>.
            </p>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
