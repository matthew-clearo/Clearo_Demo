"use client";

import SiteFooter from "@/components/SiteFooter";

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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-8 rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D6B5E] font-inter">
            Terms of Service
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-gray-900 font-heading sm:text-4xl">
            Clearo terms of service
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 font-inter">
            These terms govern access to the Clearo marketplace, patient account
            features, clinic portal, and internal operational tools. By using the
            service, you agree to use it lawfully and only for its intended
            healthcare-booking purpose.
          </p>
        </div>

        <div className="space-y-6">
          <Section title="Marketplace role">
            <p>
              Clearo provides software that helps patients discover clinics,
              submit booking requests, upload referral material, and manage
              appointments. Clinics remain responsible for clinical review,
              appointment suitability, pricing accuracy, and the delivery of
              healthcare services.
            </p>
          </Section>

          <Section title="Accounts and security">
            <p>
              You must provide accurate information, keep login credentials
              confidential, and use multi-factor authentication when prompted.
              We may suspend or disable access where we detect fraud, security
              abuse, policy violations, or legal risk.
            </p>
          </Section>

          <Section title="Bookings and referrals">
            <p>
              Booking confirmations, referral requirements, safety screening,
              preparation instructions, reschedules, and cancellations may depend
              on clinic policy, clinical review, and the information you provide.
              A booking request does not guarantee treatment or a completed scan.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>
              You must not attempt to bypass authentication, access another
              person&apos;s booking or referral files, upload malicious material,
              interfere with service availability, or use the platform in any
              way that compromises privacy, security, or compliance.
            </p>
          </Section>

          <Section title="Privacy and regulated information">
            <p>
              Some information handled through Clearo may be health information
              or otherwise sensitive personal data. Our collection, use,
              disclosure, retention, and deletion practices are described in the
              Privacy Policy and related notices presented during booking and
              account flows.
            </p>
          </Section>

          <Section title="Suspension, termination, and liability">
            <p>
              We may limit or terminate access to protect patients, clinics, the
              platform, or our legal obligations. To the maximum extent
              permitted by law, Clearo is not liable for indirect loss, third
              party clinical outcomes, or interruptions caused by providers,
              networks, or events outside our reasonable control.
            </p>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
