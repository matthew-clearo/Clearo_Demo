import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicUser } from "@/app/api/utils/clinicAuth";
import { logClinicAudit } from "@/app/api/utils/clinicAudit";
import {
  clinicUserIsMfaEligible,
  createClinicMfaCookie,
  verifyClinicMfaToken,
} from "@/app/api/utils/clinicMfa";

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const authResult = await requireClinicUser(request, { allowPendingMfa: true });
      if (authResult instanceof Response) return authResult;

      const { clinicUser, memberships } = authResult;
      const mfaEligible = await clinicUserIsMfaEligible(clinicUser.id);
      if (!mfaEligible) {
        return Response.json({ error: "MFA verification is only available for active clinic staff." }, { status: 403 });
      }

      const body = await request.json().catch(() => ({}));
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!token) {
        return Response.json({ error: "MFA code is required" }, { status: 400 });
      }

      await verifyClinicMfaToken(clinicUser.id, token);
      await logClinicAudit({
        clinicId: memberships[0]?.clinic_id || null,
        clinicUserId: clinicUser.id,
        action: "CLINIC_MFA_VERIFIED",
        entityType: "clinic_user",
        entityId: clinicUser.public_id,
        details: { email: clinicUser.email },
        request,
      });
      const response = Response.json({ success: true });
      response.headers.set("Set-Cookie", createClinicMfaCookie(clinicUser.id, request));
      return response;
    } catch (err) {
      if (err?.message === "Invalid MFA code") {
        const authResult = await requireClinicUser(request, { allowPendingMfa: true });
        if (!(authResult instanceof Response)) {
          await logClinicAudit({
            clinicId: authResult.memberships[0]?.clinic_id || null,
            clinicUserId: authResult.clinicUser.id,
            action: "CLINIC_MFA_FAILED",
            entityType: "clinic_user",
            entityId: authResult.clinicUser.public_id,
            details: { email: authResult.clinicUser.email },
            request,
          });
        }
        return Response.json({ error: "Invalid MFA code" }, { status: 400 });
      }
      if (err?.message === "MFA not enabled") {
        return Response.json({ error: "MFA is not enabled for this account" }, { status: 400 });
      }
      logger.error({ err }, "POST /api/clinic/mfa/challenge error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
