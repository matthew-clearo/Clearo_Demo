import { sqlWithRLS } from "@/app/api/utils/sql";
import { auth } from "@/auth";
import logger from "@/app/api/utils/logger";
import {
  withFullProtection,
  withFullProtectionAndCsrf,
} from "@/app/api/utils/ddosProtection";
import {
  isValidEmail,
  isValidPhone,
  isValidDate,
} from "@/app/api/utils/validation";
import {
  ensurePatientProfilePhiColumns,
  hydratePatientProfileFromPhi,
  upsertPatientProfileWithPhi,
} from "@/app/api/utils/patientProfilePhi";
import { assertActivePatientAccount } from "@/app/api/utils/patientAccountStatus";

export async function GET(request) {
  return withFullProtection(request, "default", async () => {
    try {
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;
      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      await ensurePatientProfilePhiColumns();

      const [profileRows] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT 
            public_id as id,
            user_id,
            full_name,
            dob,
            phone,
            email,
            symptoms_reason,
            safety_answers,
            full_name_token,
            dob_token,
            phone_token,
            email_token,
            symptoms_reason_token,
            safety_answers_token,
            created_at,
            updated_at
          FROM patient_profiles
          WHERE user_id = ${userId}
          LIMIT 1
        `,
      ]);

      const profile = await hydratePatientProfileFromPhi(
        profileRows?.[0] || null,
        request,
        userId,
      );

      return Response.json({ profile });
    } catch (err) {
      logger.error({ err }, "GET /api/user/patient-profile error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

export async function PUT(request) {
  return withFullProtectionAndCsrf(request, "default", async () => {
    try {
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;
      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      const body = await request.json();

      const fullName = body?.full_name ?? body?.fullName ?? null;
      const dob = body?.dob ?? null; // YYYY-MM-DD
      const phone = body?.phone ?? null;
      const email = body?.email ?? null;
      const symptomsReason =
        body?.symptoms_reason ?? body?.symptomsReason ?? null;
      const safetyAnswers = body?.safety_answers ?? body?.safetyAnswers ?? null;

      // Validation
      if (email && !isValidEmail(email)) {
        return Response.json(
          { error: "Invalid email address" },
          { status: 400 },
        );
      }

      if (phone && !isValidPhone(phone)) {
        return Response.json(
          { error: "Invalid Australian phone number" },
          { status: 400 },
        );
      }

      if (dob && !isValidDate(dob)) {
        return Response.json(
          { error: "Invalid date of birth format. Use YYYY-MM-DD" },
          { status: 400 },
        );
      }

      // Length validations
      if (fullName && fullName.length > 200) {
        return Response.json(
          { error: "Full name too long (max 200 characters)" },
          { status: 400 },
        );
      }

      if (symptomsReason && symptomsReason.length > 1000) {
        return Response.json(
          { error: "Symptoms description too long (max 1000 characters)" },
          { status: 400 },
        );
      }

      const saved = await upsertPatientProfileWithPhi({
        userId,
        request,
        profile: {
          full_name: fullName,
          dob,
          phone,
          email,
          symptoms_reason: symptomsReason,
          safety_answers: safetyAnswers,
        },
      });

      const hydrated = await hydratePatientProfileFromPhi(saved, request, userId);
      return Response.json({ profile: hydrated });
    } catch (err) {
      logger.error({ err }, "PUT /api/user/patient-profile error");
      if (
        typeof err?.message === "string" &&
        (err.message.includes("PHI_VAULT_DATABASE_URL") ||
          err.message.includes("PHI_ENCRYPTION_KEY") ||
          err.message.includes("Failed to tokenize PHI") ||
          err.message.includes("Failed to detokenize PHI"))
      ) {
        return Response.json(
          {
            error:
              "A required service is temporarily unavailable. Please try again later.",
          },
          { status: 503 },
        );
      }
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
