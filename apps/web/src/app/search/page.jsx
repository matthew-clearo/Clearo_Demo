"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLoaderData } from "react-router";
import useUser from "@/utils/useUser";
import { useQuery } from "@tanstack/react-query";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import { useSearchData } from "@/hooks/useSearchData";
import { useClinicsAvailability } from "@/hooks/useClinicsAvailability";
import { useClinicBooking } from "@/hooks/useClinicBooking";
import { usePatientProfile } from "@/hooks/usePatientProfile";
import { useClinicSlots } from "@/hooks/useClinicSlots";
import AuthGateModal from "@/components/AuthGateModal";
import { BookingModal } from "@/components/BookingModal/BookingModal";
import { DesktopLayout } from "@/components/SearchPage/DesktopLayout";
import { MobileLayout } from "@/components/SearchPage/MobileLayout";
import SeoHead from "@/components/SeoHead";
import SiteFooter from "@/components/SiteFooter";
import { getFallbackSeo, loadSeoData } from "@/app/utils/loadSeo";

export async function loader({ request }) {
  return loadSeoData(request, { path: "/search" });
}

export default function SearchPage() {
  const loaderData = useLoaderData();
  const seo = loaderData?.seo || getFallbackSeo("/search");
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'map'

  // Accordion: which clinic is expanded in results
  const [expandedClinicId, setExpandedClinicId] = useState(null);

  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: -37.8136, lng: 144.9631 });
  const [mapZoom, setMapZoom] = useState(11);
  const [userInteractedWithMap, setUserInteractedWithMap] = useState(false);

  // Auth gating when selecting a specific time slot
  const { data: currentUser, loading: userLoading } = useUser();
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [continueUrl, setContinueUrl] = useState("/");

  // Booking-in-place (no navigation) state
  const booking = useClinicBooking();
  const [bookingClinicId, setBookingClinicId] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [openingBooking, setOpeningBooking] = useState(false);
  const appliedFromUrl = useRef(false);
  const appliedPendingSelection = useRef(false);

  // Fetch Google Maps config from backend
  const { data: mapsConfig } = useQuery({
    queryKey: ["mapsConfig"],
    queryFn: async () => {
      const response = await fetch("/api/maps/config");
      if (!response.ok) return { apiKey: null, mapId: null };
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    searchTerm,
    setSearchTerm,
    selectedScanType,
    setSelectedScanType,
    selectedCity,
    priceRange,
    setPriceRange,
    selectedDate,
    setSelectedDate,
    initialScanTypeParam,
    setInitialScanTypeParam,
    clearFilters,
    hasActiveFilters,
  } = useSearchFilters();

  const { scanTypes, clinics, isLoading, isClinicsError } = useSearchData(
    searchTerm,
    selectedScanType,
    selectedCity,
    priceRange,
    selectedDate,
  );

  // upcoming availability used by clinic cards (preview)
  const {
    byClinic: availabilityByClinic,
    isLoading: availabilityLoading,
    isError: availabilityError,
  } = useClinicsAvailability({
    clinics,
    selectedScanType,
    startDate: selectedDate,
    days: 10,
  });

  const buildContinueUrl = useCallback(
    ({ clinicId, scanTypeId, date, slotId }) => {
      const q = new URLSearchParams();
      q.set("openBooking", "1");
      q.set("bookClinicId", String(clinicId));
      q.set("scanTypeId", String(scanTypeId));
      q.set("date", String(date));
      q.set("slotId", String(slotId));
      return `/search?${q.toString()}`;
    },
    [],
  );

  const handlePickSlot = useCallback(
    ({ clinicId, scanTypeId, date, slotId }) => {
      const nextUrl = buildContinueUrl({ clinicId, scanTypeId, date, slotId });

      if (userLoading) {
        return;
      }

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
    [buildContinueUrl, currentUser, userLoading],
  );

  // Fetch full clinic details (including scans) for the booking panel/modal
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

  useEffect(() => {
    if (!isBookingClinicError) return;
    console.error("Could not open booking clinic", bookingClinicError);
    setOpeningBooking(false);
    setPendingSelection(null);
    setBookingClinicId(null);
  }, [isBookingClinicError, bookingClinicError]);

  // If we arrived from auth with booking params, restore the booking modal/panel in-place
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

    if (userLoading) {
      return;
    }

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
      window.history.replaceState({}, "", "/search");
    } catch {
      // ignore
    }

    appliedFromUrl.current = true;
  }, [currentUser, userLoading]);

  // Apply the pre-selected scan/date/slot once clinic detail is loaded
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
  }, [pendingSelection, bookingClinic]);

  // Prefill booking form from patient profile
  usePatientProfile(booking.currentUser, {
    setPatientName: booking.setPatientName,
    setPatientEmail: booking.setPatientEmail,
    setPatientPhone: booking.setPatientPhone,
    setPatientDob: booking.setPatientDob,
    setSymptomsReason: booking.setSymptomsReason,
    setSafety: booking.setSafety,
  });

  const { slots, slotsLoading, slotsEnabled } = useClinicSlots(
    bookingClinic,
    booking.selectedScan,
    booking.selectedDate,
  );

  // Auto-center map on clinics when they load or change
  useEffect(() => {
    if (userInteractedWithMap) return;
    if (!clinics || clinics.length === 0) return;

    const clinicsWithLocation = clinics.filter(
      (c) => c.latitude && c.longitude,
    );
    if (clinicsWithLocation.length === 0) return;

    const topClinic = clinicsWithLocation[0];
    setMapCenter({
      lat: Number(topClinic.latitude),
      lng: Number(topClinic.longitude),
    });
    setMapZoom(13);
  }, [clinics, userInteractedWithMap]);

  // Once scan types are loaded, map any scanType in the URL (id or name) to the filter state
  useEffect(() => {
    if (!initialScanTypeParam || !scanTypes.length) return;

    let match = scanTypes.find(
      (type) => String(type.id) === String(initialScanTypeParam),
    );

    if (!match) {
      match = scanTypes.find(
        (type) =>
          type.name &&
          type.name.toLowerCase() === initialScanTypeParam.toLowerCase(),
      );
    }

    if (match) {
      setSelectedScanType(String(match.id));
    }

    setInitialScanTypeParam("");
  }, [
    initialScanTypeParam,
    scanTypes,
    setSelectedScanType,
    setInitialScanTypeParam,
  ]);

  const apiKey = mapsConfig?.apiKey || null;
  const mapId = mapsConfig?.mapId || null;

  const handleClinicClick = useCallback(
    (clinic) => {
      if (!clinic?.id) return;
      setExpandedClinicId(clinic.id);
      setViewMode("list");

      if (!userInteractedWithMap) {
        setUserInteractedWithMap(true);
      }
    },
    [userInteractedWithMap],
  );

  // Handle clinic card click - center map and select
  const handleClinicCardClick = (clinic) => {
    if (clinic.latitude && clinic.longitude) {
      setMapCenter({
        lat: Number(clinic.latitude),
        lng: Number(clinic.longitude),
      });
      setMapZoom(14);
    }
    handleClinicClick(clinic);
  };

  const recenterMap = () => {
    setUserInteractedWithMap(false);
  };

  // When the booking modal/panel closes, clear selection state
  useEffect(() => {
    if (!booking.showBookingForm) {
      setPendingSelection(null);
      setBookingClinicId(null);
      setOpeningBooking(false);
      appliedPendingSelection.current = false;
    } else {
      setOpeningBooking(false);
    }
  }, [booking.showBookingForm]);

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
      submitManualReviewRequest: booking.submitManualReviewRequest,
      notes: booking.notes,
      setNotes: booking.setNotes,
      consent: booking.consent,
      setConsent: booking.setConsent,
      blockedSafetyReasons: booking.blockedSafetyReasons,
    }),
    [booking, bookingClinic, bookingParams, slots, slotsLoading, slotsEnabled],
  );

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLocationChange = async (value) => {
    setSearchTerm(value);
    setSelectedCity("");
    try {
      const response = await fetch(
        `/api/locations?search=${encodeURIComponent(value)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setShowSuggestions(false);
    }
  };

  const selectLocation = (loc) => {
    setSearchTerm(loc.name);
    setSelectedCity(loc.name);
    setShowSuggestions(false);
    if (loc) {
      setUserInteractedWithMap(false);
    }
  };

  const resultsCount = clinics?.length || 0;
  const embeddedBookingPanel = (
    <BookingModal {...bookingProps} layout="embedded" />
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBF8F3] pb-16 md:pb-0">
      <SeoHead seo={seo} />
      {isMobile ? (
        <MobileLayout
          searchTerm={searchTerm}
          handleLocationChange={handleLocationChange}
          locationSuggestions={locationSuggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          selectLocation={selectLocation}
          scanTypes={scanTypes}
          selectedScanType={selectedScanType}
          setSelectedScanType={setSelectedScanType}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          clinics={clinics}
          isLoading={isLoading}
          isClinicsError={isClinicsError}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          viewMode={viewMode}
          setViewMode={setViewMode}
          resultsCount={resultsCount}
          apiKey={apiKey}
          mapId={mapId}
          onClinicClick={handleClinicCardClick}
          expandedClinicId={expandedClinicId}
          setExpandedClinicId={setExpandedClinicId}
          availabilityByClinic={availabilityByClinic}
          availabilityLoading={availabilityLoading}
          availabilityError={availabilityError}
          selectedScanTypeForAvailability={selectedScanType}
          onPickSlot={handlePickSlot}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          setUserInteractedWithMap={setUserInteractedWithMap}
          userInteractedWithMap={userInteractedWithMap}
          recenterMap={recenterMap}
        />
      ) : (
        <DesktopLayout
          searchTerm={searchTerm}
          handleLocationChange={handleLocationChange}
          locationSuggestions={locationSuggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          selectLocation={selectLocation}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          scanTypes={scanTypes}
          selectedScanType={selectedScanType}
          setSelectedScanType={setSelectedScanType}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          resultsCount={resultsCount}
          clinics={clinics}
          isLoading={isLoading}
          isClinicsError={isClinicsError}
          apiKey={apiKey}
          mapId={mapId}
          onClinicClick={handleClinicCardClick}
          expandedClinicId={expandedClinicId}
          setExpandedClinicId={setExpandedClinicId}
          availabilityByClinic={availabilityByClinic}
          availabilityLoading={availabilityLoading}
          availabilityError={availabilityError}
          selectedScanTypeForAvailability={selectedScanType}
          onPickSlot={handlePickSlot}
          bookingOpen={booking.showBookingForm}
          bookingPanel={embeddedBookingPanel}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          userInteractedWithMap={userInteractedWithMap}
          setUserInteractedWithMap={setUserInteractedWithMap}
          recenterMap={recenterMap}
        />
      )}

      <AuthGateModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        continueUrl={continueUrl}
      />

      {isMobile ? <BookingModal {...bookingProps} layout="modal" /> : null}

      {/* Lightweight "opening booking" overlay */}
      {openingBooking ? (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <div className="px-4 py-3 rounded-2xl bg-white/90 border border-gray-200 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
              <div className="text-sm text-gray-700 font-inter">
                Opening booking…
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SiteFooter />
    </div>
  );
}
