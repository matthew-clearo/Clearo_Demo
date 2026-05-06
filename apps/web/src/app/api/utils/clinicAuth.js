import crypto from "node:crypto";
import sql from "./sql";
import { assertTableColumns } from "./schemaGuard";
import {
  clinicRoleRequiresMfa,
  isClinicMfaEnabled,
  isClinicMfaSessionValid,
} from "./clinicMfa";
import { isDemoMode } from "./demoMode";

const CLINIC_SESSION_COOKIE = "clinic_session";
const CLINIC_SESSION_MAX_AGE = 8 * 60 * 60;
const CLINIC_MFA_SETUP_PATHS = new Set([
  "/clinic-admin/mfa-setup",
  "/mfa-setup",
  "/api/clinic/mfa/setup",
  "/api/clinic/mfa/verify",
]);
const CLINIC_MFA_VERIFY_PATHS = new Set([
  "/clinic-admin/mfa-challenge",
  "/mfa-challenge",
  "/api/clinic/mfa/challenge",
]);
const CLINIC_MFA_STATE_PATHS = new Set([
  "/api/clinic/mfa/status",
  "/api/clinic/auth/me",
]);
const CLINIC_LOGOUT_PATHS = [
  "/api/clinic/auth/signout",
];
let clinicSessionColumnsEnsured = false;

function getRequestPathname(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "";
  }
}

