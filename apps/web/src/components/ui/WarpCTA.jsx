"use client";

import { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SAGE = "#3D6B5E";
const LINE_COUNT = 26;

function makeLines() {
  const lines = [];
  for (let i = 0; i < LINE_COUNT; i++) {
    const angle = (i / LINE_COUNT) * 360;
    const length = 30 + Math.random() * 70;
    const delay = Math.random() * 6;
    const duration = 4 + Math.random() * 4;
    const color = i % 3 === 0 ? "rgba(61,107,94,0.22)" : i % 3 === 1 ? "rgba(184,132,95,0.18)" : "rgba(91,123,148,0.18)";
    const hyperColor = i % 3 === 0 ? "rgba(61,107,94,0.38)" : i % 3 === 1 ? "rgba(184,132,95,0.32)" : "rgba(91,123,148,0.32)";
    lines.push({ angle, length, delay, duration, color, hyperColor });
  }
  return lines;
}

const lines = makeLines();

/**
 * Reusable cream CTA section with restrained radiating lines
 * and gentle emphasis on primary button click.
 *
 * Props:
 *   badge        – small uppercase text in the badge (e.g. "Ready to book?")
 *   heading      – main heading (string or JSX)
 *   description  – paragraph text below heading
 *   primaryLabel – primary button text (default "Find a Clinic")
 *   primaryHref  – where primary button navigates (default "/search")
 *   primaryScrollId – if set, scrolls to this element ID instead of navigating
 *   secondaryLabel – secondary button text (optional)
 *   secondaryHref  – secondary button link (optional)
 */
export default function WarpCTA({
  badge = "Ready to book?",
  heading,
  description,
  primaryLabel = "Find a Clinic",
  primaryHref = "/search",
  primaryScrollId,
  secondaryLabel,
  secondaryHref,
}) {
  const [hyper, setHyper] = useState(false);
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    setHyper(true);
    setTimeout(() => {
      if (primaryScrollId) {
        document
          .getElementById(primaryScrollId)
          ?.scrollIntoView({ behavior: "smooth" });
      } else if (/^https?:\/\//.test(primaryHref)) {
        window.location.href = primaryHref;
      } else {
        navigate(primaryHref);
      }
      setTimeout(() => setHyper(false), 600);
    }, 800);
  }, [primaryScrollId, primaryHref, navigate]);

  return (
    <section className="py-16 lg:py-28" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div
          className="relative rounded-[16px] overflow-hidden px-5 sm:px-8 py-14 sm:py-[4.5rem] lg:px-16 lg:py-28 text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(93,75,54,0.08)",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.06)",
          }}
        >
          {/* Warp animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: hyper ? "320px" : "192px",
                height: hyper ? "320px" : "192px",
                background: hyper
                  ? "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(61,107,94,0.12) 38%, transparent 70%)"
                  : "radial-gradient(circle, rgba(61,107,94,0.08) 0%, transparent 70%)",
                animation: hyper ? "none" : "warpPulse 6s ease-in-out infinite",
                transition:
                  "width 0.4s ease-out, height 0.4s ease-out, background 0.3s ease-out",
              }}
            />

            {lines.map((line, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: hyper ? "100%" : `${line.length}%`,
                  height: hyper ? "2px" : "1px",
                  transformOrigin: "0% 50%",
                  transform: `rotate(${line.angle}deg)`,
                  background: `linear-gradient(90deg, transparent 0%, ${hyper ? line.hyperColor : line.color} 40%, transparent 100%)`,
                  animation: hyper
                    ? "warpHyperLine 0.3s ease-out infinite"
                    : `warpLine ${line.duration}s ease-in-out ${line.delay}s infinite`,
                  transition: "width 0.4s ease-out, height 0.2s ease-out",
                }}
              />
            ))}
          </div>

          {/* Subtle color accents */}
          <div
            className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(61,107,94,0.06) 0%, transparent 70%)",
              transform: "translate(-30%, -30%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(184,132,95,0.05) 0%, transparent 70%)",
              transform: "translate(30%, 30%)",
            }}
          />
          <div
            className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(91,123,148,0.04) 0%, transparent 70%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 max-w-2xl mx-auto">
            {badge ? (
              <div
                className="inline-flex items-center px-3.5 py-2 rounded-[8px] mb-7 sm:mb-10"
                style={{ backgroundColor: "rgba(61,107,94,0.06)" }}
              >
                <span
                  className="text-[11px] font-inter font-medium tracking-[0.1em] uppercase"
                  style={{ color: "#8A8A8A" }}
                >
                  {badge}
                </span>
              </div>
            ) : null}

            <h2
              className="text-[2rem] sm:text-3xl lg:text-5xl xl:text-6xl font-heading font-semibold text-gray-900 mb-5 sm:mb-7"
              style={{ letterSpacing: "-0.025em", lineHeight: "1.1" }}
            >
              {heading}
            </h2>

            <p
              className="text-[15px] sm:text-base lg:text-lg font-inter leading-relaxed mb-8 sm:mb-14 max-w-lg mx-auto"
              style={{ color: "#555" }}
            >
              {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleClick}
                disabled={hyper}
                className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-lg font-inter font-semibold text-[16px] sm:text-[17px] text-white hover:opacity-90 active:scale-[0.97] transition-all inline-flex items-center justify-center gap-3"
                style={{
                  backgroundColor: "#3D6B5E",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                <span>{hyper ? "Engaging..." : primaryLabel}</span>
                <ArrowRight
                  size={20}
                  className={hyper ? "animate-pulse" : ""}
                />
              </button>
              {secondaryLabel && secondaryHref && (
                <a
                  href={secondaryHref}
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-lg font-inter font-semibold text-[16px] sm:text-[17px] transition-all hover:bg-gray-50"
                  style={{
                    color: "#3D6B5E",
                    border: "1.5px solid #3D6B5E",
                  }}
                >
                  {secondaryLabel}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes warpLine {
          0%, 100% { opacity: 0; transform-origin: 0% 50%; }
          15% { opacity: 1; }
          50% { opacity: 0.6; }
          85% { opacity: 1; }
        }
        @keyframes warpHyperLine {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @keyframes warpPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.7; }
        }
      `}</style>
    </section>
  );
}
