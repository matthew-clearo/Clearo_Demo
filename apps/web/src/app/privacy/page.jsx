"use client";

import SiteFooter from "@/components/SiteFooter";
import { openCookieSettings } from "@/privacy/consent";

function Section({ title, children }) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
      <h2 className="text-xl font-semibold text-gray-900 font-heading">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-gray-700 font-inter">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-8 rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D6B5E] font-inter">
            Privacy Policy
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-gray-900 font-heading sm:text-4xl">
            Clearo privacy
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 font-inter">
            This policy outlines how Clearo handles personal information, booking
            data, cookies, and limited analytics across the platform.
          </p>
        </div>

        <div className="space-y-6">
          <Section title="How we use information">
            <p>
              We use personal information to run the marketplace, support your
              account, protect the service, and coordinate bookings between
              patients and participating clinics.
            </p>
            <p>
              This includes identity and contact details, booking history,
              referral and safety-screening information, device and security
              logs, and communications needed to deliver the service or respond
              to support requests.
            </p>
            <p>
              We keep non-essential tracking off by default. Optional analytics
              and marketing only run after consent.
            </p>
          </Section>

          <Section title="Health and referral information">
            <p>
              Referral documents, symptoms, screening answers, and related
              patient profile fields are handled with heightened protection
              because they may reveal health status or healthcare needs.
            </p>
            <p>
              Clearo uses restricted-access storage and security controls to
              support booking workflows, referral review, account recovery,
              abuse prevention, and legally required recordkeeping.
            </p>
          </Section>

          <Section title="Who we share with">
            <p>
              We share booking and referral information with the clinic involved
              in your request, and with service providers that help us operate
              hosting, security, email delivery, file storage, and core
              infrastructure on our behalf.
            </p>
            <p>
              We may also disclose information where required by law, to protect
              patients or the service, or as part of a legitimate complaint,
              incident, fraud, or security investigation.
            </p>
          </Section>

          <Section title="Cookies and tracking">
            <p>
              Necessary cookies support sign-in, security, session continuity,
              and other core platform functions.
            </p>
            <p>
              Optional analytics are limited to privacy-minimised first-party
              measurement on public pages. Sensitive patient, booking, account,
              and operational routes are excluded.
            </p>
            <p>
              Marketing cookies are off by default. Any future marketing tooling
              should remain excluded from sensitive healthcare journeys.
            </p>
            <p>
              More detail is available in our <a href="/cookies" className="font-semibold text-[#3D6B5E] hover:underline">Cookie Policy</a>.
            </p>
          </Section>

          <Section title="Third parties and healthcare-sensitive context">
            <p>
              Activity on this site may reveal interest in diagnostic imaging or
              healthcare services, so our tracking defaults are intentionally
              conservative.
            </p>
            <p>
              Providers that support hosting, security, maps, verification, and
              booking operations may process data on our behalf under appropriate
              contractual and security controls.
            </p>
          </Section>

          <Section title="Retention and deletion">
            <p>
              We retain information only for as long as needed for service
              delivery, dispute handling, fraud prevention, legal obligations,
              and reasonable operational backups. When you delete your account,
              we remove or de-identify patient data unless we must retain
              limited records for security, finance, or legal compliance.
            </p>
          </Section>

          <Section title="Your choices">
            <p>
              You can reject non-essential cookies, accept all cookies, or manage
              your preferences at any time using the cookie controls.
            </p>
            <p>
              Depending on your jurisdiction, you may also request access,
              correction, deletion, or information about how your data is used
              by contacting Clearo support.
            </p>
            <button
              type="button"
              onClick={openCookieSettings}
              className="rounded-full bg-[#1A1A1A] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 font-inter"
            >
              Open cookie settings
            </button>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
