import sql, { sqlWithRLS } from "@/app/api/utils/sql";
import { assertTableColumns } from "./schemaGuard";
import {
  deleteTokenizedPHI,
  detokenizePHI,
  tokenizePHI,
  updateTokenizedPHI,
} from "@/app/api/utils/phiVault";

const PHI_FIELDS = [
  "full_name",
  "dob",
  "phone",
  "email",
  "symptoms_reason",
  "safety_answers",
];

const TOKEN_COLUMNS = {
  full_name: "full_name_token",
  dob: "dob_token",
  phone: "phone_token",
  email: "email_token",
  symptoms_reason: "symptoms_reason_token",
  safety_answers: "safety_answers_token",
};

function getAuditInfo(request, userId, actionPath) {
  const forwardedFor = request?.headers?.get("x-forwarded-for");
  const realIp = request?.headers?.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

  return {
    userId: userId || null,
    ipAddress,
    userAgent: request?.headers?.get("user-agent") || null,
    requestPath: actionPath || (request ? new URL(request.url).pathname : null),
  };
}

let ensureColumnsPromise = null;

export async function ensurePatientProfilePhiColumns() {
  if (!ensureColumnsPromise) {
    ensureColumnsPromise = (async () => {
      await assertTableColumns({
        table: "patient_profiles",
        columns: [
          "full_name_token",
          "dob_token",
          "phone_token",
          "email_token",
          "symptoms_reason_token",
          "safety_answers_token",
        ],
        context: "patient profile PHI schema validation",
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
  userId,
  request,
  entityId,
}) {
  const auditInfo = getAuditInfo(request, userId, "/api/user/patient-profile");
  const normalizedValue = value ?? null;

  if (normalizedValue === null) {
    if (existingToken) {
      await deleteTokenizedPHI(existingToken, auditInfo);
    }
    return null;
  }

  const payload = { [field]: normalizedValue };

  if (existingToken) {
    const updated = await updateTokenizedPHI(existingToken, payload, auditInfo);
    if (!updated) {
      return tokenizePHI(payload, "patient_profile", entityId, auditInfo);
    }
    return existingToken;
  }

  return tokenizePHI(payload, "patient_profile", entityId, auditInfo);
}

export async function upsertPatientProfileWithPhi({ userId, profile, request }) {
  await ensurePatientProfilePhiColumns();

  const [existingRows] = await sqlWithRLS(userId, "patient", (tx) => [
    tx`
      SELECT
        id,
        full_name_token,
        dob_token,
        phone_token,
        email_token,
        symptoms_reason_token,
        safety_answers_token
      FROM patient_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `,
  ]);

  const existing = existingRows[0] || null;
  const entityId = existing?.id || null;

  const tokens = {};
  for (const field of PHI_FIELDS) {
    const tokenColumn = TOKEN_COLUMNS[field];
    tokens[tokenColumn] = await setFieldToken({
      field,
      value: profile[field],
      existingToken: existing?.[tokenColumn] || null,
      userId,
      request,
      entityId,
    });
  }

  const [[saved]] = await sqlWithRLS(userId, "patient", (tx) => [
    tx`
      INSERT INTO patient_profiles (
        user_id,
        full_name,
        dob,
        phone,
        email,
        symptoms_reason,
        safety_answers,
        full_name_token,
        dob_token,
        phone_token,
        email_token,
        symptoms_reason_token,
        safety_answers_token
      )
      VALUES (
        ${userId},
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        ${tokens.full_name_token},
        ${tokens.dob_token},
        ${tokens.phone_token},
        ${tokens.email_token},
        ${tokens.symptoms_reason_token},
        ${tokens.safety_answers_token}
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        full_name = NULL,
        dob = NULL,
        phone = NULL,
        email = NULL,
        symptoms_reason = NULL,
        safety_answers = NULL,
        full_name_token = EXCLUDED.full_name_token,
        dob_token = EXCLUDED.dob_token,
        phone_token = EXCLUDED.phone_token,
        email_token = EXCLUDED.email_token,
        symptoms_reason_token = EXCLUDED.symptoms_reason_token,
        safety_answers_token = EXCLUDED.safety_answers_token,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
  ]);

  return saved;
}

export async function upsertPatientProfileWithPhiAsSystem({
  userId,
  profile,
  request,
}) {
  await ensurePatientProfilePhiColumns();

  const existingRows = await sql`
    SELECT
      id,
      full_name_token,
      dob_token,
      phone_token,
      email_token,
      symptoms_reason_token,
      safety_answers_token
    FROM patient_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  const existing = existingRows[0] || null;
  const entityId = existing?.id || null;

  const tokens = {};
  for (const field of PHI_FIELDS) {
    const tokenColumn = TOKEN_COLUMNS[field];
    tokens[tokenColumn] = await setFieldToken({
      field,
      value: profile[field],
      existingToken: existing?.[tokenColumn] || null,
      userId,
      request,
      entityId,
    });
  }

  const savedRows = await sql`
    INSERT INTO patient_profiles (
      user_id,
      full_name,
      dob,
      phone,
      email,
      symptoms_reason,
      safety_answers,
      full_name_token,
      dob_token,
      phone_token,
      email_token,
      symptoms_reason_token,
      safety_answers_token
    )
    VALUES (
      ${userId},
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      ${tokens.full_name_token},
      ${tokens.dob_token},
      ${tokens.phone_token},
      ${tokens.email_token},
      ${tokens.symptoms_reason_token},
      ${tokens.safety_answers_token}
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      full_name = NULL,
      dob = NULL,
      phone = NULL,
      email = NULL,
      symptoms_reason = NULL,
      safety_answers = NULL,
      full_name_token = EXCLUDED.full_name_token,
      dob_token = EXCLUDED.dob_token,
      phone_token = EXCLUDED.phone_token,
      email_token = EXCLUDED.email_token,
      symptoms_reason_token = EXCLUDED.symptoms_reason_token,
      safety_answers_token = EXCLUDED.safety_answers_token,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return savedRows[0] || null;
}

export async function hydratePatientProfileFromPhi(profileRow, request, userId) {
  if (!profileRow) {
    return null;
  }

  await ensurePatientProfilePhiColumns();

  const hydrated = {
    ...profileRow,
    full_name: profileRow.full_name || null,
    dob: profileRow.dob || null,
    phone: profileRow.phone || null,
    email: profileRow.email || null,
    symptoms_reason: profileRow.symptoms_reason || null,
    safety_answers: profileRow.safety_answers || null,
  };

  const auditInfo = getAuditInfo(request, userId, "/api/user/patient-profile");

  for (const field of PHI_FIELDS) {
    const tokenColumn = TOKEN_COLUMNS[field];
    const token = profileRow[tokenColumn];
    if (!token) {
      continue;
    }

    const payload = await detokenizePHI(token, auditInfo);
    if (payload && Object.prototype.hasOwnProperty.call(payload, field)) {
      hydrated[field] = payload[field];
    }
  }

  return hydrated;
}
