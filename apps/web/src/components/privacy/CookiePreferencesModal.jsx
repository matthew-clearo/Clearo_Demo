"use client";

import { useEffect, useState } from "react";

function PreferenceRow({ title, description, enabled, locked = false, onChange }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 font-inter">{title}</p>
          <p className="mt-1 text-sm leading-6 text-gray-600 font-inter">{description}</p>
        </div>

        <label className="inline-flex items-center gap-3 whitespace-nowrap text-sm font-medium text-gray-700 font-inter">
          <span>{enabled ? "On" : "Off"}</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#3D6B5E]"
            checked={enabled}
            disabled={locked}
            onChange={(event) => onChange?.(event.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}

export default function CookiePreferencesModal({
  open,
  consent,
  onClose,
  onAcceptAll,
  onRejectNonEssential,
  onSave,
}) {
  const [draft, setDraft] = useState({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      analytics: Boolean(consent?.analytics),
      marketing: Boolean(consent?.marketing),
    });
  }, [consent, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
    >
      <div
        className="w-full max-w-2xl rounded-[32px] border border-gray-200 bg-[#FBF8F3] shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 font-heading">
              Cookie settings
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 font-inter">
              A few essentials are always on. Everything else is optional.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 font-inter"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <PreferenceRow
            title="Necessary"
            description="Core sign-in, booking continuity, and security."
            enabled={true}
            locked={true}
          />
          <PreferenceRow
            title="Analytics"
            description="High-level patterns on public pages."
            enabled={draft.analytics}
            onChange={(analytics) => setDraft((current) => ({ ...current, analytics }))}
          />
          <PreferenceRow
            title="Marketing"
            description="Campaign and ad measurement, if enabled."
            enabled={draft.marketing}
            onChange={(marketing) => setDraft((current) => ({ ...current, marketing }))}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onRejectNonEssential}
            className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 font-inter"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 font-inter"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-full bg-[#1A1A1A] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 font-inter"
          >
            Save choices
          </button>
        </div>
      </div>
    </div>
  );
}
