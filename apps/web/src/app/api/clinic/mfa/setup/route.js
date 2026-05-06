import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicUser, getClinicMemberships } from "@/app/api/utils/clinicAuth";
import {
  clinicUserIsMfaEligible,
  generateClinicMfaSetup,
  isClinicMfaEnabled,
} from "@/app/api/utils/clinicMfa";

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const authResult = await requireClinicUser(request);
      if (authResult instanceof Response) return authResult;

      const { clinicUser } = authResult;
      await getClinicMemberships(clinicUser.id);
      const mfaEligible = await clinicUserIsMfaEligible(clinicUser.id);

      if (!mfaEligible) {
        return Response.json({ error: "MFA setup is only available for active clinic staff." }, { status: 403 });
      }

      const alreadyEnabled = await isClinicMfaEnabled(clinicUser.id);
      if (alreadyEnabled) {
        return Response.json({ error: "MFA is already enabled. Disable it first to reconfigure." }, { status: 409 });
      }

      const setup = await generateClinicMfaSetup(clinicUser.id, clinicUser.email);
      return Response.json(setup);
    } catch (err) {
      logger.error({ err }, "POST /api/clinic/mfa/setup error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
