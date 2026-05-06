import bcrypt from "bcryptjs";
import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { createClinicSession, createClinicSessionCookie } from "@/app/api/utils/clinicAuth";
import { clinicUserRequiresMfa, isClinicMfaEnabled } from "@/app/api/utils/clinicMfa";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { captchaFailureResponse, verifyCaptchaToken } from "@/app/api/utils/captcha";

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-auth-login", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const captchaToken =
        typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

      if (!email || !password) {
        return Response.json({ error: "Email and password are required" }, { status: 400 });
      }

      const captchaCheck = await verifyCaptchaToken(request, captchaToken, {
        expectedAction: "clinic_login",
        route: "/api/clinic/auth/signin",
      });
      if (!captchaCheck.success) {
        return captchaFailureResponse(captchaCheck.reason, captchaCheck);
      }

      const [clinicUser] = await sql`
        SELECT id, email, name, password_hash, email_verified_at, status
        FROM clinic.users
        WHERE normalized_email = ${email}
        LIMIT 1
      `;

      if (!clinicUser) {
        await logAudit({
          action: AUDIT_ACTIONS.CLINIC_LOGIN_FAILED,
          entityType: "clinic_user",
          details: { email, reason: "invalid_credentials" },
          request,
        });
        return Response.json({ error: "Invalid email or password" }, { status: 401 });
      }
      if (!clinicUser.email_verified_at) {
        await logAudit({
          userId: clinicUser.id,
          action: AUDIT_ACTIONS.CLINIC_LOGIN_FAILED,
          entityType: "clinic_user",
          entityId: clinicUser.id,
          details: { email, reason: "email_not_verified" },
          request,
        });
        return Response.json({ error: "Please verify your email before signing in." }, { status: 403 });
      }
      if (clinicUser.status !== "active") {
        await logAudit({
          userId: clinicUser.id,
          action: AUDIT_ACTIONS.CLINIC_LOGIN_FAILED,
          entityType: "clinic_user",
          entityId: clinicUser.id,
          details: { email, reason: "account_disabled" },
          request,
        });
        return Response.json({ error: "This clinic account is disabled." }, { status: 403 });
      }

      const isValid = await bcrypt.compare(password, clinicUser.password_hash);
      if (!isValid) {
        await logAudit({
          userId: clinicUser.id,
          action: AUDIT_ACTIONS.CLINIC_LOGIN_FAILED,
          entityType: "clinic_user",
          entityId: clinicUser.id,
          details: { email, reason: "invalid_credentials" },
          request,
        });
        return Response.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const session = await createClinicSession(clinicUser.id, request);
      const mfaRequired = await clinicUserRequiresMfa(clinicUser.id);
      const mfaEnabled = mfaRequired && (await isClinicMfaEnabled(clinicUser.id));
      await logAudit({
        userId: clinicUser.id,
        action: AUDIT_ACTIONS.CLINIC_LOGIN_SUCCESS,
        entityType: "clinic_user",
        entityId: clinicUser.id,
        details: { email, mfa_required: mfaRequired, mfa_enrolled: mfaEnabled },
        request,
      });
      return Response.json(
        {
          success: true,
          mfa_required: mfaRequired,
          mfa_enrolled: mfaEnabled,
        },
        {
          headers: {
            "Set-Cookie": createClinicSessionCookie(session.token),
          },
        },
      );
    } catch (err) {
      logger.error({ err }, "POST /api/clinic/auth/signin error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
