import { Clock } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { DAYS, SAGE } from "@/app/clinic-admin/dashboard/constants";

export function WeeklyHours({ hoursDraft, setHoursDraft, saveHoursMutation }) {
  return (
    <FrostedCard className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock size={18} style={{ color: SAGE }} />
          <h3 className="text-lg font-bold text-gray-900">Weekly hours</h3>
        </div>

        <button
          type="button"
          disabled={!hoursDraft || saveHoursMutation.isPending}
          onClick={() => {
            if (!hoursDraft) return;
            const payload = {
              clinicId: saveHoursMutation.variables?.clinicId,
              hours: hoursDraft.map((h) => ({
                day_of_week: h.day_of_week,
                is_closed: Boolean(h.is_closed),
                open_time: h.open_time ? `${h.open_time}:00` : "09:00:00",
                close_time: h.close_time ? `${h.close_time}:00` : "17:00:00",
              })),
            };
            saveHoursMutation.mutate(payload);
          }}
          className="px-4 py-2 rounded-2xl font-semibold transition-all"
          style={{
            border: `2px solid ${SAGE}`,
            color: SAGE,
            background: "rgba(61, 107, 94, 0.08)",
            opacity: saveHoursMutation.isPending ? 0.75 : 1,
          }}
        >
          {saveHoursMutation.isPending ? "Saving…" : "Save hours"}
        </button>
      </div>

      <p className="text-sm text-gray-600 mt-2">
        These hours are used when generating appointment times.
      </p>

      <div className="mt-5 grid gap-3">
        {hoursDraft?.map((row) => {
          const label = DAYS.find((d) => d.idx === row.day_of_week)?.label;
          return (
            <div
              key={row.day_of_week}
              className="rounded-2xl border border-gray-200/70 bg-white/50 p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-[130px] font-semibold text-gray-900">
                {label}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={row.is_closed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHoursDraft((prev) =>
                        prev.map((h) =>
                          h.day_of_week === row.day_of_week
                            ? { ...h, is_closed: checked }
                            : h,
                        ),
                      );
                    }}
                  />
                  Closed
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Open</span>
                  <input
                    type="time"
                    value={row.open_time}
                    disabled={row.is_closed}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHoursDraft((prev) =>
                        prev.map((h) =>
                          h.day_of_week === row.day_of_week
                            ? { ...h, open_time: val }
                            : h,
                        ),
                      );
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200/80 bg-white/70 text-gray-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Close</span>
                  <input
                    type="time"
                    value={row.close_time}
                    disabled={row.is_closed}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHoursDraft((prev) =>
                        prev.map((h) =>
                          h.day_of_week === row.day_of_week
                            ? { ...h, close_time: val }
                            : h,
                        ),
                      );
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200/80 bg-white/70 text-gray-900"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </FrostedCard>
  );
}
