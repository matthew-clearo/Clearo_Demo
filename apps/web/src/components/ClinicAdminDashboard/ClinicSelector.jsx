import { Building2 } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";

export function ClinicSelector({
  clinic,
  clinics,
  selectedClinicId,
  setSelectedClinicId,
}) {
  const clinicStatusPill = clinic?.approval_status || "pending";
  const statusLabel = clinicStatusPill === "approved" ? "Approved" : "Pending";

  return (
    <FrostedCard className="p-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div className="flex items-start gap-3">
          <div
            className="h-12 w-12 rounded-2xl border flex items-center justify-center"
            style={{
              borderColor: "rgba(61, 107, 94, 0.35)",
              background:
                "linear-gradient(135deg, rgba(61, 107, 94, 0.14) 0%, rgba(74, 125, 109, 0.12) 100%)",
            }}
          >
            <Building2 size={20} className="text-gray-900" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">
                {clinic?.name || "Your clinic"}
              </h2>
              <span
                className="text-xs px-2 py-1 rounded-full border"
                style={{
                  borderColor:
                    clinicStatusPill === "approved"
                      ? "rgba(61, 107, 94, 0.45)"
                      : "rgba(251, 191, 36, 0.45)",
                  background:
                    clinicStatusPill === "approved"
                      ? "rgba(61, 107, 94, 0.10)"
                      : "rgba(251, 191, 36, 0.10)",
                  color: clinicStatusPill === "approved" ? SAGE : "#B45309",
                }}
              >
                {statusLabel}
              </span>
            </div>

            <p className="text-sm text-gray-600 mt-1">
              {clinic?.address}
              {clinic?.city ? `, ${clinic.city}` : ""}
            </p>
            <p className="text-sm text-gray-600">
              {clinic?.phone ? `Phone: ${clinic.phone}` : ""}
              {clinic?.email ? ` • Email: ${clinic.email}` : ""}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[320px]">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Select clinic
          </label>
          <select
            value={selectedClinicId || ""}
            onChange={(e) => setSelectedClinicId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 bg-white/60 text-gray-900"
          >
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FrostedCard>
  );
}
