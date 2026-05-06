const MRI_QUESTIONS = [
  {
    key: "mri_metal_implants",
    label: "Do you have any metal implants, pacemaker, or cochlear implant?",
    onYes: "block",
  },
  {
    key: "pregnant_or_possible",
    label: "Are you or could you be pregnant?",
    onYes: "require_approval",
  },
  {
    key: "mri_claustrophobia",
    label: "Do you have a history of claustrophobia?",
    onYes: "flag",
  },
  {
    key: "weight_over_300lbs",
    label: "Do you weigh more than 300 lbs (136 kg)?",
    onYes: "flag",
  },
];

const CT_QUESTIONS = [
  {
    key: "ct_contrast_allergy",
    label: "Are you allergic to iodine or contrast dye?",
    onYes: "require_approval",
  },
  {
    key: "ct_kidney_disease",
    label: "Do you have kidney disease?",
    onYes: "require_approval",
  },
  {
    key: "pregnant_or_possible",
    label: "Are you or could you be pregnant?",
    onYes: "require_approval",
  },
];

const XRAY_QUESTIONS = [
  {
    key: "pregnant_or_possible",
    label: "Are you or could you be pregnant?",
    onYes: "require_approval",
  },
];

const ULTRASOUND_QUESTIONS = [
  {
    key: "ultrasound_mobility_assist",
    label: "Do you need mobility assistance during the scan?",
    onYes: "flag",
  },
];

export const DEFAULT_PREP_BY_MODALITY = {
  mri: "No metal jewelry. Eat normally unless told otherwise. Arrive 15 minutes early.",
  ct: "If contrast is required, follow fasting instructions from the clinic. Arrive 15 minutes early.",
  xray: "No special preparation needed unless your clinician advised otherwise.",
  ultrasound:
    "Follow clinic instructions for fasting or hydration based on the body area being scanned.",
  default: "Follow the clinic preparation instructions and arrive 10-15 minutes early.",
};

export function inferScanModality(scanName) {
  const normalized = String(scanName || "").toLowerCase();
  if (normalized.includes("mri") || normalized.includes("mr ")) return "mri";
  if (normalized.includes("ct")) return "ct";
  if (normalized.includes("x-ray") || normalized.includes("xray")) return "xray";
  if (normalized.includes("ultrasound") || normalized.includes("sono")) {
    return "ultrasound";
  }
  return "default";
}

export function getDefaultSafetyQuestionsByModality(modality) {
  if (modality === "mri") return MRI_QUESTIONS;
  if (modality === "ct") return CT_QUESTIONS;
  if (modality === "xray") return XRAY_QUESTIONS;
  if (modality === "ultrasound") return ULTRASOUND_QUESTIONS;
  return XRAY_QUESTIONS;
}

export function getSafetyQuestionsForScan(scanName, customQuestionSet) {
  if (Array.isArray(customQuestionSet) && customQuestionSet.length > 0) {
    return customQuestionSet;
  }
  const modality = inferScanModality(scanName);
  return getDefaultSafetyQuestionsByModality(modality);
}

export function getInitialSafetyAnswers(scanName, customQuestionSet) {
  const questions = getSafetyQuestionsForScan(scanName, customQuestionSet);
  const answers = { other_notes: "" };
  for (const q of questions) {
    answers[q.key] = null;
  }
  return answers;
}

export function evaluateSafetyAnswers({ scanName, customQuestionSet, answers }) {
  const questions = getSafetyQuestionsForScan(scanName, customQuestionSet);
  const missingKeys = [];
  const blockingReasons = [];
  const approvalFlags = [];
  const nonBlockingFlags = [];

  for (const q of questions) {
    const raw = answers?.[q.key];
    if (raw !== "yes" && raw !== "no") {
      missingKeys.push(q.key);
      continue;
    }
    if (raw !== "yes") {
      continue;
    }
    if (q.onYes === "block") {
      blockingReasons.push(q.label);
    } else if (q.onYes === "require_approval") {
      approvalFlags.push(q.label);
    } else if (q.onYes === "flag") {
      nonBlockingFlags.push(q.label);
    }
  }

  return {
    questions,
    missingKeys,
    blockingReasons,
    approvalFlags,
    nonBlockingFlags,
    isComplete: missingKeys.length === 0,
    hasBlocking: blockingReasons.length > 0,
  };
}

