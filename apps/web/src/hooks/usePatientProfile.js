import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import secureFetch from "@/utils/secureFetch";

export const patientProfileQueryKey = ["patientProfile"];

function normalizeProfileDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

async function fetchPatientProfile() {
  const res = await fetch("/api/user/patient-profile");
  if (!res.ok) {
    throw new Error(
      `When fetching /api/user/patient-profile, the response was [${res.status}] ${res.statusText}`,
    );
  }
  const data = await res.json();
  return data.profile || null;
}

export function getPatientProfilePrefill({
  currentUser,
  patientProfile,
  draft = null,
  fallbackSymptoms = "",
  includeDraftSymptoms = false,
}) {
  const safeDraft =
    draft && typeof draft === "object" && !Array.isArray(draft) ? draft : null;

  const symptomsFromDraft = includeDraftSymptoms
    ? safeDraft?.symptoms_reason
    : null;

  return {
    fullName:
      safeDraft?.full_name || patientProfile?.full_name || currentUser?.name || "",
    email: safeDraft?.email || patientProfile?.email || currentUser?.email || "",
    phone: safeDraft?.phone || patientProfile?.phone || "",
    dob: safeDraft?.dob || normalizeProfileDate(patientProfile?.dob) || "",
    symptomsReason:
      symptomsFromDraft ||
      patientProfile?.symptoms_reason ||
      fallbackSymptoms ||
      "",
    safetyAnswers: patientProfile?.safety_answers || null,
  };
}

export function buildPatientProfilePayload({
  fullName,
  dob,
  phone,
  email,
  symptomsReason,
}) {
  return {
    full_name: fullName,
    dob,
    phone,
    email,
    symptoms_reason: symptomsReason || null,
  };
}

export function usePatientProfileQuery(currentUser) {
  return useQuery({
    queryKey: patientProfileQueryKey,
    enabled: !!currentUser,
    queryFn: fetchPatientProfile,
  });
}

export function useSavePatientProfile({
  onSuccess,
  onError,
  additionalInvalidations = [],
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await secureFetch("/api/user/patient-profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error ||
          `When saving /api/user/patient-profile, the response was [${res.status}] ${res.statusText}`;
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: patientProfileQueryKey });
      await Promise.all(
        additionalInvalidations.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error(error);
      if (onError) {
        onError(error, variables, context);
      }
    },
  });
}

export function usePatientProfile(currentUser, setters) {
  const { data: patientProfile } = usePatientProfileQuery(currentUser);

  // Prefill when user/profile loads
  useEffect(() => {
    if (!currentUser) return;

    const defaults = getPatientProfilePrefill({
      currentUser,
      patientProfile,
    });

    setters.setPatientName((v) => (v ? v : defaults.fullName));
    setters.setPatientEmail((v) => (v ? v : defaults.email));
    setters.setPatientPhone((v) => (v ? v : defaults.phone));
    setters.setPatientDob((v) => (v ? v : defaults.dob));
    setters.setSymptomsReason((v) => (v ? v : defaults.symptomsReason));

    if (defaults.safetyAnswers && typeof defaults.safetyAnswers === "object") {
      const normalizedSafety = {};
      for (const [k, v] of Object.entries(defaults.safetyAnswers)) {
        if (typeof v === "boolean") {
          normalizedSafety[k] = v ? "yes" : "no";
        } else {
          normalizedSafety[k] = v;
        }
      }
      setters.setSafety((prev) => ({
        ...prev,
        ...normalizedSafety,
        other_notes:
          typeof normalizedSafety.other_notes === "string"
            ? normalizedSafety.other_notes
            : prev.other_notes,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, patientProfile]);

  return { patientProfile };
}
