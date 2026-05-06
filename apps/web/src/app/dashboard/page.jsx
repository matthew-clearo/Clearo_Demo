"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import ClinicAdminDashboardPage from "@/app/clinic-admin/dashboard/page";
import SiteFooter from "@/components/SiteFooter";
import secureFetch from "@/utils/secureFetch";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  CalendarCheck,
  Clock,
  MapPin,
  DollarSign,
  User,
  Search,
  History,
  RefreshCcw,
  Settings2,
  Shield,
} from "lucide-react";
import { isClinicHost } from "@/utils/clinicPortal";
import {
  buildPatientProfilePayload,
  getPatientProfilePrefill,
  usePatientProfileQuery,
  useSavePatientProfile,
} from "@/hooks/usePatientProfile";

const SAGE = "#3D6B5E";

function getOrdinalDay(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function getNaturalDateLabel(dateValue, timeValue) {
  const dateOnly = String(dateValue || "").slice(0, 10);
  if (!dateOnly) {
    return "Date pending";
  }

  const date = new Date(`${dateOnly}T12:00:00`);
  const slotDateTime = timeValue
    ? new Date(`${dateOnly}T${String(timeValue).slice(0, 8)}`)
    : null;

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  let dayLabel;
  if (compareDate.getTime() === today.getTime()) {
    dayLabel = "Today";
  } else if (compareDate.getTime() === tomorrow.getTime()) {
    dayLabel = "Tomorrow";
  } else {
    dayLabel = `${date.toLocaleDateString("en-AU", {
      weekday: "long",
    })}, the ${getOrdinalDay(date.getDate())} of ${date.toLocaleDateString(
      "en-AU",
      { month: "long" },
    )}`;
  }

  if (!slotDateTime || Number.isNaN(slotDateTime.getTime())) {
    return dayLabel;
  }

  const timeLabel = slotDateTime.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dayLabel} at ${timeLabel}`;
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-[1.25rem] bg-white ${className}`}
      style={{
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </div>
  );
}

