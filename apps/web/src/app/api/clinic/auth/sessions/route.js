import logger from "@/app/api/utils/logger";
import { withFullProtection, withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import {
  listClinicSessions,
  requireClinicUser,
  revokeClinicSession,
  revokeOtherClinicSessions,
} from "@/app/api/utils/clinicAuth";
import { getClinicMemberships } from "@/app/api/utils/clinicAuth";
import { logClinicAudit } from "@/app/api/utils/clinicAudit";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const authResult = await requireClinicUser(request);
      if (authResult instanceof Response) return authResult;

      const sessions = await listClinicSessions(authResult.clinicUser.id, request);
      return Response.json({ sessions });
    } catch (err) {
      logger.error({ err }, "GET /api/clinic/auth/sessions error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

export async function DELETE(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const authResult = await requireClinicUser(request);
      if (authResult instanceof Response) return authResult;

      const body = await request.json().catch(() => ({}));
      const action = typeof body.action === "string" ? body.action : "";

      if (action === "revoke_others") {
        const count = await revokeOtherClinicSessions(authResult.clinicUser.id, request);
        const memberships = await getClinicMemberships(authResult.clinicUser.id);
        await logClinicAudit({
          clinicId: memberships[0]?.clinic_id || null,
          clinicUserId: authResult.clinicUser.id,
          action: "CLINIC_SESSIONS_REVOKED",
          entityType: "clinic_session",
          entityId: authResult.clinicUser.public_id,
          details: { revoked_count: count },
          request,
        });
        return Response.json({ success: true, count });
      }

      if (action === "revoke_session") {
        const sessionId = Number(body.sessionId);
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
          return Response.json({ error: "Valid sessionId is required" }, { status: 400 });
        }

        const deleted = await revokeClinicSession(authResult.clinicUser.id, sessionId, request);
        if (!deleted) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        const memberships = await getClinicMemberships(authResult.clinicUser.id);
        await logClinicAudit({
          clinicId: memberships[0]?.clinic_id || null,
          clinicUserId: authResult.clinicUser.id,
          action: "CLINIC_SESSION_REVOKED",
          entityType: "clinic_session",
          entityId: String(sessionId),
          details: {},
          request,
        });

        return Response.json({ success: true });
      }

      return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
      logger.error({ err }, "DELETE /api/clinic/auth/sessions error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
