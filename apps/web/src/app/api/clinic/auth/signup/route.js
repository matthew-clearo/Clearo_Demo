import bcrypt from "bcryptjs";
import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import {
  finalizeClinicInvitation,
  validateClinicInvitationToken,
} from "@/app/api/utils/clinicInvitations";
import { issueClinicVerificationLink } from "@/app/api/utils/clinicEmailAuth";
import { captchaFailureResponse, verifyCaptchaToken } from "@/app/api/utils/captcha";

function isStrongPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-auth-signup", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const clinicInviteToken =
        typeof body.clinicInviteToken === "string" ? body.clinicInviteToken.trim() : "";
      const captchaToken =
        typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

      if (!email || !password || !name) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }

      const captchaCheck = await verifyCaptchaToken(request, captchaToken, {
        expectedAction: "clinic_signup",
        route: "/api/clinic/auth/signup",
      });
      if (!captchaCheck.success) {
        return captchaFailureResponse(captchaCheck.reason, captchaCheck);
      }

      if (!isStrongPassword(password)) {
        return Response.json({ error: "Password does not meet complexity requirements" }, { status: 400 });
      }

      let validatedInvite = null;
      if (clinicInviteToken) {
        validatedInvite = await validateClinicInvitationToken({ email, rawToken: clinicInviteToken });
        if (!validatedInvite) {
          return Response.json({ error: "Invalid or expired clinic invitation link" }, { status: 401 });
        }
      }

      const [existingUser] = await sql`
        SELECT id
        FROM clinic.users
        WHERE normalized_email = ${email}
        LIMIT 1
      `;

      if (existingUser) {
        return Response.json(
          { error: "An account already exists for this clinic email. Please sign in instead." },
          { status: 409 },
        );
      }

      const [createdUser] = await sql`
        INSERT INTO clinic.users (
          email,
          normalized_email,
          name,
          password_hash,
          email_verified_at,
          status
        )
        VALUES (
          ${email},
          ${email},
          ${name},
          ${await bcrypt.hash(password, 12)},
          NULL,
          'active'
        )
        RETURNING id, public_id
      `;

      if (validatedInvite) {
        await finalizeClinicInvitation({
          clinicUserId: createdUser.id,
          inviteId: validatedInvite.id,
        });
      }

      const emailSent = await issueClinicVerificationLink(createdUser.id, email);
      if (!emailSent) {
        throw new Error("ClinicVerificationEmailUnavailable");
      }

      return Response.json({
        success: true,
        userId: createdUser.public_id,
        message: "Clinic account created. Check your email to verify your account.",
      });
    } catch (err) {
      logger.error({ err }, "POST /api/clinic/auth/signup error");
      if (err?.message === "ClinicVerificationEmailUnavailable") {
        return Response.json(
          { error: "We could not send a verification email right now. Please try again shortly." },
          { status: 503 },
        );
      }
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
