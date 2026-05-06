import sql, { sqlWithRLS } from "@/app/api/utils/sql";
import { assertTableColumns } from "./schemaGuard";
import {
  batchDetokenizePHI,
  deleteTokenizedPHI,
  detokenizePHI,
  tokenizePHI,
  updateTokenizedPHI,
} from "@/app/api/utils/phiVault";

const PHI_FIELDS = [
  "patient_name",
  "patient_email",
  "patient_phone",
  "patient_dob",
  "symptoms_reason",
  "notes",
  "safety_answers",
  "referral_url",
];

const TOKEN_COLUMNS = {
  patient_name: "patient_name_token",
  patient_email: "patient_email_token",
  patient_phone: "patient_phone_token",
  patient_dob: "patient_dob_token",
  symptoms_reason: "symptoms_reason_token",
  notes: "notes_token",
  safety_answers: "safety_answers_token",
  referral_url: "referral_url_token",
};

function maskName(value) {
  if (!value) return null;
  const parts = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map((part) => `${part.charAt(0)}***`).join(" ");
}

function maskEmail(value) {
  if (!value) return null;
  const [localPart, domain = ""] = String(value).split("@");
  if (!localPart) {
    return "[MASKED]";
  }
  return `${localPart.charAt(0)}***${domain ? `@${domain}` : ""}`;
}

function maskPhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 4) {
    return "[MASKED]";
  }
  return `--${digits.slice(-4)}`;
}

function maskDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "[MASKED]";
  }
  return `${date.getUTCFullYear()}-**-**`;
}

function maskSensitiveText(value) {
  return value ? "[REDACTED]" : null;
}

function maskWithFallback(rawValue, hasToken, masker, fallback = "[MASKED]") {
  if (rawValue) {
    return masker(rawValue);
  }

  return hasToken ? fallback : null;
}

function getStoredPhiPlaceholder(field, tokenValue) {
  if (!tokenValue) {
    return null;
  }

  if (field === "patient_email") {
    return "tokenized@local";
  }

  if (field === "patient_dob" || field === "safety_answers") {
    return null;
  }

  return "[TOKENIZED]";
}

function isTokenizedPlaceholder(field, value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (field === "patient_email") {
    return value === "tokenized@local" || value === "[TOKENIZED]";
  }

  if (field === "patient_dob" || field === "safety_answers") {
    return false;
  }

  return value === "[TOKENIZED]";
}

function getAuditInfo(request, userId, path = "/api/bookings") {
  const forwardedFor = request?.headers?.get("x-forwarded-for");
  const realIp = request?.headers?.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

  return {
    userId: userId || null,
    ipAddress,
    userAgent: request?.headers?.get("user-agent") || null,
    requestPath: path,
  };
}

let ensureColumnsPromise = null;

export async function ensureBookingPhiColumns({
  context = "booking PHI schema validation",
} = {}) {
  if (!ensureColumnsPromise) {
    ensureColumnsPromise = (async () => {
      await assertTableColumns({
        table: "bookings",
        columns: [
          "patient_name_token",
          "patient_email_token",
          "patient_phone_token",
          "patient_dob_token",
          "symptoms_reason_token",
          "notes_token",
          "safety_answers_token",
          "referral_url_token",
          "referral_file_id",
        ],
        context,
      });
    })().catch((err) => {
      ensureColumnsPromise = null;
      throw err;
    });
  }

  return ensureColumnsPromise;
}

async function setFieldToken({
  field,
  value,
  existingToken,
  bookingId,
  request,
  userId,
}) {
  const auditInfo = getAuditInfo(request, userId);
  const normalized = value ?? null;

  if (normalized === null) {
    if (existingToken) {
      await deleteTokenizedPHI(existingToken, auditInfo);
    }
    return null;
  }

  const payload = { [field]: normalized };
  if (existingToken) {
    const updated = await updateTokenizedPHI(existingToken, payload, auditInfo);
    if (!updated) {
      return tokenizePHI(payload, "booking", bookingId, auditInfo);
    }
    return existingToken;
  }

  return tokenizePHI(payload, "booking", bookingId, auditInfo);
}

