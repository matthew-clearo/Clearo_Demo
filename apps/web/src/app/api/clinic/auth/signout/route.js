import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { clearClinicSessionCookie, destroyClinicSession } from "@/app/api/utils/clinicAuth";
import { clearClinicMfaCookie } from "@/app/api/utils/clinicMfa";

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      await destroyClinicSession(request);
      const response = Response.json({ success: true });
      response.headers.append("Set-Cookie", clearClinicSessionCookie());
      response.headers.append("Set-Cookie", clearClinicMfaCookie());
      return response;
    } catch (err) {
      logger.error({ err }, "POST /api/clinic/auth/signout error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
