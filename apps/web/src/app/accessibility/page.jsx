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

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-8 rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D6B5E] font-inter">
            Accessibility
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-gray-900 font-heading sm:text-4xl">
            Accessibility statement
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 font-inter">
            Clearo is committed to making medical imaging search and booking
            accessible to everyone, regardless of ability or assistive
            technology.
          </p>
        </div>

        <div className="space-y-6">
          <Section title="Our commitment">
            <p>
              We aim to conform to the Web Content Accessibility Guidelines
              (WCAG) 2.1 at Level AA. We continually review and improve the
              platform to remove barriers and ensure an inclusive experience for
              all users.
            </p>
          </Section>

          <Section title="What we do">
            <p>
              Semantic HTML, keyboard navigation, ARIA labels, sufficient colour
              contrast, scalable text, and descriptive link text are part of our
              standard development process. We test with screen readers and
              keyboard-only navigation as part of our release workflow.
            </p>
          </Section>

          <Section title="Known limitations">
            <p>
              Some third-party components, such as embedded maps, may not be
              fully accessible. We provide equivalent text-based alternatives
              where possible and work with vendors to improve compatibility.
            </p>
          </Section>

          <Section title="Feedback">
            <p>
              If you encounter an accessibility barrier or have suggestions for
              improvement, please contact us at{" "}
              <a
                href="mailto:support@clearo.com.au"
                className="font-semibold text-[#3D6B5E] hover:underline"
              >
                support@clearo.com.au
              </a>
              . We take every report seriously and aim to respond within two
              business days.
            </p>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
