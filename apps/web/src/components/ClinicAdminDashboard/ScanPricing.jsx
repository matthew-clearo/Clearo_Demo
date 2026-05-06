import { ShieldCheck } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE_2 } from "@/app/clinic-admin/dashboard/constants";

export function ScanPricing({
  pricingDraft,
  setPricingDraft,
  savePricingMutation,
}) {
  return (
    <FrostedCard className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: SAGE_2 }} />
          <h3 className="text-lg font-bold text-gray-900">
            Scan types & pricing
          </h3>
        </div>

        <button
          type="button"
          disabled={!pricingDraft || savePricingMutation.isPending}
          onClick={() => {
            if (!pricingDraft) return;
            savePricingMutation.mutate({
              clinicId: savePricingMutation.variables?.clinicId,
              scanPricing: pricingDraft.map((p) => ({
                scan_type_id: p.scan_type_id,
                price: p.price,
                duration_minutes: Number(p.duration_minutes) || 30,
                available: Boolean(p.available),
                requires_referral: Boolean(p.requires_referral),
                prep_instructions: p.prep_instructions || "",
              })),
            });
          }}
          className="px-4 py-2 rounded-2xl font-semibold transition-all"
          style={{
            border: `2px solid ${SAGE_2}`,
            color: SAGE_2,
            background: "rgba(61, 107, 94, 0.08)",
            opacity: savePricingMutation.isPending ? 0.75 : 1,
          }}
        >
          {savePricingMutation.isPending ? "Saving…" : "Save pricing"}
        </button>
      </div>

      <p className="text-sm text-gray-600 mt-2">
        Toggle a scan type on/off, set pricing, control duration, referral rule,
        and prep instructions.
      </p>

      {pricingDraft?.length ? (
        <div className="mt-5 grid gap-3">
          {pricingDraft.map((p, idx) => (
            <div
              key={p.scan_type_id}
              className="rounded-2xl border border-gray-200/70 bg-white/50 p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-[170px]">
                <div className="font-semibold text-gray-900">
                  {p.scan_type_name || "Scan"}
                </div>
                <div className="text-xs text-gray-500">
                  Scan type ID {p.scan_type_id}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={p.available}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPricingDraft((prev) =>
                        prev.map((row, j) =>
                          j === idx ? { ...row, available: checked } : row,
                        ),
                      );
                    }}
                  />
                  Available
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(p.requires_referral)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPricingDraft((prev) =>
                        prev.map((row, j) =>
                          j === idx
                            ? { ...row, requires_referral: checked }
                            : row,
                        ),
                      );
                    }}
                  />
                  Requires referral
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={p.price ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPricingDraft((prev) =>
                        prev.map((row, j) =>
                          j === idx ? { ...row, price: val } : row,
                        ),
                      );
                    }}
                    className="w-[140px] px-3 py-2 rounded-xl border border-gray-200/80 bg-white/70 text-gray-900"
                    placeholder="Price"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    min
                  </span>
                  <input
                    type="number"
                    value={p.duration_minutes ?? 30}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPricingDraft((prev) =>
                        prev.map((row, j) =>
                          j === idx ? { ...row, duration_minutes: val } : row,
                        ),
                      );
                    }}
                    className="w-[110px] px-3 py-2 rounded-xl border border-gray-200/80 bg-white/70 text-gray-900"
                    placeholder="Duration"
                  />
                </div>
              </div>

              <div className="w-full">
                <label className="block text-xs text-gray-500 mb-1">
                  Prep instructions
                </label>
                <textarea
                  rows={2}
                  value={p.prep_instructions || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPricingDraft((prev) =>
                      prev.map((row, j) =>
                        j === idx ? { ...row, prep_instructions: val } : row,
                      ),
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200/80 bg-white/70 text-gray-900"
                  placeholder="Preparation guidance shown on confirmation pages"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-gray-200/70 bg-white/50 p-4 text-gray-700">
          No scan types set up yet.
        </div>
      )}
    </FrostedCard>
  );
}