export default function PatientDashboardPage() {
  if (isClinicHost()) {
    return <ClinicAdminDashboardPage />;
  }

  const { data: user, loading } = useUser();
  const [activeTab, setActiveTab] = useState("bookings");

  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [symptomsReason, setSymptomsReason] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await secureFetch("/api/user/delete-account", {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.error ||
          `When deleting your account, the response was [${response.status}] ${response.statusText}`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error) => {
      window.alert(error.message || "Could not delete account");
    },
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        throw new Error(
          `Failed to load profile: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!user,
  });

  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?mine=1");
      if (!res.ok) {
        throw new Error(
          `Failed to load bookings: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!user,
  });

  const { data: patientProfile, isLoading: profileLoading } =
    usePatientProfileQuery(user);

  useEffect(() => {
    if (!user) return;

    const defaults = getPatientProfilePrefill({
      currentUser: user,
      patientProfile,
    });

    setFullName((value) => (value ? value : defaults.fullName));
    setEmail((value) => (value ? value : defaults.email));
    setPhone((value) => (value ? value : defaults.phone));
    setDob((value) => (value ? value : defaults.dob));
    setSymptomsReason((value) => (value ? value : defaults.symptomsReason));
  }, [user, patientProfile]);

  const saveProfileMutation = useSavePatientProfile({
    additionalInvalidations: [["profile"]],
    onSuccess: async () => {
      setProfileError(null);
      setProfileSuccess(true);
    },
    onError: (error) => {
      setProfileSuccess(null);
      setProfileError(error?.message || "Could not update your profile");
    },
  });

  const onSubmitProfile = useCallback(
    (event) => {
      event.preventDefault();
      setProfileError(null);
      setProfileSuccess(null);

      if (!fullName || !dob || !phone || !email) {
        setProfileError("Please fill in all required fields.");
        return;
      }

      saveProfileMutation.mutate(
        buildPatientProfilePayload({
          fullName,
          dob,
          phone,
          email,
          symptomsReason,
        }),
      );
    },
    [fullName, dob, phone, email, symptomsReason, saveProfileMutation],
  );

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const groups = { upcoming: [], past: [] };

    for (const booking of bookings) {
      const dt = new Date(
        `${booking.appointment_date}T${booking.appointment_time}`,
      );
      if (Number.isNaN(dt.getTime())) {
        groups.upcoming.push(booking);
        continue;
      }
      if (dt >= now) {
        groups.upcoming.push(booking);
      } else {
        groups.past.push(booking);
      }
    }

    const sortAsc = (a, b) =>
      new Date(`${a.appointment_date}T${a.appointment_time}`) -
      new Date(`${b.appointment_date}T${b.appointment_time}`);
    const sortDesc = (a, b) =>
      new Date(`${b.appointment_date}T${b.appointment_time}`) -
      new Date(`${a.appointment_date}T${a.appointment_time}`);

    return {
      upcoming: groups.upcoming.sort(sortAsc),
      past: groups.past.sort(sortDesc),
    };
  }, [bookings]);

  const navItems = [
    {
      id: "bookings",
      label: "Bookings",
      icon: CalendarCheck,
      description: "Upcoming and past appointments",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Patient details and defaults",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings2,
      description: "Privacy and account actions",
    },
  ];

  const topButtonStyle = {
    color: "#6B7280",
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.06)",
  };

  const inputClass =
    "w-full px-4 py-3 rounded-[1.25rem] text-sm font-inter transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]/40";
  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "#1A1A1A",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      <section
        className="relative overflow-hidden px-6 lg:px-12 pt-10 pb-8"
        style={{
          background:
            "linear-gradient(135deg, #FBF8F3 0%, #FFFFFF 40%, #FBF8F3 100%)",
        }}
      >
        <div
          className="absolute -top-20 -right-20 h-72 w-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(61,107,94,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(61,107,94,0.04) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: SAGE }}
            >
              My Dashboard
            </p>

            <div className="flex items-center gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 font-inter"
                  style={topButtonStyle}
                >
                  <RefreshCcw size={12} />
                  Refresh
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: "rgba(61,107,94,0.07)",
                border: "1px solid rgba(61,107,94,0.12)",
              }}
            >
              <CalendarCheck size={22} style={{ color: SAGE }} />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                {user
                  ? `Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`
                  : "My Dashboard"}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "#8A8A8A" }}>
                Your bookings, profile, and settings all live in one place.
              </p>
            </div>
          </div>

          {user && !isLoading && !error ? (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  background: "rgba(61,107,94,0.07)",
                  border: "1px solid rgba(61,107,94,0.12)",
                }}
              >
                <CalendarCheck size={14} style={{ color: SAGE }} />
                <span className="text-sm font-semibold" style={{ color: SAGE }}>
                  {upcoming.length}
                </span>
                <span className="text-sm" style={{ color: "#8A8A8A" }}>
                  upcoming
                </span>
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <History size={14} style={{ color: "#9CA3AF" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#6B7280" }}
                >
                  {past.length}
                </span>
                <span className="text-sm" style={{ color: "#8A8A8A" }}>
                  past
                </span>
              </div>
            </div>
          ) : null}

          <div
            className="mt-7 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(61,107,94,0.12) 50%, transparent 100%)",
            }}
          />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-14 font-inter lg:px-12">
        {loading ? (
          <div className="mt-2 space-y-4">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-[1.25rem] bg-white"
                style={{
                  border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              />
            ))}
          </div>
        ) : !user ? (
          <Panel className="mt-2 p-8 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "rgba(61,107,94,0.07)" }}
            >
              <User size={22} style={{ color: SAGE }} />
            </div>
            <p
              className="text-lg font-heading font-semibold"
              style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
            >
              Sign in to view your dashboard
            </p>
            <p className="mb-5 mt-2 text-sm" style={{ color: "#8A8A8A" }}>
              Access your bookings, manage appointments, and update your profile.
            </p>
            <a
              href="/account/signin?callbackUrl=%2Fdashboard"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] font-inter"
              style={{
                backgroundColor: "#1A1A1A",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              Sign in
            </a>
          </Panel>
        ) : (
          <div className="mt-2 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside>
              <Panel className="p-3">
                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                        style={
                          isActive
                            ? {
                              background: "rgba(61,107,94,0.08)",
                              border: "1px solid rgba(61,107,94,0.14)",
                            }
                            : {
                              background: "transparent",
                              border: "1px solid transparent",
                            }
                        }
                      >
                        <div
                          className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                          style={{
                            background: isActive
                              ? "rgba(61,107,94,0.14)"
                              : "rgba(0,0,0,0.03)",
                          }}
                        >
                          <Icon
                            size={16}
                            style={{ color: isActive ? SAGE : "#6B7280" }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold"
                            style={{ color: isActive ? "#1A1A1A" : "#374151" }}
                          >
                            {item.label}
                          </div>
                          <div className="mt-0.5 text-xs" style={{ color: "#8A8A8A" }}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </Panel>
            </aside>

            <section className="min-w-0">
              {activeTab === "profile" ? (
                <div className="space-y-5">
                  <Panel className="p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ background: "rgba(61,107,94,0.07)" }}
                      >
                        <User size={15} style={{ color: SAGE }} />
                      </div>
                      <h2
                        className="text-lg font-heading font-semibold"
                        style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                      >
                        Patient details
                      </h2>
                    </div>

                    {profileLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className="h-12 animate-pulse rounded-[1.25rem] bg-gray-50"
                          />
                        ))}
                      </div>
                    ) : (
                      <form onSubmit={onSubmitProfile} className="space-y-4">
                        <div>
                          <label
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em]"
                            style={{ color: "#8A8A8A" }}
                          >
                            Full name *
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            className={inputClass}
                            style={inputStyle}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em]"
                              style={{ color: "#8A8A8A" }}
                            >
                              Date of birth *
                            </label>
                            <DatePicker
                              required
                              value={dob}
                              onChange={(event) => setDob(event.target.value)}
                              className={inputClass + " flex items-center justify-between text-left h-[46px]"}
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label
                              className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em]"
                              style={{ color: "#8A8A8A" }}
                            >
                              Phone *
                            </label>
                            <input
                              type="tel"
                              required
                              value={phone}
                              onChange={(event) => setPhone(event.target.value)}
                              className={inputClass}
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em]"
                            style={{ color: "#8A8A8A" }}
                          >
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className={inputClass}
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em]"
                            style={{ color: "#8A8A8A" }}
                          >
                            Symptoms / reason for scan
                            <span className="ml-1 normal-case font-normal tracking-normal">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            rows={3}
                            value={symptomsReason}
                            onChange={(event) =>
                              setSymptomsReason(event.target.value)
                            }
                            className={inputClass}
                            style={inputStyle}
                          />
                        </div>

                        {profileError ? (
                          <div
                            className="rounded-[1.25rem] p-4 text-sm"
                            style={{
                              background: "rgba(239,68,68,0.05)",
                              border: "1px solid rgba(239,68,68,0.15)",
                              color: "#B91C1C",
                            }}
                          >
                            {profileError}
                          </div>
                        ) : null}

                        {profileSuccess ? (
                          <div
                            className="rounded-[1.25rem] p-4 text-sm"
                            style={{
                              background: "rgba(61,107,94,0.05)",
                              border: "1px solid rgba(61,107,94,0.15)",
                              color: SAGE,
                            }}
                          >
                            Profile saved successfully.
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          disabled={saveProfileMutation.isPending}
                          className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 font-inter"
                          style={{
                            backgroundColor: "#1A1A1A",
                            boxShadow:
                              "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          {saveProfileMutation.isPending
                            ? "Saving..."
                            : "Save changes"}
                        </button>
                      </form>
                    )}
                  </Panel>

                  <Panel className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: "rgba(61,107,94,0.07)" }}
                      >
                        <Shield size={18} style={{ color: SAGE }} />
                      </div>
                      <div>
                        <h3
                          className="text-base font-heading font-semibold"
                          style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                        >
                          Privacy
                        </h3>
                        <p className="mt-1 text-sm" style={{ color: "#8A8A8A" }}>
                          Your saved details are used to make booking faster and to keep clinic records accurate.
                        </p>
                      </div>
                    </div>
                  </Panel>
                </div>
              ) : activeTab === "settings" ? (
                <div className="space-y-5">
                  <Panel className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ background: "rgba(61,107,94,0.07)" }}
                      >
                        <Settings2 size={15} style={{ color: SAGE }} />
                      </div>
                      <h2
                        className="text-lg font-heading font-semibold"
                        style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                      >
                        Settings
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div
                        className="rounded-[1.25rem] p-5"
                        style={{
                          background: "rgba(61,107,94,0.03)",
                          border: "1px solid rgba(61,107,94,0.08)",
                        }}
                      >
                        <h3 className="text-base font-semibold text-gray-900">
                          Profile settings
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                          Manage your saved patient details from the Profile tab.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab("profile")}
                          className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 font-inter"
                          style={{ backgroundColor: "#1A1A1A" }}
                        >
                          Go to profile
                        </button>
                      </div>

                      <div
                        className="rounded-[1.25rem] p-5"
                        style={{
                          background: "rgba(239,68,68,0.03)",
                          border: "1px solid rgba(239,68,68,0.10)",
                        }}
                      >
                        <h3 className="text-base font-semibold text-gray-900">
                          Delete account
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                          This permanently deletes your account access, patient
                          profile, uploaded referral files, and stored PHI.
                          Existing bookings may be kept only in de-identified
                          form, and audit logs retained without your direct
                          user reference where required.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              "Delete your account? Your patient profile, uploaded referral files, and stored PHI will be removed. " +
                                "Existing bookings may be retained only in de-identified form, and audit logs kept without your direct user reference where required. " +
                                "This cannot be undone.",
                            );
                            if (confirmed) {
                              deleteAccountMutation.mutate();
                            }
                          }}
                          disabled={deleteAccountMutation.isPending}
                          className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 font-inter"
                          style={{
                            color: "#B91C1C",
                            background: "rgba(239,68,68,0.07)",
                            border: "1px solid rgba(239,68,68,0.14)",
                          }}
                        >
                          {deleteAccountMutation.isPending
                            ? "Deleting..."
                            : "Delete account and data"}
                        </button>
                      </div>
                    </div>
                  </Panel>
                </div>
              ) : (
                <div className="space-y-10">
                  <section>
                    <div className="mb-5 flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ background: "rgba(61,107,94,0.07)" }}
                      >
                        <CalendarCheck size={15} style={{ color: SAGE }} />
                      </div>
                      <h2
                        className="text-lg font-heading font-semibold"
                        style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                      >
                        Upcoming bookings
                      </h2>
                    </div>

                    {isLoading ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {[1, 2].map((item) => (
                          <div
                            key={item}
                            className="h-44 animate-pulse rounded-[1.25rem] bg-white"
                            style={{
                              border: "1px solid rgba(0,0,0,0.04)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            }}
                          />
                        ))}
                      </div>
                    ) : error ? (
                      <div
                        className="rounded-[1.25rem] p-5 text-sm"
                        style={{
                          background: "rgba(239,68,68,0.05)",
                          border: "1px solid rgba(239,68,68,0.15)",
                          color: "#B91C1C",
                        }}
                      >
                        {error?.message || "Could not load bookings."}
                      </div>
                    ) : upcoming.length === 0 ? (
                      <Panel className="p-8 text-center">
                        <div
                          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                          style={{ background: "rgba(61,107,94,0.07)" }}
                        >
                          <Search size={18} style={{ color: SAGE }} />
                        </div>
                        <p className="font-semibold" style={{ color: "#1A1A1A" }}>
                          No upcoming bookings
                        </p>
                        <p className="mb-4 mt-1 text-sm" style={{ color: "#8A8A8A" }}>
                          When you book an appointment, it will show up here.
                        </p>
                        <a
                          href="/search"
                          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] font-inter"
                          style={{
                            backgroundColor: "#1A1A1A",
                            boxShadow:
                              "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Search size={14} />
                          Find a clinic
                        </a>
                      </Panel>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {upcoming.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            variant="upcoming"
                            returnTo="dashboard"
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-5 flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ background: "rgba(0,0,0,0.03)" }}
                      >
                        <History size={15} style={{ color: "#9CA3AF" }} />
                      </div>
                      <h2
                        className="text-lg font-heading font-semibold"
                        style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                      >
                        Past bookings
                      </h2>
                    </div>

                    {past.length === 0 ? (
                      <Panel className="p-6 text-center">
                        <p className="text-sm" style={{ color: "#8A8A8A" }}>
                          No past bookings yet.
                        </p>
                      </Panel>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {past.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            variant="past"
                            returnTo="dashboard"
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function BookingCard({ booking, variant = "upcoming", returnTo = "dashboard" }) {
  const isPast = variant === "past";
  const naturalDate = getNaturalDateLabel(
    booking.appointment_date,
    booking.appointment_time,
  );

  const statusStyles = {
    confirmed: {
      bg: "rgba(61,107,94,0.10)",
      border: "1px solid rgba(61,107,94,0.25)",
      color: SAGE,
    },
    pending: {
      bg: "rgba(251,191,36,0.10)",
      border: "1px solid rgba(251,191,36,0.25)",
      color: "#B45309",
    },
    cancelled: {
      bg: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.20)",
      color: "#B91C1C",
    },
  };
  const style = statusStyles[booking.status] || statusStyles.pending;

  return (
    <Panel className="group relative p-5 transition-all duration-200 hover:shadow-md">
      {!isPast ? (
        <div
          className="absolute left-0 right-0 top-0 h-[3px] rounded-t-[1.25rem]"
          style={{
            background: `linear-gradient(90deg, ${SAGE}, ${SAGE}88)`,
          }}
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-base font-heading font-semibold"
            style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
          >
            {booking.clinic_name || "Imaging Center"}
          </h3>
          <p className="mt-0.5 text-sm" style={{ color: "#8A8A8A" }}>
            {booking.scan_name || "Scan"}
          </p>
        </div>

        <span
          className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: style.bg,
            border: style.border,
            color: style.color,
          }}
        >
          {booking.status || "pending"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: "#6B7280" }}
        >
          <Clock size={13} style={{ color: "#B0B0B0" }} />
          {naturalDate}
        </span>
        {booking.total_price ? (
          <span
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: "#6B7280" }}
          >
            <DollarSign size={13} style={{ color: "#B0B0B0" }} />
            {Number(booking.total_price).toFixed(2)}
          </span>
        ) : null}
      </div>

      {booking.clinic_city ? (
        <span
          className="mt-1.5 inline-flex items-center gap-1.5 text-sm"
          style={{ color: "#8A8A8A" }}
        >
          <MapPin size={12} style={{ color: "#B0B0B0" }} />
          {booking.clinic_city}
        </span>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={`/bookings/confirmation/${booking.id}?returnTo=${returnTo}`}
          className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] font-inter"
          style={{
            backgroundColor: SAGE,
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(61,107,94,0.15)",
          }}
        >
          {isPast ? "View details" : "Manage booking"}
        </a>
        <a
          href={`/clinic/${booking.clinic_id}`}
          className="rounded-full px-4 py-2 text-sm font-semibold transition-all font-inter"
          style={{
            color: "#6B7280",
            background: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          View clinic
        </a>
        {!isPast ? (
          <a
            href="/search"
            className="rounded-full px-4 py-2 text-sm font-semibold transition-all font-inter"
            style={{
              color: "#6B7280",
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            Book another
          </a>
        ) : null}
      </div>
    </Panel>
  );
}
