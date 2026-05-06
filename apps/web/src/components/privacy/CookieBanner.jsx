"use client";

import { useState } from "react";

function CookieIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm0 0c0 2.5 2 4.5 4.5 4.5a1 1 0 0 1 1 1.1 4 4 0 0 0 4.4 4.4 1 1 0 0 1 1 .9A14 14 0 0 1 16 2Z"
        stroke="#3D6B5E"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="1.5" fill="#3D6B5E" />
      <circle cx="17" cy="20" r="1.5" fill="#3D6B5E" />
      <circle cx="12" cy="22" r="1" fill="#3D6B5E" opacity="0.6" />
      <circle cx="20" cy="14" r="1" fill="#3D6B5E" opacity="0.6" />
      <circle cx="16" cy="16" r="1" fill="#3D6B5E" opacity="0.4" />
    </svg>
  );
}

export default function CookieBanner({
  open,
  onAcceptAll,
  onRejectNonEssential,
  onManagePreferences,
}) {
  const [closing, setClosing] = useState(false);

  if (!open) return null;

  const handleAcceptAll = () => {
    setClosing(true);
    setTimeout(() => onAcceptAll(), 200);
  };

  const handleReject = () => {
    setClosing(true);
    setTimeout(() => onRejectNonEssential(), 200);
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[80] w-full max-w-md transition-all duration-200 ${closing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
    >
      <div className="rounded-2xl bg-white px-8 pb-8 pt-7 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <CookieIcon />
          <h2 className="text-xl font-semibold text-gray-900 font-heading">
            Cookies Consent
          </h2>
        </div>

        {/* Content */}
        <p className="mt-5 text-[15px] leading-relaxed text-gray-500 font-inter">
          This website uses cookies to help you have a better browsing
          experience.{" "}
          <a
            href="/cookies"
            className="font-medium text-[#3D6B5E] hover:underline"
          >
            Read more
          </a>
        </p>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 rounded-lg bg-[#3D6B5E] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#345C51] font-inter"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 rounded-lg border-2 border-[#3D6B5E] bg-white px-5 py-3 text-sm font-semibold text-[#3D6B5E] transition-colors hover:bg-[#f0f7f4] font-inter"
          >
            Decline
          </button>
        </div>

        {/* Manage link */}
        <button
          type="button"
          onClick={onManagePreferences}
          className="mt-3 w-full text-center text-xs font-medium text-gray-400 transition-colors hover:text-[#3D6B5E] font-inter"
        >
          Manage preferences
        </button>
      </div>
    </div>
  );
}
