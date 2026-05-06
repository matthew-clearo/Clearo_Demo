import { withFullProtection } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";
import { consumeOneTimeToken } from "@/app/api/utils/authTokens";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const url = new URL(request.url, "http://localhost");
      const uid = (url.searchParams.get("uid") || "").trim();
      const token = (url.searchParams.get("token") || "").trim();

      if (!uid || !token) {
        return Response.json({ error: "Missing verification data" }, { status: 400 });
      }

      const consumed = await consumeOneTimeToken({
        identifier: `verify-email:${uid}`,
        rawToken: token,
      });
      if (!consumed) {
        return Response.json({ error: "Invalid or expired verification token" }, { status: 401 });
      }

      await sql`
        UPDATE auth_users
        SET "emailVerified" = NOW()
        WHERE id = ${uid}
      `;

      await logAudit({
        userId: uid,
        action: AUDIT_ACTIONS.USER_SIGNUP,
        entityType: "user",
        entityId: uid,
        details: { email_verified: true },
        request,
      });

      return Response.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "GET /api/auth/verify-email error");
      return Response.json({ error: "Failed to verify email" }, { status: 500 });
    }
  });
}
