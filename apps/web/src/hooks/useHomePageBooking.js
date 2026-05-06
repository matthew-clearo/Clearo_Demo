import { useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClinicBooking } from "@/hooks/useClinicBooking";
import { usePatientProfile } from "@/hooks/usePatientProfile";
import { useClinicSlots } from "@/hooks/useClinicSlots";
import useUser from "@/utils/useUser";

export function useHomePageBooking({
  bookingClinicId,
  setBookingClinicId,
  pendingSelection,
  setPendingSelection,
  setOpeningBooking,
  appliedPendingSelection,
  appliedFromUrl,
  setAuthGateOpen,
  setContinueUrl,
}) {
  const { data: currentUser, loading: userLoading } = useUser();
  const booking = useClinicBooking();

  // Build continue URL for auth gate
  const buildContinueUrl = useCallback(
    ({ clinicId, scanTypeId, date, slotId }) => {
      const q = new URLSearchParams();
      q.set("openBooking", "1");
      q.set("bookClinicId", String(clinicId));
      q.set("scanTypeId", String(scanTypeId));
      q.set("date", String(date));
      q.set("slotId", String(slotId));
      return `/?${q.toString()}`;
    },
    [],
  );

  // Handle slot selection
  const handlePickSlot = useCallback(
    ({ clinicId, scanTypeId, date, slotId }) => {
      const nextUrl = buildContinueUrl({ clinicId, scanTypeId, date, slotId });

      if (userLoading) return;

      if (!currentUser) {
        setContinueUrl(nextUrl);
        setAuthGateOpen(true);
        setOpeningBooking(false);
        return;
      }

      appliedPendingSelection.current = false;
      setOpeningBooking(true);
      setPendingSelection({
        clinicId: String(clinicId),
        scanTypeId: String(scanTypeId),
        date: String(date).slice(0, 10),
        slotId: String(slotId),
      });
      setBookingClinicId(String(clinicId));
    },
    [
      buildContinueUrl,
      currentUser,
      userLoading,
      setContinueUrl,
      setAuthGateOpen,
      setOpeningBooking,
      setPendingSelection,
      setBookingClinicId,
      appliedPendingSelection,
    ],
  );

  // Fetch booking clinic details
  const {
    data: bookingClinic,
    isError: isBookingClinicError,
    error: bookingClinicError,
  } = useQuery({
    queryKey: ["clinic", "for-booking", bookingClinicId],
    enabled: Boolean(bookingClinicId),
    queryFn: async () => {
      const response = await fetch(`/api/clinics/${bookingClinicId}`);
      if (!response.ok) {
        throw new Error(
          `When fetching /api/clinics/${bookingClinicId}, the response was [${response.status}] ${response.statusText}`,
        );
      }
      return response.json();
    },
  });

  // Handle booking clinic error
  useEffect(() => {
    if (!isBookingClinicError) return;
    console.error("Could not open booking clinic", bookingClinicError);
    setOpeningBooking(false);
    setPendingSelection(null);
    setBookingClinicId(null);
  }, [
    isBookingClinicError,
    bookingClinicError,
    setOpeningBooking,
    setPendingSelection,
    setBookingClinicId,
  ]);

  // Apply pending selection to booking form
  useEffect(() => {
    if (!pendingSelection) return;
    if (!bookingClinic) return;
    if (appliedPendingSelection.current) return;

    const scanTypeId = pendingSelection.scanTypeId;
    const scanMatch = scanTypeId
      ? bookingClinic?.scans?.find(
          (s) => String(s?.scan_type_id) === String(scanTypeId),
        )
      : null;

    if (!scanMatch) {
      console.error(
        "No matching scan for booking selection",
        pendingSelection,
        bookingClinic,
      );
      setOpeningBooking(false);
      return;
    }

    booking.handleBooking(scanMatch);

    if (pendingSelection.date) {
      booking.setSelectedDate(pendingSelection.date);
    }

    if (pendingSelection.slotId) {
      booking.setSelectedSlotId(String(pendingSelection.slotId));
    }

    booking.setStep(2);

    appliedPendingSelection.current = true;
    setPendingSelection(null);
    setOpeningBooking(false);
  }, [
    pendingSelection,
    bookingClinic,
    booking,
    setOpeningBooking,
    setPendingSelection,
    appliedPendingSelection,
  ]);

  // Auto-fill patient profile
  usePatientProfile(booking.currentUser, {
    setPatientName: booking.setPatientName,
    setPatientEmail: booking.setPatientEmail,
    setPatientPhone: booking.setPatientPhone,
    setPatientDob: booking.setPatientDob,
    setSymptomsReason: booking.setSymptomsReason,
    setSafety: booking.setSafety,
  });

  // Get slots for booking
  const { slots, slotsLoading, slotsEnabled } = useClinicSlots(
    bookingClinic,
    booking.selectedScan,
    booking.selectedDate,
  );

  // Restore from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appliedFromUrl.current) return;

    const sp = new URLSearchParams(window.location.search);
    const openBooking = sp.get("openBooking");
    const clinicIdParam = sp.get("bookClinicId");
    const scanTypeIdParam = sp.get("scanTypeId");
    const dateParam = sp.get("date");
    const slotIdParam = sp.get("slotId");

    const shouldApply = openBooking === "1" && clinicIdParam && slotIdParam;
    if (!shouldApply) {
      appliedFromUrl.current = true;
      return;
    }

    if (userLoading) return;

    if (!currentUser) {
      setContinueUrl(window.location.pathname + window.location.search);
      setAuthGateOpen(true);
      appliedFromUrl.current = true;
      return;
    }

    setPendingSelection({
      clinicId: String(clinicIdParam),
      scanTypeId: scanTypeIdParam ? String(scanTypeIdParam) : null,
      date: String(dateParam || "").slice(0, 10),
      slotId: String(slotIdParam),
    });
    setBookingClinicId(String(clinicIdParam));

    try {
      window.history.replaceState({}, "", "/");
    } catch {
      // ignore
    }

    appliedFromUrl.current = true;
  }, [
    currentUser,
    userLoading,
    setContinueUrl,
    setAuthGateOpen,
    setPendingSelection,
    setBookingClinicId,
    appliedFromUrl,
  ]);

  // Reset when booking form closes
  useEffect(() => {
    if (!booking.showBookingForm) {
      setPendingSelection(null);
      setBookingClinicId(null);
      setOpeningBooking(false);
      appliedPendingSelection.current = false;
    } else {
      setOpeningBooking(false);
    }
  }, [
    booking.showBookingForm,
    setPendingSelection,
    setBookingClinicId,
    setOpeningBooking,
    appliedPendingSelection,
  ]);

  // Build booking props
  const bookingParams = bookingClinicId
    ? { id: String(bookingClinicId) }
    : null;

  const bookingProps = useMemo(
    () => ({
      showBookingForm: booking.showBookingForm,
      setShowBookingForm: booking.setShowBookingForm,
      selectedScan: booking.selectedScan,
      step: booking.step,
      setStep: booking.setStep,
      error: booking.error,
      setError: booking.setError,
      canGoNext: booking.canGoNext,
      submitBooking: booking.submitBooking,
      submitManualReviewRequest: booking.submitManualReviewRequest,
      bookingMutation: booking.bookingMutation,
      clinic: bookingClinic,
      params: bookingParams,
      selectedDate: booking.selectedDate,
      setSelectedDate: booking.setSelectedDate,
      selectedSlotId: booking.selectedSlotId,
      setSelectedSlotId: booking.setSelectedSlotId,
      slots,
      slotsLoading,
      slotsEnabled,
      currentUser: booking.currentUser,
      userLoading: booking.userLoading,
      patientName: booking.patientName,
      setPatientName: booking.setPatientName,
      patientDob: booking.patientDob,
      setPatientDob: booking.setPatientDob,
      patientEmail: booking.patientEmail,
      setPatientEmail: booking.setPatientEmail,
      patientPhone: booking.patientPhone,
      setPatientPhone: booking.setPatientPhone,
      symptomsReason: booking.symptomsReason,
      setSymptomsReason: booking.setSymptomsReason,
      uploadLoading: booking.uploadLoading,
      referralUrl: booking.referralUrl,
      referralFileName: booking.referralFileName,
      setReferralFileName: booking.setReferralFileName,
      uploadReferral: booking.uploadReferral,
      referralMissing: booking.referralMissing,
      setReferralMissing: booking.setReferralMissing,
      setReferralUrl: booking.setReferralUrl,
      safety: booking.safety,
      setSafety: booking.setSafety,
      notes: booking.notes,
      setNotes: booking.setNotes,
      consent: booking.consent,
      setConsent: booking.setConsent,
      blockedSafetyReasons: booking.blockedSafetyReasons,
    }),
    [booking, bookingClinic, bookingParams, slots, slotsLoading, slotsEnabled],
  );

  return {
    handlePickSlot,
    bookingProps,
  };
}
