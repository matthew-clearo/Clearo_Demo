"use client";

import { useEffect, useState } from "react";
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
  Menu,
  X,
  LogOut,
  Building2,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";

const SAGE = "#3D6B5E";

const TABS = [
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

function NavItem({ tab, isActive, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
        isActive ? "text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
      }`}
      style={isActive ? { backgroundColor: SAGE } : undefined}
    >
      <Icon
        size={17}
        style={{ color: isActive ? "white" : "#9CA3AF" }}
        className="flex-shrink-0"
      />
      <span
        className="text-sm font-inter truncate"
        style={{ fontWeight: isActive ? 600 : 500 }}
      >
        {tab.label}
      </span>
    </button>
  );
}

export default function ClinicPortalShell({
  children,
  clinic,
  clinics,
  selectedClinicId,
  setSelectedClinicId,
  activeTab,
  onTabChange,
  refetchClinic,
  refetchSummary,
  refetchBookings,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = clinic?.name
      ? `${clinic.name} — Clearo Clinic Portal`
      : "Clearo Clinic Portal";
  }, [clinic?.name]);

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

  function handleRefresh() {
    refetchClinic?.();
    refetchSummary?.();
    refetchBookings?.();
    toast("Refreshing…");
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200/80">
      {/* Logo + branding */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[6px] flex items-center justify-center"
            style={{ backgroundColor: SAGE }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="10.5" cy="10.5" r="6" stroke="white" strokeWidth="2.5" />
              <line x1="15" y1="15" x2="20" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900 font-inter tracking-tight">
            Clinic Portal
          </span>
        </div>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            type="button"
            className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X size={18} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Clinic selector */}
      {clinics && clinics.length > 1 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <select
            value={selectedClinicId || ""}
            onChange={(e) => setSelectedClinicId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm font-inter font-semibold appearance-none cursor-pointer bg-gray-50 border border-gray-200 text-gray-900"
          >
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clinic info badge */}
      {clinic && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(61,107,94,0.07)",
                border: "1px solid rgba(61,107,94,0.12)",
              }}
            >
              <Building2 size={16} style={{ color: SAGE }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 font-inter truncate">
                {clinic.name}
              </p>
              <p className="text-xs text-gray-500 font-inter">
                {clinic.approval_status === "approved" ? "Approved" : "Pending"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p
          className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase font-inter"
          style={{ color: "#9CA3AF" }}
        >
          Navigation
        </p>
        {TABS.map((tab) => (
          <NavItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => {
              onTabChange(tab.id);
              setSidebarOpen(false);
            }}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-inter font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
        <span className="block text-[10px] font-inter px-3" style={{ color: "rgba(0,0,0,0.25)" }}>
          &copy; {new Date().getFullYear()} Clearo
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[280px] z-50 lg:hidden shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60 px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <Menu size={20} className="text-gray-700" />
              </button>
              <p
                className="text-xs font-semibold uppercase tracking-[0.15em] hidden sm:block"
                style={{ color: SAGE }}
              >
                {clinic?.name || "Clinic Dashboard"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3 py-1.5 rounded-full font-inter font-semibold text-xs transition-all duration-150 inline-flex items-center gap-1.5"
                style={{
                  color: "#6B7280",
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <RefreshCcw size={12} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