export async function upsertBookingPhi({ bookingId, data, request, userId }) {
  if (!userId) {
    throw new Error("upsertBookingPhi requires a userId for RLS-protected writes");
  }

  const [rows] = await sqlWithRLS(userId, "patient", (tx) => [
    tx`
      SELECT
        patient_name_token,
        patient_email_token,
        patient_phone_token,
        patient_dob_token,
        symptoms_reason_token,
        notes_token,
        safety_answers_token,
        referral_url_token
      FROM bookings
      WHERE id = ${bookingId}
      LIMIT 1
    `,
  ]);
  const existing = rows[0];
  if (!existing) {
    throw new Error("Booking not found for PHI tokenization");
  }

  const tokens = {};
  for (const field of PHI_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) {
      continue;
    }
    const tokenColumn = TOKEN_COLUMNS[field];
    tokens[tokenColumn] = await setFieldToken({
      field,
      value: data[field],
      existingToken: existing[tokenColumn],
      bookingId,
      request,
      userId,
    });
  }

  const hasUpdates = Object.keys(tokens).length > 0;
  if (!hasUpdates) {
    return;
  }

  await sqlWithRLS(userId, "patient", (tx) => [
    tx`
      UPDATE bookings
      SET
        patient_name = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_name_token")} THEN ${getStoredPhiPlaceholder("patient_name", tokens.patient_name_token)} ELSE patient_name END,
        patient_email = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_email_token")} THEN ${getStoredPhiPlaceholder("patient_email", tokens.patient_email_token)} ELSE patient_email END,
        patient_phone = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_phone_token")} THEN ${getStoredPhiPlaceholder("patient_phone", tokens.patient_phone_token)} ELSE patient_phone END,
        patient_dob = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_dob_token")} THEN ${getStoredPhiPlaceholder("patient_dob", tokens.patient_dob_token)} ELSE patient_dob END,
        symptoms_reason = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "symptoms_reason_token")} THEN ${getStoredPhiPlaceholder("symptoms_reason", tokens.symptoms_reason_token)} ELSE symptoms_reason END,
        notes = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "notes_token")} THEN ${getStoredPhiPlaceholder("notes", tokens.notes_token)} ELSE notes END,
        safety_answers = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "safety_answers_token")} THEN ${getStoredPhiPlaceholder("safety_answers", tokens.safety_answers_token)} ELSE safety_answers END,
        referral_url = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "referral_url_token")} THEN ${getStoredPhiPlaceholder("referral_url", tokens.referral_url_token)} ELSE referral_url END,
        patient_name_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_name_token")} THEN ${tokens.patient_name_token || null} ELSE patient_name_token END,
        patient_email_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_email_token")} THEN ${tokens.patient_email_token || null} ELSE patient_email_token END,
        patient_phone_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_phone_token")} THEN ${tokens.patient_phone_token || null} ELSE patient_phone_token END,
        patient_dob_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "patient_dob_token")} THEN ${tokens.patient_dob_token || null} ELSE patient_dob_token END,
        symptoms_reason_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "symptoms_reason_token")} THEN ${tokens.symptoms_reason_token || null} ELSE symptoms_reason_token END,
        notes_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "notes_token")} THEN ${tokens.notes_token || null} ELSE notes_token END,
        safety_answers_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "safety_answers_token")} THEN ${tokens.safety_answers_token || null} ELSE safety_answers_token END,
        referral_url_token = CASE WHEN ${Object.prototype.hasOwnProperty.call(tokens, "referral_url_token")} THEN ${tokens.referral_url_token || null} ELSE referral_url_token END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${bookingId}
    `,
  ]);
}

export async function hydrateBookingFromPhi(booking, request, userId) {
  if (!booking) {
    return null;
  }

  const hydrated = { ...booking };
  const auditInfo = getAuditInfo(request, userId, `/api/bookings/${booking.id}`);

  for (const field of PHI_FIELDS) {
    const token = booking[TOKEN_COLUMNS[field]];
    if (!token) {
      if (isTokenizedPlaceholder(field, hydrated[field])) {
        hydrated[field] = null;
      }
      continue;
    }
    const payload = await detokenizePHI(token, auditInfo);
    if (payload && Object.prototype.hasOwnProperty.call(payload, field)) {
      hydrated[field] = payload[field];
    } else if (isTokenizedPlaceholder(field, hydrated[field])) {
      hydrated[field] = null;
    }
  }

  return hydrated;
}

