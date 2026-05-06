import { withFullProtection } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";
import { consumeClinicVerificationToken } from "@/app/api/utils/clinicEmailAuth";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const url = new URL(request.url, "http://localhost");
      const uid = (url.searchParams.get("uid") || "").trim();
      const token = (url.searchParams.get("token") || "").trim();

      if (!uid || !token) {
        return Response.json({ error: "Missing verification data" }, { status: 400 });
      }

      const consumed = await consumeClinicVerificationToken(uid, token);
      if (!consumed) {
        return Response.json({ error: "Invalid or expired verification token" }, { status: 401 });
      }

      await sql`
        UPDATE clinic.users
        SET email_verified_at = NOW()
        WHERE id = ${uid}
      `;

      return Response.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "GET /api/clinic/auth/verify-email error");
      return Response.json({ error: "Failed to verify email" }, { status: 500 });
    }
  });
}
