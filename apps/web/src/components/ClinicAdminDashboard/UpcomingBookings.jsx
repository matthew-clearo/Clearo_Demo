import { CalendarDays } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE, SAGE_2 } from "@/app/clinic-admin/dashboard/constants";

export function UpcomingBookings({
  upcomingBookings,
  bookingsLoading,
  bookingsError,
  refetchBookings,
  reviewReferralMutation,
  overrideSafetyMutation,
}) {
  const getOrdinalDay = (value) => {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return `${value}st`;
    if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
    return `${value}th`;
  };

  const formatDate = (value) => {
    if (!value) return "Date pending";
    const safeValue = String(value).slice(0, 10);
    const parsed = new Date(`${safeValue}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(value);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const compareDate = new Date(parsed);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return "Today";
    }

    if (compareDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }

    return `${parsed.toLocaleDateString("en-AU", {
      weekday: "long",
    })}, the ${getOrdinalDay(parsed.getDate())} of ${parsed.toLocaleDateString(
      "en-AU",
      { month: "long", year: "numeric" },
    )}`;
  };

  const formatTime = (value) => {
    if (!value) return "Time pending";
    const parsed = new Date(`2000-01-01T${String(value)}`);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 5);
    return parsed.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDob = (value) => {
    if (!value) return null;
    const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return String(value).slice(0, 10);
    }
    return `${parsed.toLocaleDateString("en-AU", {
      weekday: "long",
    })}, the ${getOrdinalDay(parsed.getDate())} of ${parsed.toLocaleDateString(
      "en-AU",
      { month: "long", year: "numeric" },
    )}`;
  };

  return (
    <FrostedCard className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} style={{ color: SAGE_2 }} />
          <h3 className="text-lg font-bold text-gray-900">
            Upcoming bookings
          </h3>
        </div>
        <button
          type="button"
          onClick={() => refetchBookings()}
          className="text-sm font-semibold hover:opacity-80"
          style={{ color: SAGE_2 }}
        >
          Refresh
        </button>
      </div>

      {bookingsLoading ? (
        <div className="mt-4 text-gray-700">
          Loading bookings…
        </div>
      ) : bookingsError ? (
        <div className="mt-4 text-red-700">
          {bookingsError?.message || "Could not load bookings."}
        </div>
      ) : upcomingBookings.length === 0 ? (
        <div className="mt-4 text-gray-700">
          No upcoming bookings.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {upcomingBookings.slice(0, 10).map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-gray-200/70 bg-white/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    {b.patient_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {b.scan_type_name || "Scan"}
                  </div>
                </div>
                <div
                  className="text-xs px-2 py-1 rounded-full border"
                  style={{
                    borderColor: "rgba(61, 107, 94, 0.35)",
                    background: "rgba(61, 107, 94, 0.10)",
                    color: SAGE,
                  }}
                >
                  {b.status}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Appointment
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {formatDate(b.appointment_date)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatTime(b.appointment_time)}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Booking #{b.id}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Patient
                  </div>
                  <div className="mt-2 text-sm text-gray-900">
                    {b.patient_email || "Email unavailable"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {b.patient_phone || "Phone unavailable"}
                  </div>
                  {b.patient_dob ? (
                    <div className="mt-2 text-xs text-gray-500">
                      DOB: {formatDob(b.patient_dob)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Referral: {b.referral_status || "not_required"}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Safety review: {b.safety_review_status || "cleared"}
              </div>

              {b.symptoms_reason ? (
                <div className="mt-3 rounded-2xl border border-gray-200/70 bg-white/80 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Reason for scan
                  </div>
                  <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {b.symptoms_reason}
                  </div>
                </div>
              ) : null}

              {b.notes ? (
                <div className="mt-3 rounded-2xl border border-gray-200/70 bg-white/80 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Patient notes
                  </div>
                  <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {b.notes}
                  </div>
                </div>
              ) : null}

              {Array.isArray(b.safety_block_reasons) && b.safety_block_reasons.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-yellow-800">
                    Safety flags
                  </div>
                  <div className="mt-2 text-sm text-yellow-900">
                    {b.safety_block_reasons.join(", ")}
                  </div>
                </div>
              ) : null}

              {b.referral_url && b.referral_url !== "[TOKENIZED]" ? (
                <div className="mt-3">
                  <a
                    href={b.referral_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold hover:underline"
                    style={{ color: SAGE_2 }}
                  >
                    Open referral document
                  </a>
                </div>
              ) : null}

              {b.referral_status === "pending_review" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={reviewReferralMutation?.isPending}
                    onClick={() =>
                      reviewReferralMutation?.mutate({
                        bookingId: b.id,
                        referral_status: "approved",
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{
                      borderColor: "rgba(34, 197, 94, 0.35)",
                      background: "rgba(34, 197, 94, 0.1)",
                      color: "#166534",
                    }}
                  >
                    Approve referral
                  </button>
                  <button
                    type="button"
                    disabled={reviewReferralMutation?.isPending}
                    onClick={() =>
                      reviewReferralMutation?.mutate({
                        bookingId: b.id,
                        referral_status: "rejected",
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{
                      borderColor: "rgba(239, 68, 68, 0.35)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#991B1B",
                    }}
                  >
                    Reject referral
                  </button>
                </div>
              ) : null}

              {b.safety_review_status === "blocked" ? (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={overrideSafetyMutation?.isPending}
                    onClick={() =>
                      overrideSafetyMutation?.mutate({
                        bookingId: b.id,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{
                      borderColor: "rgba(59, 130, 246, 0.35)",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "#1D4ED8",
                    }}
                  >
                    Override safety block
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          {upcomingBookings.length > 10 ? (
            <div className="text-xs text-gray-500">
              Showing 10 of {upcomingBookings.length} upcoming bookings.
            </div>
          ) : null}
        </div>
      )}
    </FrostedCard>
  );
}
