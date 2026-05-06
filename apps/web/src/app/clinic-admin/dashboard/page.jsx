"use client";

import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import useClinicUser from "@/hooks/useClinicUser";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import { toDbTimeValue } from "@/utils/dateHelpers";
import {
  useClinics,
  useClinicDetails,
  useSlotSummary,
  useCalendarData,
  useClinicBookings,
} from "@/hooks/useClinicAdminData";
import {
  useSaveHours,
  useSavePricing,
  useToggleMachine,
  useGenerateSlots,
  useBlockRange,
  useReviewReferral,
  useOverrideSafety,
} from "@/hooks/useClinicAdminMutations";
import {
  useHoursDraft,
  usePricingDraft,
  useSlotRange,
  useBlockRange as useBlockRangeState,
  useUpcomingBookings,
  useScanTypeOptions,
} from "@/hooks/useClinicAdminState";
import ClinicPortalShell from "@/components/ClinicPortalShell";
import { WeeklyHours } from "@/components/ClinicAdminDashboard/WeeklyHours";
import { ScanPricing } from "@/components/ClinicAdminDashboard/ScanPricing";
import { MachinesList } from "@/components/ClinicAdminDashboard/MachinesList";
import { GenerateSlots } from "@/components/ClinicAdminDashboard/GenerateSlots";
import { BlockRange } from "@/components/ClinicAdminDashboard/BlockRange";
import { SlotSummary } from "@/components/ClinicAdminDashboard/SlotSummary";
import { UpcomingBookings } from "@/components/ClinicAdminDashboard/UpcomingBookings";
import { QuickStats } from "@/components/ClinicAdminDashboard/QuickStats";
import { BookingCalendar } from "@/components/ClinicAdminDashboard/BookingCalendar";
import { TeamManagement } from "@/components/ClinicAdminDashboard/TeamManagement";
import { SecuritySettings } from "@/components/ClinicAdminDashboard/SecuritySettings";
import { AuditActivity } from "@/components/ClinicAdminDashboard/AuditActivity";
import { ClinicStatusPanel } from "@/components/ClinicAdminDashboard/ClinicStatusPanel";
import {
  LoadingState,
  NotSignedInState,
  ClinicsErrorState,
  NoClinicsState,
  ClinicErrorState,
} from "@/components/ClinicAdminDashboard/EmptyStates";

