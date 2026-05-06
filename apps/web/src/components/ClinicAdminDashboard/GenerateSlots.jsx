import { Wand2 } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";
import { DatePicker } from "@/components/ui/DatePicker";

export function GenerateSlots({
  slotRange,
  setSlotRange,
  generateSlotsMutation,
  selectedClinicId,
}) {
  return (
    <FrostedCard className="p-6">
      <div className="flex items-center gap-2">
        <Wand2 size={18} style={{ color: SAGE }} />
        <h3 className="text-lg font-bold text-gray-900">
          Generate appointment times
        </h3>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Creates 30-minute slots for each active machine, based on your weekly
        hours.
      </p>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Start date
          </label>
          <DatePicker
            value={slotRange.startDate}
            onChange={(e) =>
              setSlotRange((p) => ({
                ...p,
                startDate: e.target.value,
              }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 bg-white/70 text-gray-900 flex items-center justify-between text-left h-[46px]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            End date
          </label>
          <DatePicker
            value={slotRange.endDate}
            onChange={(e) =>
              setSlotRange((p) => ({ ...p, endDate: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 bg-white/70 text-gray-900 flex items-center justify-between text-left h-[46px]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          generateSlotsMutation.mutate({
            clinicId: selectedClinicId,
            startDate: slotRange.startDate,
            endDate: slotRange.endDate,
          });
        }}
        disabled={generateSlotsMutation.isPending}
        className="mt-4 w-full px-4 py-3 rounded-2xl font-semibold transition-all"
        style={{
          border: `2px solid ${SAGE}`,
          color: "#0F172A",
          background: "rgba(61, 107, 94, 0.14)",
          opacity: generateSlotsMutation.isPending ? 0.75 : 1,
        }}
      >
        {generateSlotsMutation.isPending ? "Generating…" : "Generate slots"}
      </button>
    </FrostedCard>
  );
}
