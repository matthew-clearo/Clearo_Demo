"use client";

import { Mail, MapPin, Clock, Building2, Shield } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const SAGE = "#3D6B5E";
const SUPPORT_EMAIL = "support@clearo.com.au";

function ContactCard({ Icon, title, children, href }) {
  const content = (
    <div className="rounded-[12px] border border-gray-200 bg-white px-6 py-5 flex items-start gap-4 h-full transition-colors hover:border-gray-300">
      <div
        className="h-10 w-10 rounded-[6px] flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
      >
        <Icon size={18} style={{ color: SAGE }} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 font-inter">{title}</h3>
        <div className="mt-1 text-sm leading-6 text-gray-600 font-inter">{children}</div>
      </div>
    </div>
  );

  if (href) {
    return <a href={href} className="block">{content}</a>;
  }
  return content;
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Header */}
        <div className="mb-12">
          <span className="inline-block rounded-[4px] bg-[#e8f3ee] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#3D6B5E] font-inter">
            Contact
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 font-heading sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-gray-500 font-inter max-w-xl">
            Whether you have a question about booking a scan, listing your clinic,
            or anything else — we're here to help.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContactCard Icon={Mail} title="Email" href={`mailto:${SUPPORT_EMAIL}`}>
            <p>
              <span className="font-medium text-[#3D6B5E]">{SUPPORT_EMAIL}</span>
            </p>
            <p className="text-gray-400 text-xs mt-1">For general enquiries and support</p>
          </ContactCard>

          <ContactCard Icon={Clock} title="Response time">
            <p>We aim to reply within one business day.</p>
          </ContactCard>

          <ContactCard Icon={MapPin} title="Location">
            <p>Melbourne, Australia</p>
          </ContactCard>

          <ContactCard Icon={Building2} title="For clinics &amp; providers">
            <p>
              Interested in listing your practice?{" "}
              <a href="/for-providers" className="font-medium text-[#3D6B5E] hover:underline">
                Learn more
              </a>
            </p>
          </ContactCard>
        </div>

        {/* Additional info */}
        <div className="mt-10 rounded-[12px] border border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex items-start gap-4">
            <div
              className="h-10 w-10 rounded-[6px] flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
            >
              <Shield size={18} style={{ color: SAGE }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 font-heading">
                Privacy &amp; data requests
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-gray-600 font-inter">
                If you'd like to request a copy of your data, delete your account, or have
                any privacy-related enquiries, please email us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#3D6B5E] hover:underline">
                  {SUPPORT_EMAIL}
                </a>{" "}
                with the subject line "Privacy Request". You can also review our{" "}
                <a href="/privacy" className="font-medium text-[#3D6B5E] hover:underline">
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
