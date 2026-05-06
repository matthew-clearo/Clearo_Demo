import {
  LayoutDashboard,
  Clock,
  ShieldCheck,
  Wrench,
  Wand2,
  CalendarDays,
  CalendarCheck,
  Users,
  Settings,
  History,
} from "lucide-react";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";

export const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "hours", label: "Weekly Hours", icon: Clock },
  { id: "pricing", label: "Scan Pricing", icon: ShieldCheck },
  { id: "machines", label: "Machines", icon: Wrench },
  { id: "slots", label: "Slot Management", icon: Wand2 },
  { id: "summary", label: "Slot Summary", icon: CalendarDays },
  { id: "team", label: "Team Access", icon: Users },
  { id: "activity", label: "Activity", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ activeTab, onTabChange }) {
  return (
    <nav className="hidden lg:block w-[220px] flex-shrink-0">
      <div
        className="sticky top-8 rounded-[1.25rem] overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.04)",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div className="p-2 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                style={{
                  background: isActive ? "rgba(61,107,94,0.08)" : "transparent",
                  color: isActive ? SAGE : "#6B7280",
                }}
              >
                <Icon
                  size={16}
                  style={{ color: isActive ? SAGE : "#9CA3AF" }}
                  className="flex-shrink-0"
                />
                <span
                  className="text-sm truncate"
                  style={{ fontWeight: isActive ? 600 : 500 }}
                >
                  {tab.label}
                </span>

                {isActive && (
                  <div
                    className="ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ background: SAGE }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function MobileTabBar({ activeTab, onTabChange }) {
  return (
    <div className="lg:hidden -mx-6 px-6 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm transition-all duration-150"
              style={{
                background: isActive ? "rgba(61,107,94,0.10)" : "rgba(0,0,0,0.03)",
                color: isActive ? SAGE : "#6B7280",
                fontWeight: isActive ? 600 : 500,
                border: isActive
                  ? "1px solid rgba(61,107,94,0.25)"
                  : "1px solid rgba(0,0,0,0.04)",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={14} style={{ color: isActive ? SAGE : "#9CA3AF" }} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
