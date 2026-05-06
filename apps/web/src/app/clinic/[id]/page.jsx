"use client";

import { useEffect, useRef } from "react";
import { useLoaderData } from "react-router";
import { useQuery } from "@tanstack/react-query";
import SiteFooter from "@/components/SiteFooter";
import SeoHead from "@/components/SeoHead";
import { useClinicBooking } from "@/hooks/useClinicBooking";
import { usePatientProfile } from "@/hooks/usePatientProfile";
import { useClinicSlots } from "@/hooks/useClinicSlots";
import { ClinicHero } from "@/components/ClinicDetail/ClinicHero";
import { ClinicInfo } from "@/components/ClinicDetail/ClinicInfo";
import { AvailableScans } from "@/components/ClinicDetail/AvailableScans";
import { QuickInfo } from "@/components/ClinicDetail/QuickInfo";
import { BookingModal } from "@/components/BookingModal/BookingModal";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";
import { buildMedicalBusinessSchema } from "@/utils/jsonLd";

export async function loader({ request, params }) {
  return loadSeoData(request, {
    path: "/clinic/[id]",
    resolvedPath: `/clinic/${params.id}`,
    entityId: params.id,
  });
}

export default function ClinicDetailPage({ params }) {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo(`/clinic/${params.id}`);
  const breadcrumbJsonLd = loaderData?.breadcrumbJsonLd || loaderData?.jsonLd;
  const booking = useClinicBooking();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["clinic", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/clinics/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch clinic");
      return response.json();
    },
  });

  // NEW: allow deep-linking into booking with a preselected slot
  const appliedFromUrl = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!clinic) return;
    if (appliedFromUrl.current) return;

    const sp = new URLSearchParams(window.location.search);
    const openBooking = sp.get("openBooking");
    const scanTypeIdParam = sp.get("scanTypeId");
    const dateParam = sp.get("date");
    const slotIdParam = sp.get("slotId");

    const shouldOpen = openBooking === "1" || Boolean(slotIdParam);

    if (!shouldOpen) {
      appliedFromUrl.current = true;
      return;
    }

    const scanTypeIdNum = scanTypeIdParam ? Number(scanTypeIdParam) : null;
    const slotIdNum = slotIdParam ? Number(slotIdParam) : null;

    // Find the scan by scan_type_id (clinic.scans are clinic_scans rows)
    const scanMatch = scanTypeIdParam
      ? clinic?.scans?.find(
          (s) => String(s?.scan_type_id) === String(scanTypeIdParam),
        )
      : null;

    // Use handleBooking() to reset the wizard cleanly, then apply the selection
    if (scanMatch) {
      booking.handleBooking(scanMatch);
    } else {
      booking.setShowBookingForm(true);
      booking.setStep(1);
    }

    if (typeof dateParam === "string" && dateParam) {
      booking.setSelectedDate(dateParam);
    }

    if (slotIdParam) {
      booking.setSelectedSlotId(String(slotIdParam));
    }

    // If they already picked a time, jump to step 2 (auth gate will trigger from step 1)
    if (scanMatch && dateParam && slotIdParam) {
      booking.setStep(2);
    }

    appliedFromUrl.current = true;

    // Optional: clean the URL so refresh doesn't re-trigger
    try {
      const cleanUrl = `/clinic/${params.id}`;
      window.history.replaceState({}, "", cleanUrl);
    } catch {
      // ignore
    }
  }, [clinic, params.id, booking]);

  usePatientProfile(booking.currentUser, {
    setPatientName: booking.setPatientName,
    setPatientEmail: booking.setPatientEmail,
    setPatientPhone: booking.setPatientPhone,
    setPatientDob: booking.setPatientDob,
    setSymptomsReason: booking.setSymptomsReason,
    setSafety: booking.setSafety,
  });

  const { slots, slotsLoading, slotsEnabled } = useClinicSlots(
    clinic,
    booking.selectedScan,
    booking.selectedDate,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <SeoHead seo={seo} jsonLd={breadcrumbJsonLd} />
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3D6B5E] border-t-transparent" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600 font-inter">
          Clinic not found
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      <SeoHead seo={seo} jsonLd={[breadcrumbJsonLd, buildMedicalBusinessSchema(clinic, seo.origin)]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
        <ClinicHero clinic={clinic} />

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <ClinicInfo clinic={clinic} />
            <AvailableScans
              scans={clinic.scans}
              onBook={booking.handleBooking}
            />
          </div>

          {/* Sidebar - Quick Info - appears below main content on mobile */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <QuickInfo clinic={clinic} />
          </div>
        </div>
      </div>

      <BookingModal
        showBookingForm={booking.showBookingForm}
        setShowBookingForm={booking.setShowBookingForm}
        selectedScan={booking.selectedScan}
        step={booking.step}
        setStep={booking.setStep}
        error={booking.error}
        setError={booking.setError}
        canGoNext={booking.canGoNext}
        submitBooking={booking.submitBooking}
        submitManualReviewRequest={booking.submitManualReviewRequest}
        bookingMutation={booking.bookingMutation}
        clinic={clinic}
        params={params}
        selectedDate={booking.selectedDate}
        setSelectedDate={booking.setSelectedDate}
        selectedSlotId={booking.selectedSlotId}
        setSelectedSlotId={booking.setSelectedSlotId}
        slots={slots}
        slotsLoading={slotsLoading}
        slotsEnabled={slotsEnabled}
        currentUser={booking.currentUser}
        userLoading={booking.userLoading}
        patientName={booking.patientName}
        setPatientName={booking.setPatientName}
        patientDob={booking.patientDob}
        setPatientDob={booking.setPatientDob}
        patientEmail={booking.patientEmail}
        setPatientEmail={booking.setPatientEmail}
        patientPhone={booking.patientPhone}
        setPatientPhone={booking.setPatientPhone}
        symptomsReason={booking.symptomsReason}
        setSymptomsReason={booking.setSymptomsReason}
        uploadLoading={booking.uploadLoading}
        referralUrl={booking.referralUrl}
        referralFileName={booking.referralFileName}
        setReferralFileName={booking.setReferralFileName}
        uploadReferral={booking.uploadReferral}
        referralMissing={booking.referralMissing}
        setReferralMissing={booking.setReferralMissing}
        setReferralUrl={booking.setReferralUrl}
        safety={booking.safety}
        setSafety={booking.setSafety}
        notes={booking.notes}
        setNotes={booking.setNotes}
        consent={booking.consent}
        setConsent={booking.setConsent}
        blockedSafetyReasons={booking.blockedSafetyReasons}
      />

      <SiteFooter />
    </div>
  );
}
