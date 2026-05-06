import bcrypt from "bcryptjs";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";
import { consumeClinicPasswordResetToken } from "@/app/api/utils/clinicEmailAuth";
import { logClinicAudit } from "@/app/api/utils/clinicAudit";

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

      const consumed = await consumeClinicPasswordResetToken(uid, token);
      if (!consumed) {
        return Response.json({ error: "Invalid or expired reset token" }, { status: 401 });
      }

      const hashed = await bcrypt.hash(newPassword, 12);

      await sql`
        UPDATE clinic.users
        SET password_hash = ${hashed}
        WHERE id = ${uid}
      `;

      await sql`
        DELETE FROM clinic.sessions
        WHERE clinic_user_id = ${uid}
      `;

      const [userRow] = await sql`
        SELECT public_id, email
        FROM clinic.users
        WHERE id = ${uid}
        LIMIT 1
      `;

      const [membership] = await sql`
        SELECT clinic_id
        FROM clinic.memberships
        WHERE clinic_user_id = ${uid}
          AND status = 'active'
          AND disabled_at IS NULL
        ORDER BY accepted_at ASC NULLS LAST, id ASC
        LIMIT 1
      `;

      await logClinicAudit({
        clinicId: membership?.clinic_id || null,
        clinicUserId: Number(uid),
        action: "CLINIC_PASSWORD_RESET_COMPLETED",
        entityType: "clinic_user",
        entityId: userRow?.public_id || uid,
        details: { email: userRow?.email || null },
        request,
      });

      return Response.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "POST /api/clinic/auth/reset-password error");
      return Response.json({ error: "Failed to reset password" }, { status: 500 });
    }
  });
}
