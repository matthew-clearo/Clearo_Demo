import crypto from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import { toDataURL } from "qrcode";
import sql from "./sql";
import { assertTableColumns } from "./schemaGuard";

const MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || process.env.AUTH_SECRET;
const APP_NAME = "Clearo Clinic Portal";
const CLINIC_MFA_COOKIE_NAME = "clinic_mfa_verified";
const CLINIC_MFA_SESSION_DURATION = 12 * 60 * 60;
const CLINIC_MFA_TOTP_EPOCH_TOLERANCE = 30; // Allow one adjacent 30s step for minor device clock drift
const CLINIC_SESSION_COOKIE_PATTERN = /(?:^|;\s*)clinic_session=([^;]+)/;

function deriveKey(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest();
}

async function verifyTotpToken(token, secret) {
  const result = await verify({
    token,
    secret,
    epochTolerance: CLINIC_MFA_TOTP_EPOCH_TOLERANCE,
  });
  return result.valid === true;
}

function encrypt(text) {
  const key = deriveKey(MFA_ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

function decrypt(encryptedText) {
  const key = deriveKey(MFA_ENCRYPTION_KEY);
  const [ivHex, tagHex, encrypted] = String(encryptedText || "").split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

let clinicMfaColumnsEnsured = false;

export async function ensureClinicMfaColumns() {
  if (clinicMfaColumnsEnsured) return;

  await assertTableColumns({
    schema: "clinic",
    table: "users",
    columns: ["mfa_secret_encrypted", "mfa_enabled", "mfa_backup_codes"],
    context: "clinic MFA schema validation",
  });
  clinicMfaColumnsEnsured = true;
}

export function clinicRoleRequiresMfa(role) {
  return role === "owner" || role === "manager";
}

export async function clinicUserRequiresMfa(clinicUserId) {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM clinic.memberships
      WHERE clinic_user_id = ${clinicUserId}
        AND status = 'active'
        AND disabled_at IS NULL
        AND role IN ('owner', 'manager')
    ) AS required
  `;

  return row?.required === true;
}

export async function clinicUserIsMfaEligible(clinicUserId) {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM clinic.memberships
      WHERE clinic_user_id = ${clinicUserId}
        AND status = 'active'
        AND disabled_at IS NULL
    ) AS eligible
  `;

  return row?.eligible === true;
}

export async function generateClinicMfaSetup(clinicUserId, userEmail) {
  await ensureClinicMfaColumns();

  const secret = generateSecret();
  const uri = generateURI({
    issuer: APP_NAME,
    label: userEmail,
    secret,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const qrCodeDataUrl = await toDataURL(uri, {
    width: 512,
    margin: 1,
    color: {
      dark: "#1F332D",
      light: "#FFFFFF",
    },
  });
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase(),
  );

  await sql`
    UPDATE clinic.users
    SET
      mfa_secret_encrypted = ${encrypt(secret)},
      mfa_backup_codes = ${encrypt(JSON.stringify(backupCodes))}
    WHERE id = ${clinicUserId}
  `;

  return {
    qrCode: qrCodeDataUrl,
    secret,
    backupCodes,
  };
}

export async function verifyAndEnableClinicMfa(clinicUserId, token) {
  await ensureClinicMfaColumns();

  const [user] = await sql`
    SELECT mfa_secret_encrypted, mfa_enabled
    FROM clinic.users
    WHERE id = ${clinicUserId}
    LIMIT 1
  `;

  if (!user || !user.mfa_secret_encrypted) {
    throw new Error("MFA not set up for this account");
  }

  const secret = decrypt(user.mfa_secret_encrypted);
  if (!(await verifyTotpToken(token, secret))) {
    throw new Error("Invalid MFA code");
  }

  if (!user.mfa_enabled) {
    await sql`
      UPDATE clinic.users
      SET mfa_enabled = true
      WHERE id = ${clinicUserId}
    `;
  }

  return true;
}

export async function verifyClinicMfaToken(clinicUserId, token) {
  await ensureClinicMfaColumns();

  const [user] = await sql`
    SELECT mfa_secret_encrypted, mfa_enabled, mfa_backup_codes
    FROM clinic.users
    WHERE id = ${clinicUserId}
    LIMIT 1
  `;

  if (!user || !user.mfa_enabled || !user.mfa_secret_encrypted) {
    throw new Error("MFA not enabled");
  }

  const secret = decrypt(user.mfa_secret_encrypted);
  if (await verifyTotpToken(token, secret)) {
    return true;
  }

  if (user.mfa_backup_codes) {
    try {
      const codes = JSON.parse(decrypt(user.mfa_backup_codes));
      const normalized = String(token || "").trim().toUpperCase();
      const index = codes.indexOf(normalized);
      if (index !== -1) {
        codes.splice(index, 1);
        await sql`
          UPDATE clinic.users
          SET mfa_backup_codes = ${encrypt(JSON.stringify(codes))}
          WHERE id = ${clinicUserId}
        `;
        return true;
      }
    } catch {
      // Ignore backup-code parse issues and fall through.
    }
  }

  throw new Error("Invalid MFA code");
}

export async function isClinicMfaEnabled(clinicUserId) {
  await ensureClinicMfaColumns();

  const [user] = await sql`
    SELECT mfa_enabled
    FROM clinic.users
    WHERE id = ${clinicUserId}
    LIMIT 1
  `;

  return user?.mfa_enabled === true;
}

function getBoundClinicSessionValue(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(CLINIC_SESSION_COOKIE_PATTERN);
  return match?.[1] || null;
}

function hashBoundClinicSession(sessionValue) {
  return crypto.createHash("sha256").update(String(sessionValue)).digest("hex");
}

function generateClinicMfaSessionToken(clinicUserId, request) {
  const boundSession = getBoundClinicSessionValue(request);
  if (!boundSession) {
    throw new Error("Missing clinic session binding");
  }

  const sessionBinding = hashBoundClinicSession(boundSession);
  const payload = `${clinicUserId}:${sessionBinding}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  const hmac = crypto.createHmac("sha256", String(MFA_ENCRYPTION_KEY)).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${hmac}`;
}

function validateClinicMfaSessionToken(token, clinicUserId, request) {
  try {
    const [payloadB64, hmac] = String(token || "").split(".");
    if (!payloadB64 || !hmac) return false;

    const payload = Buffer.from(payloadB64, "base64").toString();
    const expectedHmac = crypto.createHmac("sha256", String(MFA_ENCRYPTION_KEY)).update(payload).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expectedHmac, "hex"))) {
      return false;
    }

    const [tokenUserId, sessionBinding, timestamp] = payload.split(":");
    if (String(tokenUserId) !== String(clinicUserId)) return false;
    if (!sessionBinding || !timestamp) return false;

    const boundSession = getBoundClinicSessionValue(request);
    if (!boundSession) return false;
    if (sessionBinding !== hashBoundClinicSession(boundSession)) return false;

    const age = (Date.now() - Number(timestamp)) / 1000;
    return age <= CLINIC_MFA_SESSION_DURATION;
  } catch {
    return false;
  }
}

export function createClinicMfaCookie(clinicUserId, request) {
  const token = generateClinicMfaSessionToken(clinicUserId, request);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLINIC_MFA_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Max-Age=${CLINIC_MFA_SESSION_DURATION}; Path=/api/clinic${secure}`;
}

export function clearClinicMfaCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLINIC_MFA_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/api/clinic${secure}`;
}

export function isClinicMfaSessionValid(request, clinicUserId) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${CLINIC_MFA_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  return validateClinicMfaSessionToken(match[1], clinicUserId, request);
}
