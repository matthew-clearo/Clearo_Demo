import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import secureFetch from "@/utils/secureFetch";
import {
  evaluateSafetyAnswers,
  getInitialSafetyAnswers,
} from "@/utils/bookingSafety";

export function useClinicBooking() {
  const [selectedScan, setSelectedScan] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  // Step 2
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [symptomsReason, setSymptomsReason] = useState("");

  // Step 3
  const [referralMissing, setReferralMissing] = useState(false);
  const [referralFileName, setReferralFileName] = useState("");
  const [referralUrl, setReferralUrl] = useState(null);

  // Step 4
  const [safety, setSafety] = useState(getInitialSafetyAnswers());

  // Shared
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState({
    infoAccurate: false,
    riskUnderstood: false,
    authorizeClinic: false,
    cancellationPolicy: false,
    termsPrivacy: false,
  });
  const [blockedSafetyReasons, setBlockedSafetyReasons] = useState([]);
  const [error, setError] = useState(null);

  const { data: currentUser, loading: userLoading } = useUser();
  const [upload, { loading: uploadLoading }] = useUpload();

  const bookingMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await secureFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg =
          data?.error ||
          `When creating booking, the response was [${response.status}] ${response.statusText}`;
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setError(null);
      const next = data?.manage_url || `/bookings/confirmation/${data?.id}`;
      window.location.href = next;
    },
    onError: (err) => {
      console.error(err);
      setError(err.message || "Could not complete booking");
    },
  });

  const handleBooking = (scan) => {
    setSelectedScan(scan);
    setShowBookingForm(true);

    // Reset wizard
    setStep(1);
    setSelectedDate("");
    setSelectedSlotId(null);
    setReferralMissing(false);
    setReferralFileName("");
    setReferralUrl(null);
    setSafety(
      getInitialSafetyAnswers(scan?.scan_name, scan?.safety_question_set),
    );
    setNotes("");
    setConsent({
      infoAccurate: false,
      riskUnderstood: false,
      authorizeClinic: false,
      cancellationPolicy: false,
      termsPrivacy: false,
    });
    setBlockedSafetyReasons([]);
    setError(null);
  };

  const uploadReferral = async (file) => {
    setError(null);
    const result = await upload({ file });
    if (result?.error) {
      setError(result.error);
      return;
    }
    setReferralUrl(result.url);
    setReferralMissing(false);
  };

  const canGoNext = () => {
    if (step === 1) return Boolean(selectedDate && selectedSlotId);
    if (step === 2) {
      return Boolean(
        String(patientName || "").trim() &&
          String(patientEmail || "").trim() &&
          String(patientPhone || "").trim() &&
          String(patientDob || "").trim() &&
          String(symptomsReason || "").trim(),
      );
    }
    if (step === 3) {
      if (!selectedScan?.requires_referral) return true;
      return Boolean(referralUrl || referralMissing);
    }
    if (step === 4) {
      const safetyEval = evaluateSafetyAnswers({
        scanName: selectedScan?.scan_name,
        customQuestionSet: selectedScan?.safety_question_set,
        answers: safety,
      });
      return safetyEval.isComplete && !safetyEval.hasBlocking;
    }
    return true;
  };

  const submitBooking = (e, clinic) => {
    e.preventDefault();

    if (!selectedSlotId) {
      setError("Please pick a time slot");
      return;
    }

    // Final validation
    if (!patientDob) {
      setError("Please enter your date of birth");
      return;
    }
    if (!symptomsReason) {
      setError("Please tell us the reason for the scan");
      return;
    }
    if (selectedScan?.requires_referral && !referralUrl && !referralMissing) {
      setError(
        "Referral required. Upload a referral or select 'I don't have one yet'.",
      );
      return;
    }
    const safetyEval = evaluateSafetyAnswers({
      scanName: selectedScan?.scan_name,
      customQuestionSet: selectedScan?.safety_question_set,
      answers: safety,
    });
    if (!safetyEval.isComplete) {
      setError("Please answer all safety questions.");
      return;
    }
    if (safetyEval.hasBlocking) {
      const reason =
        safetyEval.blockingReasons?.[0] || "one or more safety responses";
      const phoneText = clinic?.phone
        ? ` Please call ${clinic.phone} to discuss next steps.`
        : " Please contact the clinic to discuss next steps.";
      setBlockedSafetyReasons(safetyEval.blockingReasons || []);
      setError(
        `Online booking is blocked by safety screening (${reason}).${phoneText}`,
      );
      return;
    }
    setBlockedSafetyReasons([]);
    const consentGiven = Object.values(consent).every(Boolean);
    if (!consentGiven) {
      setError("You must agree to all consent statements before booking.");
      return;
    }

    setError(null);

    bookingMutation.mutate({
      clinic_id: clinic.id,
      scan_type_id: selectedScan.scan_type_id,
      total_price: selectedScan.price,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      patient_dob: patientDob,
      symptoms_reason: symptomsReason,
      referral_url: referralUrl,
      referral_missing: referralMissing,
      safety_answers: safety,
      notes,
      slot_id: selectedSlotId,
      consent_given: true,
      consent_version: "v1",
    });
  };

  const submitManualReviewRequest = (clinic) => {
    if (!clinic || !selectedSlotId) {
      setError("Please complete time selection first.");
      return;
    }

    const safetyEval = evaluateSafetyAnswers({
      scanName: selectedScan?.scan_name,
      customQuestionSet: selectedScan?.safety_question_set,
      answers: safety,
    });
    if (!safetyEval.isComplete || !safetyEval.hasBlocking) {
      setError("Manual review is only available for blocked safety answers.");
      return;
    }
    bookingMutation.mutate({
      clinic_id: clinic.id,
      scan_type_id: selectedScan.scan_type_id,
      total_price: selectedScan.price,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      patient_dob: patientDob,
      symptoms_reason: symptomsReason,
      referral_url: referralUrl,
      referral_missing: referralMissing,
      safety_answers: safety,
      notes,
      slot_id: selectedSlotId,
      consent_given: false,
      consent_version: "v1",
      manual_review_requested: true,
    });
  };

  return {
    selectedScan,
    showBookingForm,
    setShowBookingForm,
    step,
    setStep,
    selectedDate,
    setSelectedDate,
    selectedSlotId,
    setSelectedSlotId,
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
    referralMissing,
    setReferralMissing,
    referralFileName,
    setReferralFileName,
    referralUrl,
    setReferralUrl,
    safety,
    setSafety,
    notes,
    setNotes,
    consent,
    setConsent,
    error,
    setError,
    blockedSafetyReasons,
    currentUser,
    userLoading,
    uploadLoading,
    bookingMutation,
    handleBooking,
    uploadReferral,
    canGoNext,
    submitBooking,
    submitManualReviewRequest,
  };
}
