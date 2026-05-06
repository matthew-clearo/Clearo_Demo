"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";

const SAGE = "#3D6B5E";
const SLATE = "#5B7B94";

const faqs = [
  {
    number: "01",
    question: "Which scan do I actually need?",
    answer:
      "Most patients book with a referral from their GP or specialist that specifies the scan type. Clearo helps you search for that scan type and compare listed clinic options. If you're unsure which scan you need, check with your doctor or the clinic before booking.",
  },
  {
    number: "02",
    question: "How do you verify clinic quality and safety?",
    answer:
      "Clinic profiles show the information available in the platform, including location, services, pricing, and appointment options. Clinics remain responsible for their own clinical standards, accreditation, and patient care.",
  },
  {
    number: "03",
    question: "What should I expect on appointment day?",
    answer:
      "After booking, you'll receive the clinic address, appointment details, and any preparation information supplied through the booking flow. Result timing depends on the clinic and scan type.",
  },
  {
    number: "04",
    question: "How much can I actually save?",
    answer:
      "Clearo shows listed scan pricing where available so you can compare clinic options before choosing an appointment.",
  },
  {
    number: "05",
    question: "Do I need a referral to book?",
    answer:
      "Most diagnostic imaging in Australia requires a referral from a GP or specialist to be eligible for a Medicare rebate. You can still book without one, but you may not receive a rebate. We recommend checking with your doctor first as they can provide a referral in minutes.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">

          {/* Left column — heading card (sticky on desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <div
              className="rounded-[16px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(93,75,54,0.08)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
                minHeight: "280px",
              }}
            >
              <div>
                <div
                  className="h-11 w-11 sm:h-12 sm:w-12 rounded-[10px] flex items-center justify-center mb-6 sm:mb-8"
                  style={{ backgroundColor: "rgba(91,123,148,0.08)" }}
                >
                  <HelpCircle size={20} className="sm:hidden" style={{ color: SLATE }} />
                  <HelpCircle size={22} className="hidden sm:block" style={{ color: SLATE }} />
                </div>
                <p className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>
                  FAQ
                </p>
                <h2
                  className="text-[1.8rem] sm:text-2xl lg:text-3xl xl:text-[2.25rem] font-heading font-semibold text-gray-900 mb-4"
                  style={{ letterSpacing: "-0.025em", lineHeight: "1.15" }}
                >
                  Got questions?
                  <br />
                  We've got answers.
                </h2>
                <p className="text-[13px] sm:text-sm font-inter leading-relaxed" style={{ color: "rgba(26,26,26,0.62)" }}>
                  Everything you need to know about your imaging journey, from booking to results.
                </p>
              </div>
              <div className="mt-6 sm:mt-8">
                <a
                  href="/how-it-works"
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 rounded-lg font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
                  style={{ backgroundColor: SAGE, color: "#FFFFFF" }}
                >
                  Learn more
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </div>

          {/* Right column — accordion */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-[8px] transition-all"
                  style={{
                    backgroundColor: isOpen ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                    boxShadow: isOpen
                      ? "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06)"
                      : "none",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <button
                    onClick={() => toggle(index)}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 lg:px-7 py-4 sm:py-5 lg:py-6 text-left group"
                  >
                    {/* Number */}
                    <span
                      className="text-base sm:text-lg font-heading font-semibold flex-shrink-0"
                      style={{ color: isOpen ? SAGE : "#8A8A8A", minWidth: "1.75rem", transition: "color 0.3s" }}
                    >
                      {faq.number}
                    </span>

                    {/* Question */}
                    <span className="flex-1 text-[14px] sm:text-[15px] font-inter font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {faq.question}
                    </span>

                    {/* Chevron toggle */}
                    <div
                      className="h-8 w-8 rounded-[6px] flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        backgroundColor: isOpen ? "rgba(61,107,94,0.08)" : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <ChevronDown
                        size={16}
                        className="transition-transform duration-300"
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          color: isOpen ? SAGE : "#8A8A8A",
                        }}
                      />
                    </div>
                  </button>

                  {/* Answer - animated */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isOpen ? "300px" : "0px",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="px-4 sm:px-6 lg:px-7 pb-5 sm:pb-6 pl-[3.1rem] sm:pl-[3.75rem] lg:pl-[4.25rem]">
                      <p className="text-[13px] sm:text-sm text-gray-600 font-inter leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
