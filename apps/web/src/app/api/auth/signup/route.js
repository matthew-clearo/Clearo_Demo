import bcrypt from "bcryptjs";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";
import {
  generateRawToken,
  storeOneTimeToken,
} from "@/app/api/utils/authTokens";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { sendSystemEmail } from "@/app/api/utils/emailTemplates";
import { captchaFailureResponse, verifyCaptchaToken } from "@/app/api/utils/captcha";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";
import { isValidDate, isValidPhone } from "@/app/api/utils/validation";
import { upsertPatientProfileWithPhiAsSystem } from "@/app/api/utils/patientProfilePhi";

function isStrongPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

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
    let createdUserId = null;
    try {
      const body = await request.json().catch(() => ({}));
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const dob = typeof body.dob === "string" ? body.dob.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      const captchaToken =
        typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

      if (!email || !password || !name) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }

      if (dob && !isValidDate(dob)) {
        return Response.json(
          { error: "Invalid date of birth format. Use YYYY-MM-DD" },
          { status: 400 },
        );
      }

      if (phone && !isValidPhone(phone)) {
        return Response.json(
          { error: "Invalid Australian phone number" },
          { status: 400 },
        );
      }

      const captchaCheck = await verifyCaptchaToken(request, captchaToken, {
        expectedAction: "signup",
        route: "/api/auth/signup",
      });
      if (!captchaCheck.success) {
        return captchaFailureResponse(captchaCheck.reason, captchaCheck);
      }

      if (!isStrongPassword(password)) {
        return Response.json({ error: "Password does not meet complexity requirements" }, { status: 400 });
      }

      const [existingUser] = await sql`
        SELECT id, email, "emailVerified"
        FROM auth_users
        WHERE lower(email) = ${email}
        LIMIT 1
      `;

      if (existingUser) {
        if (!existingUser.emailVerified) {
          await issueVerificationLink(existingUser.id, email).catch((err) => {
            logger.error({ err, userId: existingUser.id }, "Failed to re-issue verification email");
          });
        }

        return Response.json(
          {
            error:
              "If this email can be used, you'll receive next-step instructions shortly.",
          },
          { status: 200 },
        );
      }

      const [createdUser] = await sql`
        INSERT INTO auth_users (name, email, "emailVerified")
        VALUES (${name}, ${email}, NULL)
        RETURNING id, email
      `;
      createdUserId = createdUser.id;

      await sql`
        INSERT INTO auth_accounts (
          "userId",
          provider,
          type,
          "providerAccountId",
          password
        )
        VALUES (
          ${createdUser.id},
          'credentials',
          'credentials',
          ${createdUser.id},
          ${await bcrypt.hash(password, 12)}
        )
      `;

      await upsertPatientProfileWithPhiAsSystem({
        userId: createdUser.id,
        request,
        profile: {
          full_name: name,
          dob: dob || null,
          phone: phone || null,
          email,
          symptoms_reason: null,
          safety_answers: null,
        },
      });

      await issueVerificationLink(createdUser.id, createdUser.email);

      await logAudit({
        userId: createdUser.id,
        action: AUDIT_ACTIONS.USER_SIGNUP,
        entityType: "user",
        entityId: createdUser.id,
        details: { verification_sent: true },
        request,
      });

      return Response.json({
        success: true,
        message: "Account created. Check your email to verify your account.",
      });
    } catch (error) {
      if (createdUserId) {
        try {
          await sql`DELETE FROM patient_profiles WHERE user_id = ${createdUserId}`;
          await sql`DELETE FROM auth_verification_token WHERE identifier = ${`verify-email:${createdUserId}`}`;
          await sql`DELETE FROM auth_accounts WHERE "userId" = ${createdUserId}`;
          await sql`DELETE FROM auth_users WHERE id = ${createdUserId}`;
        } catch (cleanupError) {
          logger.error({ err: cleanupError, createdUserId }, "Failed to roll back incomplete signup");
        }
      }

      logger.error({ err: error }, "POST /api/auth/signup error");

      if (error?.message === "VerificationEmailUnavailable") {
        return Response.json(
          { error: "We could not send a verification email right now. Please try again shortly." },
          { status: 503 },
        );
      }

      return Response.json({ error: "Failed to create account" }, { status: 500 });
    }
  });
}