export async function hydrateBookingListFromPhi(bookings, request, userId) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return bookings || [];
  }

  // Collect all non-null tokens across all bookings for a single batch fetch
  const allTokens = [];
  for (const booking of bookings) {
    for (const field of PHI_FIELDS) {
      const token = booking[TOKEN_COLUMNS[field]];
      if (token) {
        allTokens.push(token);
      }
    }
  }

  if (allTokens.length === 0) {
    // No tokens to resolve — just clean up placeholders
    return bookings.map((booking) => {
      const hydrated = { ...booking };
      for (const field of PHI_FIELDS) {
        if (isTokenizedPlaceholder(field, hydrated[field])) {
          hydrated[field] = null;
        }
      }
      return hydrated;
    });
  }

  // Batch-fetch all PHI in one round-trip
  const auditInfo = getAuditInfo(request, userId, "/api/bookings");
  let tokenMap;
  try {
    tokenMap = await batchDetokenizePHI(allTokens, auditInfo);
  } catch {
    // Fallback to one-at-a-time if batch fails
    const hydrated = [];
    for (const booking of bookings) {
      hydrated.push(await hydrateBookingFromPhi(booking, request, userId));
    }
    return hydrated;
  }

  // Apply decrypted values to each booking locally
  return bookings.map((booking) => {
    const hydrated = { ...booking };
    for (const field of PHI_FIELDS) {
      const token = booking[TOKEN_COLUMNS[field]];
      if (!token) {
        if (isTokenizedPlaceholder(field, hydrated[field])) {
          hydrated[field] = null;
        }
        continue;
      }
      const payload = tokenMap.get(token);
      if (payload && Object.prototype.hasOwnProperty.call(payload, field)) {
        hydrated[field] = payload[field];
      } else if (isTokenizedPlaceholder(field, hydrated[field])) {
        hydrated[field] = null;
      }
    }
    return hydrated;
  });
}

export function maskBookingFromPhi(booking) {
  if (!booking || typeof booking !== "object") {
    return booking;
  }

  const masked = { ...booking };

  masked.patient_name = maskWithFallback(
    booking.patient_name,
    Boolean(booking.patient_name_token),
    maskName,
  );
  masked.patient_email = maskWithFallback(
    booking.patient_email,
    Boolean(booking.patient_email_token),
    maskEmail,
  );
  masked.patient_phone = maskWithFallback(
    booking.patient_phone,
    Boolean(booking.patient_phone_token),
    maskPhone,
  );
  masked.patient_dob = maskWithFallback(
    booking.patient_dob,
    Boolean(booking.patient_dob_token),
    maskDate,
  );
  masked.symptoms_reason = maskWithFallback(
    booking.symptoms_reason,
    Boolean(booking.symptoms_reason_token),
    maskSensitiveText,
    "[REDACTED]",
  );
  masked.notes = maskWithFallback(
    booking.notes,
    Boolean(booking.notes_token),
    maskSensitiveText,
    "[REDACTED]",
  );
  masked.safety_answers = maskWithFallback(
    booking.safety_answers,
    Boolean(booking.safety_answers_token),
    maskSensitiveText,
    "[REDACTED]",
  );
  masked.referral_url = maskWithFallback(
    booking.referral_url,
    Boolean(booking.referral_url_token),
    maskSensitiveText,
    "[REDACTED]",
  );
  if (Object.prototype.hasOwnProperty.call(masked, "user_email")) {
    masked.user_email = maskEmail(masked.user_email);
  }

  return Object.fromEntries(
    Object.entries(masked).filter(([key]) => !key.endsWith("_token")),
  );
}

export function maskBookingListFromPhi(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return bookings || [];
  }

  return bookings.map((booking) => maskBookingFromPhi(booking));
}
