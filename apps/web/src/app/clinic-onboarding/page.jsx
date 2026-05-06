"use client";

import { useState, useEffect } from "react";
import useClinicUser from "@/hooks/useClinicUser";
import Logo from "@/components/Logo";
import { X, ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";

const SAGE = "#3D6B5E";

const STEP_LABELS = ["Clinic Profile", "Machines & Equipment", "Business Hours", "Scan Pricing"];
const STEP_LEFT_HEADINGS = [
  { sub: "Step 1 of 4", heading: "Tell us about\nyour clinic.", desc: "Basic details so patients can find and contact you." },
  { sub: "Step 2 of 4", heading: "What equipment\ndo you have?", desc: "List the machines your clinic uses for imaging." },
  { sub: "Step 3 of 4", heading: "When are\nyou open?", desc: "Set your weekly operating hours for appointment slots." },
  { sub: "Step 4 of 4", heading: "Set your\npricing.", desc: "Define the scan types you offer and their prices." },
];

export default function ClinicOnboardingPage() {
  const { data: clinicAuthData, isLoading: userLoading } = useClinicUser();
  const clinicUser = clinicAuthData?.user || null;
  const [step, setStep] = useState(1);
  const [scanTypes, setScanTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    email: "",
    image_url: "",
    machines: [],
    hours: [
      { day_of_week: 0, open_time: "09:00", close_time: "17:00", is_closed: true },
      { day_of_week: 1, open_time: "09:00", close_time: "17:00", is_closed: false },
      { day_of_week: 2, open_time: "09:00", close_time: "17:00", is_closed: false },
      { day_of_week: 3, open_time: "09:00", close_time: "17:00", is_closed: false },
      { day_of_week: 4, open_time: "09:00", close_time: "17:00", is_closed: false },
      { day_of_week: 5, open_time: "09:00", close_time: "17:00", is_closed: false },
      { day_of_week: 6, open_time: "09:00", close_time: "17:00", is_closed: true },
    ],
    scan_pricing: [],
  });

  useEffect(() => {
    if (userLoading) return;
    if (!clinicUser && typeof window !== "undefined") {
      window.location.href = getClinicLocalHref("/clinic-admin/signin");
    }
  }, [clinicUser, userLoading]);

  useEffect(() => {
    const fetchScanTypes = async () => {
      const response = await fetch("/api/scan-types");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setScanTypes(data);
          return;
        }
        setScanTypes(Array.isArray(data?.scanTypes) ? data.scanTypes : []);
      }
    };
    fetchScanTypes();
  }, []);

  useEffect(() => {
    if (!clinicUser) return;
    setFormData((prev) => ({
      ...prev,
      email: prev.email || clinicUser.email || "",
    }));
  }, [clinicUser]);

  const updateFormData = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const updateHours = (dayIndex, field, value) => {
    const newHours = [...formData.hours];
    newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
    setFormData((prev) => ({ ...prev, hours: newHours }));
  };

  const addMachine = () =>
    setFormData((prev) => ({
      ...prev,
      machines: [
        ...prev.machines,
        { scan_type_id: "", machine_name: "", manufacturer: "", model: "" },
      ],
    }));
  const updateMachine = (index, field, value) => {
    const newMachines = [...formData.machines];
    newMachines[index] = { ...newMachines[index], [field]: value };
    setFormData((prev) => ({ ...prev, machines: newMachines }));
  };
  const removeMachine = (index) =>
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.filter((_, i) => i !== index),
    }));

  const addPricing = () =>
    setFormData((prev) => ({
      ...prev,
      scan_pricing: [
        ...prev.scan_pricing,
        { scan_type_id: "", price: "", duration_minutes: 30 },
      ],
    }));
  const updatePricing = (index, field, value) => {
    const newPricing = [...formData.scan_pricing];
    newPricing[index] = { ...newPricing[index], [field]: value };
    setFormData((prev) => ({ ...prev, scan_pricing: newPricing }));
  };
  const removePricing = (index) =>
    setFormData((prev) => ({
      ...prev,
      scan_pricing: prev.scan_pricing.filter((_, i) => i !== index),
    }));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await secureFetch("/api/clinic-onboarding", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit clinic");
      }
      if (typeof window !== "undefined") {
        window.location.href = getClinicLocalHref("/clinic-onboarding/success");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const inputClass =
    "w-full px-4 py-3.5 rounded-[1.25rem] text-sm font-inter transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]/40";
  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "#1A1A1A",
  };
  const selectClass =
    "w-full px-4 py-3.5 rounded-[1.25rem] text-sm font-inter transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 appearance-none";

  const currentLeft = STEP_LEFT_HEADINGS[step - 1];

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="text-sm font-inter" style={{ color: "#8A8A8A" }}>
          Loading clinic portal...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FBF8F3" }}>
      {/* ── Left decorative panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 relative overflow-hidden flex-col justify-between p-10 sticky top-0 h-screen"
        style={{
          background: "linear-gradient(160deg, #1A2F28 0%, #2D4A3E 50%, #1A2F28 100%)",
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(61,107,94,0.25) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(61,107,94,0.15) 0%, transparent 70%)" }}
        />

        <div className="relative">
          <Logo variant="dark" className="w-14 h-auto" />
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {currentLeft.sub}
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight whitespace-pre-line"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            {currentLeft.heading}
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            {currentLeft.desc}
          </p>
        </div>

        {/* Step dots */}
        <div className="relative flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-colors duration-200"
              style={{ background: s <= step ? SAGE : "rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col relative">
        {/* Close button + step indicator on mobile */}
        <div className="flex items-center justify-between p-5">
          <div className="lg:hidden flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] font-inter" style={{ color: SAGE }}>
              Step {step}/4
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className="h-1 rounded-full transition-all duration-200"
                  style={{
                    width: s <= step ? 20 : 8,
                    background: s <= step ? SAGE : "rgba(0,0,0,0.08)",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="lg:hidden" />
          <a
            href="/"
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-black/[0.04]"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            aria-label="Close"
          >
            <X size={18} style={{ color: "#6B7280" }} />
          </a>
        </div>

        <div className="flex-1 px-6 pb-10">
          <div className="w-full max-w-[560px] mx-auto">
            <div className="lg:hidden flex justify-center mb-5">
              <Logo className="w-12 h-auto" />
            </div>

            {/* Section heading */}
            <div className="mb-7">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: SAGE }}
              >
                Clinic Onboarding
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                {STEP_LABELS[step - 1]}
              </h1>
            </div>

            {/* ─── Step 1: Clinic Profile ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
                    Clinic Name *
                  </label>
                  <input type="text" value={formData.name} onChange={(e) => updateFormData("name", e.target.value)} className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
                    Description
                  </label>
                  <textarea value={formData.description} onChange={(e) => updateFormData("description", e.target.value)} rows={3} className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
                    Address *
                  </label>
                  <input type="text" value={formData.address} onChange={(e) => updateFormData("address", e.target.value)} className={inputClass} style={inputStyle} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>City *</label>
                    <input type="text" value={formData.city} onChange={(e) => updateFormData("city", e.target.value)} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>State</label>
                    <input type="text" value={formData.state} onChange={(e) => updateFormData("state", e.target.value)} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Postcode</label>
                    <input type="text" value={formData.zip_code} onChange={(e) => updateFormData("zip_code", e.target.value)} className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Phone *</label>
                    <input type="tel" value={formData.phone} onChange={(e) => updateFormData("phone", e.target.value)} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Email *</label>
                    <input type="email" value={formData.email} onChange={(e) => updateFormData("email", e.target.value)} className={inputClass} style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Machines ─── */}
            {step === 2 && (
              <div className="space-y-4">
                {formData.machines.map((machine, index) => (
                  <div
                    key={index}
                    className="rounded-[1.25rem] p-5 space-y-3"
                    style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)" }}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold font-inter" style={{ color: "#1A1A1A" }}>Machine {index + 1}</h3>
                      <button onClick={() => removeMachine(index)} type="button" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={14} style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Scan Type</label>
                        <select value={machine.scan_type_id} onChange={(e) => updateMachine(index, "scan_type_id", e.target.value)} className={selectClass} style={inputStyle}>
                          <option value="">Select type</option>
                          {scanTypes.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Machine Name</label>
                        <input type="text" value={machine.machine_name} onChange={(e) => updateMachine(index, "machine_name", e.target.value)} className={inputClass} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Manufacturer</label>
                        <input type="text" value={machine.manufacturer} onChange={(e) => updateMachine(index, "manufacturer", e.target.value)} className={inputClass} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Model</label>
                        <input type="text" value={machine.model} onChange={(e) => updateMachine(index, "model", e.target.value)} className={inputClass} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addMachine}
                  type="button"
                  className="w-full px-5 py-3.5 rounded-[1.25rem] border-2 border-dashed font-inter font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  style={{ borderColor: "rgba(0,0,0,0.10)", color: "#8A8A8A" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = SAGE; e.currentTarget.style.color = SAGE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)"; e.currentTarget.style.color = "#8A8A8A"; }}
                >
                  <Plus size={16} /> Add Machine
                </button>
              </div>
            )}

            {/* ─── Step 3: Hours ─── */}
            {step === 3 && (
              <div className="space-y-3">
                {formData.hours.map((hour, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-3 rounded-[1.25rem] px-5 py-3.5"
                    style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.04)" }}
                  >
                    <div className="w-24 flex-shrink-0">
                      <span className="text-sm font-semibold font-inter" style={{ color: "#1A1A1A" }}>
                        {dayNames[hour.day_of_week]}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={hour.is_closed}
                        onChange={(e) => updateHours(index, "is_closed", e.target.checked)}
                        className="rounded border-gray-300"
                        style={{ accentColor: SAGE }}
                      />
                      <span className="text-xs font-inter" style={{ color: "#8A8A8A" }}>Closed</span>
                    </label>
                    {!hour.is_closed && (
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <input
                          type="time"
                          value={hour.open_time}
                          onChange={(e) => updateHours(index, "open_time", e.target.value)}
                          className="px-3 py-2 rounded-xl text-sm font-inter"
                          style={inputStyle}
                        />
                        <span className="text-xs font-inter" style={{ color: "#B0B0B0" }}>to</span>
                        <input
                          type="time"
                          value={hour.close_time}
                          onChange={(e) => updateHours(index, "close_time", e.target.value)}
                          className="px-3 py-2 rounded-xl text-sm font-inter"
                          style={inputStyle}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Step 4: Pricing ─── */}
            {step === 4 && (
              <div className="space-y-4">
                {formData.scan_pricing.map((pricing, index) => (
                  <div
                    key={index}
                    className="rounded-[1.25rem] p-5 space-y-3"
                    style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)" }}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold font-inter" style={{ color: "#1A1A1A" }}>Pricing {index + 1}</h3>
                      <button onClick={() => removePricing(index)} type="button" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={14} style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Scan Type</label>
                        <select value={pricing.scan_type_id} onChange={(e) => updatePricing(index, "scan_type_id", e.target.value)} className={selectClass} style={inputStyle}>
                          <option value="">Select type</option>
                          {scanTypes.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Price ($)</label>
                        <input type="number" value={pricing.price} onChange={(e) => updatePricing(index, "price", e.target.value)} className={inputClass} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>Duration (min)</label>
                        <input type="number" value={pricing.duration_minutes} onChange={(e) => updatePricing(index, "duration_minutes", e.target.value)} className={inputClass} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addPricing}
                  type="button"
                  className="w-full px-5 py-3.5 rounded-[1.25rem] border-2 border-dashed font-inter font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  style={{ borderColor: "rgba(0,0,0,0.10)", color: "#8A8A8A" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = SAGE; e.currentTarget.style.color = SAGE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)"; e.currentTarget.style.color = "#8A8A8A"; }}
                >
                  <Plus size={16} /> Add Pricing
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="mt-5 rounded-[1.25rem] p-4 text-sm font-inter"
                style={{
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#B91C1C",
                }}
              >
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  type="button"
                  className="flex-1 px-6 py-3.5 rounded-full font-inter font-semibold text-sm transition-all flex items-center justify-center gap-2 hover:bg-black/[0.02]"
                  style={{
                    color: "#6B7280",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
              )}
              {step < 4 && (
                <button
                  onClick={() => setStep(step + 1)}
                  type="button"
                  className="flex-1 px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "#1A1A1A",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
              {step === 4 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  type="button"
                  className="flex-1 px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "#1A1A1A",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  {loading ? "Submitting..." : "Submit for Approval"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 lg:mt-24">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
