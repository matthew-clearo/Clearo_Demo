import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";
import {
  generateRawToken,
  storeOneTimeToken,
} from "@/app/api/utils/authTokens";
import { sendSystemEmail } from "@/app/api/utils/emailTemplates";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If that account exists and still needs verification, a new link will be sent shortly.",
};

async function issueVerificationLink(userId, email) {
  const verifyToken = generateRawToken();
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const identifier = `verify-email:${userId}`;

  await storeOneTimeToken({
    identifier,
    rawToken: verifyToken,
    expiresAt: verifyExpiry,
  });

  const appUrl = getRequiredPublicAppOrigin();
  const verifyUrl = `${appUrl.replace(/\/$/, "")}/account/verify-email?uid=${encodeURIComponent(userId)}&token=${encodeURIComponent(verifyToken)}`;

  const emailSent = await sendSystemEmail({
    slug: "account-verification",
    to: email,
    mergeValues: {
      verify_url: verifyUrl,
      expiry_window: "24 hours",
    },
  });

  if (!emailSent) {
    throw new Error("VerificationEmailUnavailable");
  }
}

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "auth-signup", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

      if (!email) {
        return Response.json(GENERIC_RESPONSE, { status: 200 });
      }

      const [user] = await sql`
        SELECT id, email, "emailVerified"
        FROM auth_users
        WHERE lower(email) = ${email}
        LIMIT 1
      `;

      if (user && !user.emailVerified) {
        await issueVerificationLink(user.id, user.email).catch((err) => {
          logger.error({ err, userId: user.id }, "Failed to resend verification email");
        });
      }

      return Response.json(GENERIC_RESPONSE, { status: 200 });
    } catch (error) {
      logger.error({ err: error }, "POST /api/auth/resend-verification error");
      return Response.json(GENERIC_RESPONSE, { status: 200 });
    }
  });
}
