import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { requireClinicUser } from "@/app/api/utils/clinicAuth";
import { clinicUserIsMfaEligible } from "@/app/api/utils/clinicMfa";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const authResult = await requireClinicUser(request, { allowPendingMfa: true });
      if (authResult instanceof Response) return authResult;

      const { clinicUser, memberships, mfaRequired, mfaEnabled, mfaVerified } = authResult;
      const mfaEligible = await clinicUserIsMfaEligible(clinicUser.id);

      return Response.json({
        user: {
          id: clinicUser.public_id,
          email: clinicUser.email,
          name: clinicUser.name,
          mfa_enabled: mfaEnabled,
        },
        memberships,
        mfa_required: mfaRequired,
        mfa_eligible: mfaEligible,
        mfa_enabled: mfaEnabled,
        mfa_verified: mfaVerified,
      });
    } catch (err) {
      logger.error({ err }, "GET /api/clinic/auth/me error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
