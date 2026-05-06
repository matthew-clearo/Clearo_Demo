import bcrypt from "bcryptjs";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";
import { consumeOneTimeToken } from "@/app/api/utils/authTokens";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { revokePatientSessions } from "@/app/api/utils/patientSessions";

function isStrongPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "password-reset", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const uid = typeof body.uid === "string" ? body.uid.trim() : "";
      const token = typeof body.token === "string" ? body.token.trim() : "";
      const newPassword =
        typeof body.newPassword === "string" ? body.newPassword : "";

      if (!uid || !token || !newPassword) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (!isStrongPassword(newPassword)) {
        return Response.json({ error: "Password does not meet complexity requirements" }, { status: 400 });
      }

      const consumed = await consumeOneTimeToken({
        identifier: `reset-password:${uid}`,
        rawToken: token,
      });
      if (!consumed) {
        return Response.json({ error: "Invalid or expired reset token" }, { status: 401 });
      }

      const hashed = await bcrypt.hash(newPassword, 12);

      await sql`
        UPDATE auth_accounts
        SET password = ${hashed}
        WHERE "userId" = ${uid}
          AND provider = 'credentials'
      `;

      await sql`
        DELETE FROM auth_sessions
        WHERE "userId" = ${uid}
      `;
      await revokePatientSessions(uid);

      await logAudit({
        userId: uid,
        action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
        entityType: "user",
        entityId: uid,
        details: { reset_completed: true },
        request,
      });

      return Response.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "POST /api/auth/reset-password error");
      return Response.json({ error: "Failed to reset password" }, { status: 500 });
    }
  });
}
