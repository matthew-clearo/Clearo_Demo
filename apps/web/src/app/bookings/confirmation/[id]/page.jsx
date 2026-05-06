"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  MapPin,
  BadgeCheck,
  AlertTriangle,
  FileText,
  Phone,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";
import { DatePicker } from "@/components/ui/DatePicker";
import SiteFooter from "@/components/SiteFooter";
import secureFetch from "@/utils/secureFetch";

export default function BookingConfirmationPage({ params }) {
  const bookingId = params?.id; // Now a UUID instead of sequential integer
  const qc = useQueryClient();

  const [returnDestination, setReturnDestination] = useState({
    href: "/dashboard",
    label: "Back to dashboard",
  });
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [error, setError] = useState(null);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    patient_name: "",
    patient_email: "",
    patient_phone: "",
    patient_dob: "",
    symptoms_reason: "",
    notes: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const returnTo = sp.get("returnTo");

    if (returnTo === "bookings") {
      setReturnDestination({
        href: "/bookings",
        label: "Back to bookings",
      });
      return;
    }

    if (returnTo === "dashboard") {
      setReturnDestination({
        href: "/dashboard",
        label: "Back to dashboard",
      });
      return;
    }

    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin === window.location.origin) {
        if (referrer.pathname === "/bookings") {
          setReturnDestination({
            href: "/bookings",
            label: "Back to bookings",
          });
          return;
        }
        if (referrer.pathname === "/dashboard") {
          setReturnDestination({
            href: "/dashboard",
            label: "Back to dashboard",
          });
        }
      }
    } catch {
      // Ignore referrer parsing issues and keep the default.
    }
  }, []);

  const { data: booking, isLoading, isError, error: bookingError } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) {
        throw new Error(`BOOKING_FETCH_${res.status}`);
      }
      return res.json();
    },
    enabled: Boolean(bookingId),
  });

  useEffect(() => {
    if (!booking) {
      return;
    }

    setDetailsForm({
      patient_name: booking.patient_name || "",
      patient_email: booking.patient_email || "",
      patient_phone: booking.patient_phone || "",
      patient_dob: booking.patient_dob
        ? String(booking.patient_dob).slice(0, 10)
        : "",
      symptoms_reason: booking.symptoms_reason || "",
      notes: booking.notes || "",
    });
    setDetailsSaved(false);
  }, [booking]);

  const clinicPublicId = booking?.clinic_id || "";
  const scanTypePublicId = booking?.scan_type_id || "";
  const slotsEnabled = Boolean(clinicPublicId && scanTypePublicId && rescheduleDate);

  const { data: slotData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", clinicPublicId, scanTypePublicId, rescheduleDate],
    enabled: slotsEnabled,
    queryFn: async () => {
      const q = new URLSearchParams({
        clinicId: clinicPublicId,
        scanTypeId: scanTypePublicId,
        date: rescheduleDate,
      });
      const res = await fetch(`/api/slots/available?${q.toString()}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/slots/available, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
  });

  const slots = useMemo(() => slotData?.slots || [], [slotData]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await secureFetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to cancel booking");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: (err) => {
      console.error(err);
      setError(err.message || "Could not cancel booking");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!selectedSlotId) {
        throw new Error("Pick a new time slot first");
      }
      const res = await secureFetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ new_slot_id: selectedSlotId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || `Reschedule failed: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: async () => {
      setSelectedSlotId(null);
      await qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      await qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      console.error(err);
      setError(err.message || "Could not reschedule booking");
    },
  });

  const detailsMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setDetailsSaved(false);
      const res = await secureFetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify(detailsForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || `Update failed: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: async () => {
      setDetailsSaved(true);
      await qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      await qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      console.error(err);
      setError(err.message || "Could not update booking details");
    },
  });

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((timeStr) => {
    if (!timeStr) return "";
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const isCancelled = booking?.status === "cancelled";

  const prepItems = useMemo(() => {
    const prep = String(booking?.prep_instructions || "").trim();
    if (!prep) {
      return [
        "Arrive 10–15 minutes early.",
        "Bring your referral (printed or on your phone).",
        "Bring Medicare/private insurance details if you have them.",
      ];
    }
    return prep
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [booking?.prep_instructions]);

  const referralLabel =
    booking?.referral_status === "approved"
      ? "Referral approved"
      : booking?.referral_status === "rejected"
        ? "Referral rejected"
        : booking?.referral_status === "pending_review"
          ? "Referral pending review"
          : booking?.referral_status === "uploaded"
            ? "Referral uploaded"
            : "Referral not required";

  const referralTone =
    booking?.referral_status === "approved" ||
      booking?.referral_status === "uploaded" ||
      booking?.referral_status === "not_required"
      ? "text-green-700"
      : booking?.referral_status === "pending_review"
        ? "text-yellow-700"
        : "text-red-700";

  const slotButtons = slots.map((s) => {
    const time = s.slot_time?.slice(0, 5) || "";
    const isSelected = selectedSlotId === s.id;
    const btnClasses = `px-4 py-2 rounded-full border text-sm font-inter transition-all ${isSelected ? "border-[#1A1A1A] text-white" : "border-gray-200 text-gray-900 hover:border-gray-400"}`;
    const btnStyle = isSelected
      ? { backgroundColor: "#1A1A1A" }
      : {};
    return (
      <button
        key={s.id}
        onClick={() => setSelectedSlotId(s.id)}
        className={btnClasses}
        style={btnStyle}
        type="button"
      >
        {time}
      </button>
    );
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-12 pt-8 sm:pt-10 pb-10">
        <SoftHeroBackground />
        <div className="relative max-w-5xl mx-auto">
          <div className="mb-4">
            <a
              href={returnDestination.href}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-white font-inter"
            >
              <span aria-hidden="true">←</span>
              {returnDestination.label}
            </a>
          </div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-heading text-gray-900 mb-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            {booking?.status === "pending"
              ? "Booking pending review"
              : "Booking confirmed"}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-inter">
            {booking?.status === "pending"
              ? "Your booking is awaiting clinic review. You can still view details and prep guidance below."
              : "You’re all set. Below are your details, prep info, and options to reschedule or cancel."}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 pb-12 sm:pb-14">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-4 border-[#3D6B5E] border-t-transparent" />
          </div>
        ) : isError ? (
          <FrostedCard className="p-8 sm:p-10">
            <div className="text-gray-700 font-inter">
              {String(bookingError?.message || "").includes("BOOKING_FETCH_401")
                ? "Please sign in to view your booking details."
                : "Could not load booking details right now."}
            </div>
            {String(bookingError?.message || "").includes("BOOKING_FETCH_401") ? (
              <a
                href={`/account/signin?callbackUrl=${encodeURIComponent(`/bookings/confirmation/${bookingId}`)}`}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-white text-sm font-semibold font-inter transition-all hover:opacity-90"
                style={{ backgroundColor: "#1A1A1A" }}
              >
                Sign in to continue
              </a>
            ) : null}
          </FrostedCard>
        ) : !booking ? (
          <FrostedCard className="p-8 sm:p-10">
            <div className="text-gray-700 font-inter">
              Booking not found.
            </div>
          </FrostedCard>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {error ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-inter">
                {error}
              </div>
            ) : null}

            {isCancelled ? (
              <div className="rounded-2xl border border-red-200/70 bg-red-50/60 p-4 sm:p-5 font-inter flex items-start gap-3">
                <XCircle className="text-red-600" size={20} />
                <div>
                  <div className="font-semibold text-red-800">
                    This booking is cancelled.
                  </div>
                  <div className="text-sm text-red-700/80">
                    You can book a new time from the clinic page.
                  </div>
                </div>
              </div>
            ) : null}

            {booking?.referral_status === "pending_review" ? (
              <div className="rounded-2xl border border-yellow-200/70 bg-yellow-50/70 p-4 sm:p-5 font-inter text-sm text-yellow-800">
                Referral is under review. The clinic will confirm once approved.
              </div>
            ) : null}

            {booking?.referral_status === "rejected" ? (
              <div className="rounded-2xl border border-red-200/70 bg-red-50/70 p-4 sm:p-5 font-inter text-sm text-red-800">
                Referral was rejected. Please contact the clinic to upload an updated referral.
              </div>
            ) : null}

            <FrostedCard className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="text-[#3D6B5E]" size={18} />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 font-inter">
                      {booking.scan_name}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-600 font-inter mt-1">
                    {booking.clinic_name}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold font-inter ${referralTone}`}
                >
                  <FileText className="inline-block mr-1" size={16} />
                  {referralLabel}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar size={16} className="text-[#3D6B5E]" />
                  <span className="font-inter">
                    {formatDate(booking.appointment_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock size={16} className="text-[#3D6B5E]" />
                  <span className="font-inter">
                    {formatTime(booking.appointment_time)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin size={16} className="text-[#3D6B5E] mt-0.5" />
                  <span className="font-inter">
                    {booking.clinic_address}, {booking.clinic_city}
                  </span>
                </div>
                {booking.clinic_phone ? (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone size={16} className="text-[#3D6B5E]" />
                    <a
                      className="font-inter hover:underline"
                      href={`tel:${booking.clinic_phone}`}
                    >
                      {booking.clinic_phone}
                    </a>
                  </div>
                ) : null}
              </div>

              {booking.symptoms_reason ? (
                <div className="mt-4 rounded-2xl border border-gray-200/70 bg-white/50 p-4">
                  <div className="text-xs text-gray-500 font-inter mb-1">
                    Reason / symptoms
                  </div>
                  <div className="text-sm text-gray-900 font-inter">
                    {booking.symptoms_reason}
                  </div>
                </div>
              ) : null}
            </FrostedCard>

            <FrostedCard className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 font-inter">
                    Patient details
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 font-inter">
                    Update your contact details, symptoms, and notes for this booking.
                  </p>
                </div>
                {detailsSaved ? (
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3D6B5E] font-inter">
                    Saved
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 font-inter">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={detailsForm.patient_name}
                    onChange={(e) => {
                      setDetailsSaved(false);
                      setDetailsForm((prev) => ({
                        ...prev,
                        patient_name: e.target.value,
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 font-inter">
                    Email
                  </label>
                  <input
                    type="email"
                    value={detailsForm.patient_email}
                    onChange={(e) => {
                      setDetailsSaved(false);
                      setDetailsForm((prev) => ({
                        ...prev,
                        patient_email: e.target.value,
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 font-inter">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={detailsForm.patient_phone}
                    onChange={(e) => {
                      setDetailsSaved(false);
                      setDetailsForm((prev) => ({
                        ...prev,
                        patient_phone: e.target.value,
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 font-inter">
                    Date of birth
                  </label>
                  <DatePicker
                    value={detailsForm.patient_dob}
                    onChange={(e) => {
                      setDetailsSaved(false);
                      setDetailsForm((prev) => ({
                        ...prev,
                        patient_dob: e.target.value,
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter flex items-center justify-between text-left"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600 font-inter">
                    Reason / symptoms
                  </label>
                  <textarea
                    value={detailsForm.symptoms_reason}
                    onChange={(e) => {
                      setDetailsSaved(false);
                      setDetailsForm((prev) => ({
                        ...prev,
                        symptoms_reason: e.target.value,
                      }));
                    }}
                    rows={3}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600 font-inter">
                    Notes for the clinic
                  </label>
                  <textarea
                    value={detailsForm.notes}
                    onChange={(e) => {
                      setDetailsSaved(false);
                      setDetailsForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }));
                    }}
                    rows={3}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => detailsMutation.mutate()}
                  disabled={detailsMutation.isPending}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 font-inter"
                  style={{ backgroundColor: "#1A1A1A" }}
                >
                  {detailsMutation.isPending ? "Saving..." : "Save details"}
                </button>
              </div>
            </FrostedCard>

            <FrostedCard className="p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 font-inter">
                Prep instructions
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 font-inter">
                {prepItems.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#3D6B5E]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-gray-200/70 bg-white/50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <div className="text-sm text-gray-700 font-inter">
                    If you indicated implants/pregnancy/claustrophobia, the
                    clinic may contact you to confirm safety steps.
                  </div>
                </div>
              </div>
            </FrostedCard>

            <FrostedCard className="p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 font-inter">
                Manage booking
              </h3>
              <p className="text-sm text-gray-600 font-inter mt-1">
                You can cancel or pick a new time. Changes update instantly.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isCancelled || cancelMutation.isPending}
                  onClick={() => {
                    if (isCancelled) return;
                    const ok = window.confirm("Cancel this booking?");
                    if (ok) cancelMutation.mutate();
                  }}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-inter text-sm sm:text-base disabled:opacity-50"
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                </button>

                <button
                  type="button"
                  disabled={
                    isCancelled ||
                    rescheduleMutation.isPending ||
                    !selectedSlotId
                  }
                  onClick={() => rescheduleMutation.mutate()}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-white font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 font-inter text-sm sm:text-base"
                  style={{ backgroundColor: "#1A1A1A" }}
                >
                  {rescheduleMutation.isPending
                    ? "Rescheduling..."
                    : "Confirm new time"}
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200/70 bg-white/50 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-700 font-inter">
                  <RefreshCcw size={16} className="text-[#3D6B5E]" />
                  <span>Reschedule</span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 font-inter mb-1">
                      New date
                    </label>
                    <DatePicker
                      disabledPast={true}
                      value={rescheduleDate}
                      onChange={(e) => {
                        setRescheduleDate(e.target.value);
                        setSelectedSlotId(null);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter text-sm flex items-center justify-between text-left h-[42px]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 font-inter mb-1">
                      New time
                    </label>
                    {slotsLoading ? (
                      <div className="text-sm text-gray-600 font-inter">
                        Loading slots...
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">{slotButtons}</div>
                    )}
                  </div>
                </div>
              </div>


            </FrostedCard>

            <div className="text-center">
              <a
                href="/bookings"
                className="inline-block text-sm text-[#3D6B5E] hover:underline font-inter"
              >
                View all bookings
              </a>
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
