import { CalendarDays } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";

export function SlotSummary({
  slotSummary,
  summaryLoading,
  summaryError,
  refetchSummary,
}) {
  return (
    <FrostedCard className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} style={{ color: SAGE }} />
          <h3 className="text-lg font-bold text-gray-900">
            Slot summary
          </h3>
        </div>
        <button
          type="button"
          onClick={() => refetchSummary()}
          className="text-sm font-semibold hover:opacity-80"
          style={{ color: SAGE }}
        >
          Refresh
        </button>
      </div>

      {summaryLoading ? (
        <div className="mt-4 text-gray-700">
          Loading slot summary…
        </div>
      ) : summaryError ? (
        <div className="mt-4 text-red-700">
          {summaryError?.message || "Could not load slot summary."}
        </div>
      ) : slotSummary.length === 0 ? (
        <div className="mt-4 text-gray-700">
          No slots in this date range yet.
        </div>
      ) : (
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Scan</th>
                <th className="py-2 pr-4">Available</th>
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {slotSummary.map((r, idx) => (
                <tr
                  key={`${r.slot_date}-${r.scan_type_id}-${idx}`}
                  className="border-t border-gray-200/70"
                >
                  <td className="py-2 pr-4 text-gray-900">
                    {r.slot_date}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">
                    {r.scan_type_name}
                  </td>
                  <td className="py-2 pr-4 text-gray-900">
                    {r.available_slots}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">
                    {r.total_slots}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FrostedCard>
  );
}
