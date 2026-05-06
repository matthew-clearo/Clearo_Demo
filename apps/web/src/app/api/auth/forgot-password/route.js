import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import {
  generateRawToken,
  storeOneTimeToken,
} from "@/app/api/utils/authTokens";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { sendSystemEmail } from "@/app/api/utils/emailTemplates";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an account exists for this email, a reset link will be sent shortly.",
};

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "password-reset", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email) {
        return Response.json(GENERIC_RESPONSE, { status: 200 });
      }

      const [user] = await sql`
        SELECT id, email
        FROM auth_users
        WHERE lower(email) = ${email}
        LIMIT 1
      `;

      if (user) {
        const resetToken = generateRawToken();
        const resetExpiry = new Date(Date.now() + 30 * 60 * 1000);
        const identifier = `reset-password:${user.id}`;

        await storeOneTimeToken({
          identifier,
          rawToken: resetToken,
          expiresAt: resetExpiry,
        });

        const appUrl = getRequiredPublicAppOrigin();
        const resetUrl = `${appUrl.replace(/\/$/, "")}/account/reset-password?uid=${encodeURIComponent(user.id)}&token=${encodeURIComponent(resetToken)}`;

        await sendSystemEmail({
          slug: "password-reset",
          to: user.email,
          mergeValues: {
            reset_url: resetUrl,
            expiry_window: "30 minutes",
          },
        }).catch((err) => {
          logger.error({ err }, "Failed to send password reset email");
        });

        await logAudit({
          userId: user.id,
          action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
          entityType: "user",
          entityId: user.id,
          details: { reset_requested: true },
          request,
        });
      }

      return Response.json(GENERIC_RESPONSE, { status: 200 });
    } catch (error) {
      logger.error({ err: error }, "POST /api/auth/forgot-password error");
      return Response.json(GENERIC_RESPONSE, { status: 200 });
    }
  });
}
