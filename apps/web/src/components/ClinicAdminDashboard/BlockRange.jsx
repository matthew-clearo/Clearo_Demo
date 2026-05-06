import { CalendarDays } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE_2 } from "@/app/clinic-admin/dashboard/constants";
import { DatePicker } from "@/components/ui/DatePicker";

export function BlockRange({
  blockRange,
  setBlockRange,
  blockRangeMutation,
  scanTypeOptions,
}) {
  return (
    <FrostedCard className="p-6">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} style={{ color: SAGE_2 }} />
        <h3 className="text-lg font-bold text-gray-900">
          Block / open a date range
        </h3>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Use this when you're not taking bookings (public holiday, staff leave,
        etc.).
      </p>

      <div className="mt-4 grid gap-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Start date
            </label>
            <DatePicker
              value={blockRange.startDate}
              onChange={(e) =>
                setBlockRange((p) => ({
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
              value={blockRange.endDate}
              onChange={(e) =>
                setBlockRange((p) => ({
                  ...p,
                  endDate: e.target.value,
                }))
              }
              className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 bg-white/70 text-gray-900 flex items-center justify-between text-left h-[46px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Scan type (optional)
          </label>
          <select
            value={blockRange.scanTypeId}
            onChange={(e) =>
              setBlockRange((p) => ({
                ...p,
                scanTypeId: e.target.value,
              }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 bg-white/70 text-gray-900"
          >
            <option value="">All scan types</option>
            {scanTypeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              blockRangeMutation.mutate({ blockRange, makeAvailable: false })
            }
            disabled={blockRangeMutation.isPending}
            className="px-4 py-3 rounded-2xl font-semibold border border-gray-200/80 text-gray-900 hover:bg-white/60 transition-colors"
          >
            Block
          </button>
          <button
            type="button"
            onClick={() =>
              blockRangeMutation.mutate({ blockRange, makeAvailable: true })
            }
            disabled={blockRangeMutation.isPending}
            className="px-4 py-3 rounded-2xl font-semibold transition-all"
            style={{
              border: `2px solid ${SAGE_2}`,
              color: "#0F172A",
              background: "rgba(61, 107, 94, 0.14)",
              opacity: blockRangeMutation.isPending ? 0.75 : 1,
            }}
          >
            Open
          </button>
        </div>
      </div>
    </FrostedCard>
  );
}
