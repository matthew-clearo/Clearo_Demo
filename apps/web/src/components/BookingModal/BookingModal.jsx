import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import AuthGateModal from "@/components/AuthGateModal";
import { DateTimeStep } from "./DateTimeStep";
import { PatientDetailsStep } from "./PatientDetailsStep";
import { ReferralUploadStep } from "./ReferralUploadStep";
import { SafetyQuestionsStep } from "./SafetyQuestionsStep";
import { ReviewStep } from "./ReviewStep";
import { evaluateSafetyAnswers } from "@/utils/bookingSafety";

export function BookingModal({
  showBookingForm,
  setShowBookingForm,
  selectedScan,
  step,
  setStep,
  error,
  setError,
  canGoNext,
  submitBooking,
  submitManualReviewRequest,
  bookingMutation,
  clinic,
  params,
  layout = "modal", // "modal" | "embedded"
  // Step 1 props
  selectedDate,
  setSelectedDate,
  selectedSlotId,
  setSelectedSlotId,
  slots,
  slotsLoading,
  slotsEnabled,
  // Step 2 props
  currentUser,
  userLoading,
  patientName,
  setPatientName,
  patientDob,
  setPatientDob,
  patientEmail,
  setPatientEmail,
  patientPhone,
  setPatientPhone,
  symptomsReason,
  setSymptomsReason,
  // Step 3 props
  uploadLoading,
  referralUrl,
  referralFileName,
  setReferralFileName,
  uploadReferral,
  referralMissing,
  setReferralMissing,
  setReferralUrl,
  // Step 4 props
  safety,
  setSafety,
  // Step 5 props
  notes,
  setNotes,
  consent,
  setConsent,
  blockedSafetyReasons,
}) {
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const safeSlots = Array.isArray(slots) ? slots : [];
  const formId =
    layout === "embedded" ? "embedded-booking-form" : "booking-modal-form";
  const stepLabels = [
    "Choose a time",
    "Patient details",
    "Referral",
    "Safety",
    "Review",
  ];
  const progressPercent = (step / stepLabels.length) * 100;
  const selectedTime =
    safeSlots.find((slot) => slot.id === selectedSlotId)?.slot_time?.slice(0, 5) ||
    "";
  const formattedPrice = Number.isFinite(Number(selectedScan?.price))
    ? `$${Math.round(Number(selectedScan.price))}`
    : null;

  const continueUrl = useMemo(() => {
    const clinicId = clinic?.id || params?.id;
    if (!clinicId) return "/";

    // Only include the selected slot details when we have them
    if (!selectedScan?.scan_type_id || !selectedDate || !selectedSlotId) {
      return `/clinic/${clinicId}`;
    }

    const q = new URLSearchParams();
    q.set("openBooking", "1");
    q.set("scanTypeId", String(selectedScan.scan_type_id));
    q.set("date", String(selectedDate));
    q.set("slotId", String(selectedSlotId));
    return `/clinic/${clinicId}?${q.toString()}`;
  }, [
    clinic?.id,
    params?.id,
    selectedScan?.scan_type_id,
    selectedDate,
    selectedSlotId,
  ]);

  if (!showBookingForm) return null;

  const stepTitle =
    `${step}/${stepLabels.length} ${stepLabels[step - 1]}`;

  const chrome = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-heading text-gray-900">
            {clinic?.name || "Your booking"}
          </h3>
          <p className="mt-1 text-sm text-gray-600 font-inter">
            {selectedScan?.scan_name || "Choose a scan"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBookingForm(false)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-[#FBF8F3] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900 font-inter">
            {stepTitle}
          </div>
          <div className="text-xs text-gray-500 font-inter">
            Step {step} of {stepLabels.length}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: "#3D6B5E",
            }}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Scan
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900 font-inter">
              {selectedScan?.scan_name || "Not selected"}
            </div>
          </div>
          <div className="rounded-2xl border border-white bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Appointment
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900 font-inter">
              {selectedDate || "Choose a date"}
            </div>
            <div className="text-xs text-gray-500 font-inter">
              {selectedTime || "Time pending"}
            </div>
          </div>
          <div className="rounded-2xl border border-white bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Estimate
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900 font-inter">
              {formattedPrice || "Shown on review"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <form
          id={formId}
          onSubmit={(e) => submitBooking(e, clinic)}
          className="space-y-5"
        >
          {step === 1 && (
            <DateTimeStep
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedSlotId={selectedSlotId}
              setSelectedSlotId={setSelectedSlotId}
              slots={safeSlots}
              slotsLoading={slotsLoading}
              slotsEnabled={slotsEnabled}
            />
          )}

          {step === 2 && (
            <PatientDetailsStep
              currentUser={currentUser}
              userLoading={userLoading}
              params={params}
              patientName={patientName}
              setPatientName={setPatientName}
              patientDob={patientDob}
              setPatientDob={setPatientDob}
              patientEmail={patientEmail}
              setPatientEmail={setPatientEmail}
              patientPhone={patientPhone}
              setPatientPhone={setPatientPhone}
              symptomsReason={symptomsReason}
              setSymptomsReason={setSymptomsReason}
            />
          )}

          {step === 3 && (
            <ReferralUploadStep
              uploadLoading={uploadLoading}
              referralUrl={referralUrl}
              referralFileName={referralFileName}
              setReferralFileName={setReferralFileName}
              uploadReferral={uploadReferral}
              referralMissing={referralMissing}
              setReferralMissing={setReferralMissing}
              setReferralUrl={setReferralUrl}
              requiresReferral={Boolean(selectedScan?.requires_referral)}
            />
          )}

          {step === 4 && (
            <SafetyQuestionsStep
              safety={safety}
              setSafety={setSafety}
              selectedScan={selectedScan}
            />
          )}

          {step === 5 && (
            <ReviewStep
              selectedDate={selectedDate}
              selectedSlotId={selectedSlotId}
              slots={safeSlots}
              patientName={patientName}
              patientDob={patientDob}
              patientEmail={patientEmail}
              patientPhone={patientPhone}
              symptomsReason={symptomsReason}
              referralUrl={referralUrl}
              referralMissing={referralMissing}
              clinic={clinic}
              selectedScan={selectedScan}
              notes={notes}
              setNotes={setNotes}
              consent={consent}
              setConsent={setConsent}
            />
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-inter">
              {error}
              {step === 4 && blockedSafetyReasons?.length > 0 ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => submitManualReviewRequest(clinic)}
                    disabled={bookingMutation.isPending}
                    className="px-3 py-2 rounded-lg border border-red-300 text-sm font-semibold hover:opacity-90"
                  >
                    {bookingMutation.isPending
                      ? "Requesting..."
                      : "Request manual clinical review"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </form>
      </div>

      <div className="mt-5 border-t border-gray-200 bg-white/95 pt-4 sm:pt-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                setShowBookingForm(false);
                return;
              }
              setError(null);
              setStep((s) => Math.max(1, s - 1));
            }}
            className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-all hover:bg-gray-50 sm:px-6 sm:text-base font-inter"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              {step === 1 ? "Close" : "Back"}
            </span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (!canGoNext()) {
                  if (step === 4) {
                    const evalResult = evaluateSafetyAnswers({
                      scanName: selectedScan?.scan_name,
                      customQuestionSet: selectedScan?.safety_question_set,
                      answers: safety,
                    });
                    if (!evalResult.isComplete) {
                      setError("Please answer all safety questions.");
                    } else if (evalResult.hasBlocking) {
                      const reason =
                        evalResult.blockingReasons?.[0] ||
                        "one or more safety responses";
                      const phoneText = clinic?.phone
                        ? ` Please call ${clinic.phone} to discuss next steps.`
                        : " Please contact the clinic to discuss next steps.";
                      setError(
                        `Online booking is blocked by safety screening (${reason}).${phoneText}`,
                      );
                    } else {
                      setError("Please complete this step before continuing.");
                    }
                  } else {
                    setError("Please complete this step before continuing.");
                  }
                  return;
                }

                if (step === 1) {
                  if (userLoading) {
                    setError("One sec — loading your account...");
                    return;
                  }
                  if (!currentUser) {
                    setAuthGateOpen(true);
                    return;
                  }
                }

                setStep((s) => Math.min(5, s + 1));
              }}
              disabled={bookingMutation.isPending}
              className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 sm:px-6 sm:text-base font-inter"
              style={{ backgroundColor: "#1A1A1A" }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Next
                <ArrowRight size={16} />
              </span>
            </button>
          ) : (
            <button
              type="submit"
              form={formId}
              disabled={bookingMutation.isPending}
              className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 sm:px-6 sm:text-base font-inter"
              style={{ backgroundColor: "#1A1A1A" }}
            >
              {bookingMutation.isPending ? "Booking..." : "Confirm booking"}
            </button>
          )}
        </div>
      </div>

      <AuthGateModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        continueUrl={continueUrl}
      />
    </>
  );

  if (layout === "embedded") {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-lg sm:p-7">
        {chrome}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-none flex-col bg-white p-5 sm:max-h-[92vh] sm:max-w-3xl sm:rounded-[28px] sm:p-8">
        {chrome}
      </div>
    </div>
  );
}
