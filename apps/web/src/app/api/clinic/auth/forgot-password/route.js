import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { issueClinicPasswordResetLink } from "@/app/api/utils/clinicEmailAuth";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an account exists for this clinic email, a reset link will be sent shortly.",
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
        FROM clinic.users
        WHERE normalized_email = ${email}
        LIMIT 1
      `;

      if (user) {
        await issueClinicPasswordResetLink(user.id, user.email).catch((err) => {
          logger.error({ err }, "Failed to send clinic password reset email");
        });
      }

      return Response.json(GENERIC_RESPONSE, { status: 200 });
    } catch (error) {
      logger.error({ err: error }, "POST /api/clinic/auth/forgot-password error");
      return Response.json(GENERIC_RESPONSE, { status: 200 });
    }
  });
}
