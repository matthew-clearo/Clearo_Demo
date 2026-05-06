import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { requireClinicUser } from "@/app/api/utils/clinicAuth";
import {
  createProviderReferralDownloadUrl,
  readStoredReferralMetadata,
  readStoredReferralFile,
  verifySignedReferralFileUrl,
} from "@/app/api/utils/referralFiles";

function buildDownloadName(metadata) {
  const baseName = metadata?.originalFileName || `referral${metadata?.extension || ""}`;
  return baseName.replace(/[^A-Za-z0-9._-]/g, "_");
}

export async function GET(request, { params }) {
  return withFullProtection(request, "referral-file", async () => {
    try {
      const fileId = params?.fileId;
      const { searchParams } = new URL(request.url, "http://localhost");
      const expires = searchParams.get("expires");
      const sig = searchParams.get("sig");

      if (!verifySignedReferralFileUrl(fileId, expires, sig)) {
        return Response.json({ error: "Invalid or expired referral file link." }, { status: 403 });
      }

      const [clinicUserResult, session, metadata] = await Promise.all([
        requireClinicUser(request, { allowPendingMfa: false }),
        auth(request),
        readStoredReferralMetadata(fileId),
      ]);
      const appUserId = session?.user?.id || null;

      const bookingRows = await sql`
        SELECT
          b.id,
          b.user_id,
          b.clinic_id
        FROM bookings b
        WHERE b.referral_file_id = ${fileId}
        LIMIT 1
      `;
      const booking = bookingRows[0] || null;

      let authorized = false;

      if (
        appUserId &&
        metadata?.ownerUserId &&
        String(metadata.ownerUserId) === String(appUserId)
      ) {
        authorized = true;
      }

      if (booking && appUserId && String(booking.user_id) === String(appUserId)) {
        authorized = true;
      }

      if (
        !authorized &&
        booking &&
        clinicUserResult &&
        !(clinicUserResult instanceof Response)
      ) {
        authorized = clinicUserResult.memberships.some(
          (membership) => Number(membership.clinic_id) === Number(booking.clinic_id),
        );
      }

      if (!authorized) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const providerUrl = await createProviderReferralDownloadUrl(fileId, metadata);
      if (providerUrl) {
        return Response.redirect(providerUrl, 302);
      }

      const { buffer } = await readStoredReferralFile(fileId);

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": metadata.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${buildDownloadName(metadata)}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return Response.json({ error: "Referral file not found." }, { status: 404 });
      }
      logger.error({ err: error }, "GET /api/referrals/files/[fileId] error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