function isClinicLogoutPath(pathname) {
  return CLINIC_LOGOUT_PATHS.some(
    (allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`),
  );
}

function isClinicMfaBypassPath(pathname) {
  return (
    CLINIC_MFA_SETUP_PATHS.has(pathname) ||
    CLINIC_MFA_VERIFY_PATHS.has(pathname) ||
    CLINIC_MFA_STATE_PATHS.has(pathname) ||
    isClinicLogoutPath(pathname)
  );
}

function redirectTo(request, targetPath) {
  return Response.redirect(new URL(targetPath, request.url), 303);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function getClinicSessionToken(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${CLINIC_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] || null;
}

export function createClinicSessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLINIC_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Max-Age=${CLINIC_SESSION_MAX_AGE}; Path=/${secure}`;
}

export function clearClinicSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLINIC_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/${secure}`;
}

export async function ensureClinicSessionColumns() {
  if (clinicSessionColumnsEnsured) return;

  await assertTableColumns({
    schema: "clinic",
    table: "sessions",
    columns: ["session_token_hash", "ip_address", "user_agent"],
    context: "clinic session schema validation",
  });

  clinicSessionColumnsEnsured = true;
}

export async function createClinicSession(clinicUserId, request = null) {
  await ensureClinicSessionColumns();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + CLINIC_SESSION_MAX_AGE * 1000);
  const forwardedFor = request?.headers?.get("x-forwarded-for");
  const realIp = request?.headers?.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  const userAgent = request?.headers?.get("user-agent") || null;

  await sql`
    INSERT INTO clinic.sessions (clinic_user_id, session_token_hash, expires_at, ip_address, user_agent)
    VALUES (${clinicUserId}, ${hashToken(token)}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
  `;

  await sql`
    UPDATE clinic.users
    SET last_login_at = NOW()
    WHERE id = ${clinicUserId}
  `;

  return { token, expiresAt };
}

export async function destroyClinicSession(request) {
  const token = getClinicSessionToken(request);
  if (!token) return;

  await sql`
    DELETE FROM clinic.sessions
    WHERE session_token_hash = ${hashToken(token)}
  `;
}

export async function listClinicSessions(clinicUserId, request) {
  await ensureClinicSessionColumns();
  const currentToken = getClinicSessionToken(request);

  return sql`
    SELECT
      id,
      created_at,
      expires_at,
      ip_address,
      user_agent,
      CASE WHEN session_token_hash = ${currentToken ? hashToken(currentToken) : ""} THEN true ELSE false END AS is_current
    FROM clinic.sessions
    WHERE clinic_user_id = ${clinicUserId}
      AND expires_at > NOW()
    ORDER BY created_at DESC
  `;
}

export async function revokeClinicSession(clinicUserId, sessionId, request) {
  const currentToken = getClinicSessionToken(request);
  const [deleted] = await sql`
    DELETE FROM clinic.sessions
    WHERE id = ${sessionId}
      AND clinic_user_id = ${clinicUserId}
      AND session_token_hash <> ${currentToken ? hashToken(currentToken) : ""}
    RETURNING id
  `;

  return deleted || null;
}

export async function revokeOtherClinicSessions(clinicUserId, request) {
  const currentToken = getClinicSessionToken(request);
  const deleted = await sql`
    DELETE FROM clinic.sessions
    WHERE clinic_user_id = ${clinicUserId}
      AND session_token_hash <> ${currentToken ? hashToken(currentToken) : ""}
    RETURNING id
  `;

  return deleted.length;
}

export async function requireClinicAccess(request, options = {}) {
  const { allowPendingMfa = false } = options;
  const token = getClinicSessionToken(request);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    SELECT
      cu.id,
      cu.public_id,
      cu.email,
      cu.name,
      cu.status,
      cu.email_verified_at,
      cu.mfa_enabled
    FROM clinic.sessions cs
    JOIN clinic.users cu ON cu.id = cs.clinic_user_id
    WHERE cs.session_token_hash = ${hashToken(token)}
      AND cs.expires_at > NOW()
    LIMIT 1
  `;

  const clinicUser = rows[0];
  if (!clinicUser || clinicUser.status !== "active") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await getClinicMemberships(clinicUser.id);
  const demoMode = isDemoMode();
  const mfaRequired = demoMode
    ? false
    : memberships.some((membership) => clinicRoleRequiresMfa(membership.role));
  const pathname = getRequestPathname(request);
  const bypassMfaGate = isClinicMfaBypassPath(pathname);
  const mfaEnrolled = mfaRequired ? await isClinicMfaEnabled(clinicUser.id) : false;
  const mfaVerified =
    mfaRequired && mfaEnrolled === true && isClinicMfaSessionValid(request, clinicUser.id) === true;

  if (mfaRequired) {
    if (allowPendingMfa && bypassMfaGate) {
      return {
        clinicUser,
        memberships,
        mfaRequired,
        mfaEnabled: mfaEnrolled,
        mfaEnrolled,
        mfaVerified,
      };
    }

    if (mfaEnrolled !== true) {
      if (bypassMfaGate) {
        return {
          clinicUser,
          memberships,
          mfaRequired,
          mfaEnabled: mfaEnrolled,
          mfaEnrolled,
          mfaVerified,
        };
      }
      return redirectTo(request, "/clinic-admin/mfa-setup");
    }

    if (mfaVerified !== true) {
      if (bypassMfaGate) {
        return {
          clinicUser,
          memberships,
          mfaRequired,
          mfaEnabled: mfaEnrolled,
          mfaEnrolled,
          mfaVerified,
        };
      }
      return redirectTo(request, "/clinic-admin/mfa-challenge");
    }
  }

  return {
    clinicUser,
    memberships,
    mfaRequired,
    mfaEnabled: mfaEnrolled,
    mfaEnrolled,
    mfaVerified,
  };
}

export async function requireClinicUser(request, options = {}) {
  return requireClinicAccess(request, options);
}

export async function getClinicMemberships(clinicUserId) {
  return sql`
    SELECT
      cm.id,
      cm.clinic_id,
      cm.role,
      cm.status,
      cm.accepted_at,
      cm.disabled_at,
      c.public_id AS clinic_public_id,
      c.name AS clinic_name
    FROM clinic.memberships cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.clinic_user_id = ${clinicUserId}
      AND cm.status = 'active'
      AND cm.disabled_at IS NULL
    ORDER BY c.name ASC
  `;
}

export async function requireClinicMembership(request, clinicPublicId, allowedRoles = [], options = {}) {
  const authResult = await requireClinicUser(request, options);
  if (authResult instanceof Response) return authResult;

  const { clinicUser } = authResult;
  const [clinic] = await sql`
    SELECT id, public_id
    FROM public.clinics
    WHERE public_id = ${clinicPublicId}
    LIMIT 1
  `;

  if (!clinic) {
    return Response.json({ error: "Clinic not found" }, { status: 404 });
  }

  const [membership] = await sql`
    SELECT id, clinic_id, role, status, disabled_at
    FROM clinic.memberships
    WHERE clinic_user_id = ${clinicUser.id}
      AND clinic_id = ${clinic.id}
      AND status = 'active'
      AND disabled_at IS NULL
    LIMIT 1
  `;

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { clinicUser, clinic, membership };
}