export default function ClinicAdminDashboardPage() {
  const { data: clinicAuthData, isLoading: loading } = useClinicUser();
  const [selectedClinicId, setSelectedClinicId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const clinicUser = clinicAuthData?.user || null;
  const clinicMfaRequired = clinicAuthData?.mfa_required === true;
  const clinicMfaEligible = clinicAuthData?.mfa_eligible === true;
  const clinicMfaEnabled = clinicAuthData?.mfa_enabled === true;
  const clinicMfaVerified = clinicAuthData?.mfa_verified === true;
  const clinicMfaPending = clinicMfaRequired && !clinicMfaVerified;

  useEffect(() => {
    if (loading) return;
    if (!clinicUser || !clinicMfaPending) return;
    window.location.replace(getClinicLocalHref("/clinic-admin/mfa-challenge"));
  }, [clinicMfaPending, clinicUser, loading]);

  const {
    data: clinicsData,
    isLoading: clinicsLoading,
    error: clinicsError,
  } = useClinics(clinicMfaPending ? null : clinicUser);

  const clinics = clinicsData?.clinics || [];
  const selectedClinicRole =
    clinics.find((entry) => String(entry.id) === String(selectedClinicId))
      ?.membership_role || null;

  useEffect(() => {
    if (selectedClinicId) return;
    if (clinics.length > 0) setSelectedClinicId(String(clinics[0].id));
  }, [clinics, selectedClinicId]);

  const {
    data: clinicData,
    isLoading: clinicLoading,
    error: clinicError,
    refetch: refetchClinic,
  } = useClinicDetails(selectedClinicId);

  const clinic = clinicData?.clinic || null;
  const hoursFromApi = clinicData?.hours || [];
  const machinesFromApi = clinicData?.machines || [];
  const scanPricingFromApi = clinicData?.scanPricing || [];

  const [hoursDraft, setHoursDraft] = useHoursDraft(
    hoursFromApi,
    selectedClinicId,
  );
  const [pricingDraft, setPricingDraft] = usePricingDraft(
    scanPricingFromApi,
    selectedClinicId,
  );
  const [slotRange, setSlotRange] = useSlotRange();
  const [blockRange, setBlockRange] = useBlockRangeState();

  const saveHoursMutation = useSaveHours(selectedClinicId);
  const savePricingMutation = useSavePricing(selectedClinicId);
  const toggleMachineMutation = useToggleMachine(selectedClinicId);
  const generateSlotsMutation = useGenerateSlots(selectedClinicId, slotRange);
  const blockRangeMutation = useBlockRange(selectedClinicId, slotRange);
  const reviewReferralMutation = useReviewReferral(selectedClinicId);
  const overrideSafetyMutation = useOverrideSafety(selectedClinicId);

  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useSlotSummary(selectedClinicId, slotRange);

  const slotSummary = summaryData?.summary || [];

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const {
    data: calendarData,
    isLoading: calendarLoading,
    error: calendarError,
  } = useCalendarData(selectedClinicId, currentMonth);

  const calendarStats = calendarData?.stats || {};

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useClinicBookings(selectedClinicId);

  const clinicBookings = bookingsData?.bookings || [];
  const upcomingBookings = useUpcomingBookings(clinicBookings);
  const scanTypeOptions = useScanTypeOptions(machinesFromApi);

  const pageState =
    loading || clinicMfaPending || clinicsLoading || clinicLoading ? "loading" : "ready";

  // Wrap mutations to include clinicId in payload
  const wrappedSaveHours = {
    ...saveHoursMutation,
    mutate: (payload) =>
      saveHoursMutation.mutate({ ...payload, clinicId: selectedClinicId }),
  };

  const wrappedSavePricing = {
    ...savePricingMutation,
    mutate: (payload) =>
      savePricingMutation.mutate({ ...payload, clinicId: selectedClinicId }),
  };

  function renderTabContent() {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <QuickStats
              stats={calendarStats}
              isLoading={calendarLoading}
            />
            <BookingCalendar
              calendarData={calendarData}
              calendarLoading={calendarLoading}
              calendarError={calendarError}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              dayBookings={clinicBookings}
            />
          </div>
        );

      case "bookings":
        return (
          <UpcomingBookings
            upcomingBookings={upcomingBookings}
            bookingsLoading={bookingsLoading}
            bookingsError={bookingsError}
            refetchBookings={refetchBookings}
            reviewReferralMutation={reviewReferralMutation}
            overrideSafetyMutation={overrideSafetyMutation}
          />
        );

      case "hours":
        return (
          <WeeklyHours
            hoursDraft={hoursDraft}
            setHoursDraft={setHoursDraft}
            saveHoursMutation={wrappedSaveHours}
          />
        );

      case "pricing":
        return (
          <ScanPricing
            pricingDraft={pricingDraft}
            setPricingDraft={setPricingDraft}
            savePricingMutation={wrappedSavePricing}
          />
        );

      case "machines":
        return (
          <MachinesList
            machinesFromApi={machinesFromApi}
            toggleMachineMutation={toggleMachineMutation}
          />
        );

      case "slots":
        return (
          <div className="space-y-6">
            <GenerateSlots
              slotRange={slotRange}
              setSlotRange={setSlotRange}
              generateSlotsMutation={generateSlotsMutation}
              selectedClinicId={selectedClinicId}
            />
            <BlockRange
              blockRange={blockRange}
              setBlockRange={setBlockRange}
              blockRangeMutation={blockRangeMutation}
              scanTypeOptions={scanTypeOptions}
            />
          </div>
        );

      case "summary":
        return (
          <SlotSummary
            slotSummary={slotSummary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            refetchSummary={refetchSummary}
          />
        );

      case "team":
        return (
          <TeamManagement
            selectedClinicId={selectedClinicId}
            actorRole={selectedClinicRole}
            currentClinicUserId={clinicUser?.id}
          />
        );

      case "settings":
        return (
          <SecuritySettings
            clinicUser={clinicUser}
            mfaEligible={clinicMfaEligible}
            mfaEnabled={clinicMfaEnabled}
            mfaVerified={clinicMfaVerified}
          />
        );

      case "activity":
        return (
          <AuditActivity
            selectedClinicId={selectedClinicId}
            actorRole={selectedClinicRole}
          />
        );

      default:
        return null;
    }
  }

  return (
    <ClinicPortalShell
      clinic={clinic}
      clinics={clinics}
      selectedClinicId={selectedClinicId}
      setSelectedClinicId={setSelectedClinicId}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      refetchClinic={refetchClinic}
      refetchSummary={refetchSummary}
      refetchBookings={refetchBookings}
    >
      <Toaster richColors position="top-right" />

      {pageState === "loading" ? (
        <LoadingState />
      ) : !clinicUser ? (
        <NotSignedInState />
      ) : clinicsError ? (
        <ClinicsErrorState error={clinicsError} />
      ) : clinics.length === 0 ? (
        <NoClinicsState />
      ) : clinicError ? (
        <ClinicErrorState error={clinicError} />
      ) : (
        <div className="space-y-6">
          {clinic ? <ClinicStatusPanel clinic={clinic} /> : null}
          {renderTabContent()}
        </div>
      )}
    </ClinicPortalShell>
  );
}
