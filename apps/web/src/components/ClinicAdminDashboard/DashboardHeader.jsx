import { RefreshCcw, Building2, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";

export function DashboardHeader({
  clinic,
  clinics,
  selectedClinicId,
  setSelectedClinicId,
  refetchClinic,
  refetchSummary,
  refetchBookings,
}) {
  const status = clinic?.approval_status || "pending";
  const isApproved = status === "approved";

  async function handleSignOut() {
    const res = await secureFetch("/api/clinic/auth/signout", {
      method: "POST",
    });

    if (!res.ok) {
      toast.error("Could not sign out");
      return;
    }

    window.location.href = getClinicLocalHref("/clinic-admin/signin");
  }

  return (
    <section
      className="relative overflow-hidden px-6 lg:px-12 pt-10 pb-8"
      style={{
        background:
          "linear-gradient(135deg, #FBF8F3 0%, #FFFFFF 40%, #FBF8F3 100%)",
      }}
    >
      {/* Subtle decorative gradient orbs */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(61,107,94,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(61,107,94,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Top row: subtitle + refresh */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: SAGE }}
          >
            Clinic Dashboard
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refetchClinic();
                refetchSummary();
                refetchBookings();
                toast("Refreshing…");
              }}
              className="px-3.5 py-1.5 rounded-full font-inter font-semibold text-xs transition-all duration-150 inline-flex items-center gap-1.5"
              style={{
                color: "#6B7280",
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <RefreshCcw size={12} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-full font-inter font-semibold text-xs transition-all duration-150 inline-flex items-center gap-1.5"
              style={{
                color: "#7F1D1D",
                background: "rgba(127,29,29,0.04)",
                border: "1px solid rgba(127,29,29,0.10)",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Main hero row */}
        <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
          <div className="flex items-start gap-4">
            {/* Clinic icon */}
            <div
              className="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(61,107,94,0.07)",
                border: "1px solid rgba(61,107,94,0.12)",
              }}
            >
              <Building2 size={22} style={{ color: SAGE }} />
            </div>

            <div>
              {/* Clinic name + status */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  className="text-2xl md:text-3xl font-heading font-semibold"
                  style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                >
                  {clinic?.name || "Your Clinic"}
                </h1>
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background: isApproved
                      ? "rgba(61,107,94,0.10)"
                      : "rgba(251,191,36,0.10)",
                    color: isApproved ? SAGE : "#B45309",
                    border: isApproved
                      ? "1px solid rgba(61,107,94,0.25)"
                      : "1px solid rgba(251,191,36,0.25)",
                  }}
                >
                  {isApproved ? "Approved" : "Pending"}
                </span>
              </div>

              {/* Contact details as subtle inline items */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {(clinic?.address || clinic?.city) && (
                  <span className="inline-flex items-center gap-1 text-sm" style={{ color: "#8A8A8A" }}>
                    <MapPin size={12} style={{ color: "#B0B0B0" }} />
                    {clinic.address}
                    {clinic.city ? `, ${clinic.city}` : ""}
                  </span>
                )}
                {clinic?.phone && (
                  <span className="inline-flex items-center gap-1 text-sm" style={{ color: "#8A8A8A" }}>
                    <Phone size={12} style={{ color: "#B0B0B0" }} />
                    {clinic.phone}
                  </span>
                )}
                {clinic?.email && (
                  <span className="inline-flex items-center gap-1 text-sm" style={{ color: "#8A8A8A" }}>
                    <Mail size={12} style={{ color: "#B0B0B0" }} />
                    {clinic.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clinic selector — only show if multiple clinics */}
          {clinics && clinics.length > 1 && (
            <div className="w-full md:w-auto">
              <select
                value={selectedClinicId || ""}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="w-full md:w-[260px] px-4 py-2.5 rounded-full text-sm font-inter font-semibold appearance-none cursor-pointer transition-all"
                style={{
                  color: "#1A1A1A",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bottom divider */}
        <div
          className="mt-7 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(61,107,94,0.12) 50%, transparent 100%)",
          }}
        />
      </div>
    </section>
  );
}
