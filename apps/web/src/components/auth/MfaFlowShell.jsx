"use client";

import Logo from "@/components/Logo";
import FrostedCard from "@/components/ui/FrostedCard";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";

function StepList({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {steps.map((step, index) => (
        <div
          key={`${step.title}-${index}`}
          className="rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                backgroundColor: "rgba(255,255,255,0.16)",
                color: "#F7F1E8",
              }}
            >
              {index + 1}
            </div>
            <div>
              <p className="font-inter text-sm font-semibold text-white">{step.title}</p>
              <p className="mt-1 font-inter text-sm leading-5 text-white/[0.7]">{step.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MfaFlowShell({
  accent = "#3D6B5E",
  accentDark = "#1F332D",
  accentGlow = "rgba(61,107,94,0.18)",
  badge = "Security checkpoint",
  title,
  description,
  asideTitle,
  asideDescription,
  steps = [],
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#FBF8F3" }}>
      <SoftHeroBackground />

      <div
        className="pointer-events-none absolute -top-24 left-[8%] h-72 w-72 rounded-full blur-3xl"
        style={{ background: accentGlow }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-[6%] h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(205, 175, 119, 0.10)" }}
      />

      <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-6 lg:flex-row">
          <div
            className="relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] lg:w-[350px] lg:px-8 lg:py-8"
            style={{
              background: `linear-gradient(160deg, ${accentDark} 0%, ${accent} 100%)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-48"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute -right-14 top-24 h-40 w-40 rounded-full blur-3xl"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div className="relative flex h-full flex-col">
              <Logo className="w-20 h-auto" variant="dark" />

              {badge ? (
                <div
                  className="mt-8 inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "#F7F1E8",
                  }}
                >
                  {badge}
                </div>
              ) : null}

              {title || description ? (
                <div className="mt-5">
                  {title ? (
                    <h1 className="max-w-sm font-heading text-[2.1rem] leading-[0.95] tracking-[-0.03em] text-white sm:text-[2.45rem]">
                      {title}
                    </h1>
                  ) : null}
                  {description ? (
                    <p className="mt-3 max-w-sm font-inter text-sm leading-6 text-white/[0.76]">
                      {description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {asideTitle || asideDescription ? (
                <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.06] px-4 py-4">
                  {asideTitle ? (
                    <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.24em] text-white/[0.62]">
                      {asideTitle}
                    </p>
                  ) : null}
                  {asideDescription ? (
                    <p className="mt-2 font-inter text-sm leading-6 text-white/[0.76]">
                      {asideDescription}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {steps.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-[0.24em] text-white/[0.62]">
                    Quick steps
                  </p>
                  <StepList steps={steps} />
                </div>
              ) : null}
            </div>
          </div>

          <FrostedCard className="flex-1 p-5 sm:p-7 lg:p-10">
            <div className="mx-auto max-w-2xl">{children}</div>
          </FrostedCard>
        </div>
      </div>
    </div>
  );
}
