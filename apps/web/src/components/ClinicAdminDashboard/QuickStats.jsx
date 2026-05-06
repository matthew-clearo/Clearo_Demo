import { CalendarCheck, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";

const STAT_CARDS = [
  {
    key: "todayBookings",
    label: "Today's Bookings",
    icon: CalendarCheck,
    format: (s) => s.todayBookings ?? 0,
    sub: (s) => {
      const parts = [];
      if (s.todayConfirmed) parts.push(`${s.todayConfirmed} confirmed`);
      if (s.todayPending) parts.push(`${s.todayPending} pending`);
      return parts.join(" · ") || "No bookings today";
    },
  },
  {
    key: "upcomingBookings",
    label: "Upcoming",
    icon: Clock,
    format: (s) => s.upcomingBookings ?? 0,
    sub: () => "Future bookings",
  },
  {
    key: "pendingReferrals",
    label: "Pending Referrals",
    icon: AlertTriangle,
    format: (s) => s.pendingReferrals ?? 0,
    sub: (s) =>
      s.pendingReferrals > 0 ? "Needs your review" : "All clear",
    accent: (s) => (s.pendingReferrals > 0 ? "#B45309" : null),
  },
  {
    key: "utilization",
    label: "Month Utilization",
    icon: TrendingUp,
    format: (s) => {
      if (!s.monthTotalSlots) return "—";
      const pct = Math.round((s.monthBookedSlots / s.monthTotalSlots) * 100);
      return `${pct}%`;
    },
    sub: (s) => {
      if (!s.monthTotalSlots) return "No slots generated";
      return `${s.monthBookedSlots} of ${s.monthTotalSlots} slots filled`;
    },
  },
];

export function QuickStats({ stats, isLoading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        const accentColor = card.accent?.(stats || {}) || SAGE;

        return (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-[1.25rem] bg-white p-5"
            style={{
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
            }}
          >
            {/* Decorative accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
              }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.15em] mb-2"
                  style={{ color: "#8A8A8A" }}
                >
                  {card.label}
                </p>

                {isLoading ? (
                  <div className="h-8 w-16 rounded-lg bg-gray-100 animate-pulse" />
                ) : (
                  <p
                    className="text-2xl font-bold font-heading"
                    style={{
                      color: "#1A1A1A",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {card.format(stats || {})}
                  </p>
                )}

                {!isLoading && (
                  <p className="text-xs mt-1.5" style={{ color: "#8A8A8A" }}>
                    {card.sub(stats || {})}
                  </p>
                )}
              </div>

              <div
                className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(61,107,94,0.07)" }}
              >
                <Icon size={18} style={{ color: accentColor }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
