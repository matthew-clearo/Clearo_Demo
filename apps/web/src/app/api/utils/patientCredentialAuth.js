import bcrypt from "bcryptjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { verifyCaptchaToken } from "@/app/api/utils/captcha";
import { getPatientAccountStatus } from "@/app/api/utils/patientAccountStatus";
import { consumeOneTimeToken } from "@/app/api/utils/authTokens";
import {
  createLoginCompleteIdentifier,
  getCookieValue,
  LOGIN_VERIFIED_COOKIE,
} from "@/app/api/utils/loginOtp";
import NeonAdapter from "@/server/adapter";

function mapCaptchaFailureToError(reason) {
  if (reason === "missing") return "CaptchaRequired";
  if (reason === "unavailable") return "CaptchaUnavailable";
  return "CaptchaValidationFailed";
}

neonConfig.webSocketConstructor = ws;

let defaultAdapter = null;

function getAuthAdapter(adapter) {
  if (adapter) {
    return adapter;
  }

  if (!defaultAdapter) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    defaultAdapter = NeonAdapter(pool);
  }

  return defaultAdapter;
}

export async function validatePatientLoginAttempt({
  request,
  adapter,
  credentials,
  requireCaptcha = true,
  requirePassword = true,
}) {
  const { email, password, captchaToken } = credentials || {};
  if (!email || (requirePassword && !password)) {
    return null;
  }
  if (typeof email !== "string" || (requirePassword && typeof password !== "string")) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (requireCaptcha) {
    const captchaCheck = await verifyCaptchaToken(request, captchaToken, {
      expectedAction: "login",
      route: "/api/auth/callback/credentials-signin",
    });
    if (!captchaCheck.success) {
      await logAudit({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: "user",
        details: { email: normalizedEmail, reason: `captcha_${captchaCheck.reason}` },
        request,
      });
      throw new Error(mapCaptchaFailureToError(captchaCheck.reason));
    }
  }

  const authAdapter = getAuthAdapter(adapter);
  const user = await authAdapter.getUserByEmail(normalizedEmail);
  if (!user) {
    await logAudit({
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: "user",
      details: { email: normalizedEmail, reason: "invalid_credentials" },
      request,
    });
    return null;
  }

  const matchingAccount = user.accounts.find(
    (account) => account.provider === "credentials",
  );
  const accountPassword = matchingAccount?.password;
  if (!accountPassword) {
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: "user",
      entityId: user.id,
      details: { email: normalizedEmail, reason: "credentials_account_missing" },
      request,
    });
    return null;
  }

  if (!user.emailVerified) {
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: "user",
      entityId: user.id,
      details: { email: normalizedEmail, reason: "email_not_verified" },
      request,
    });
    throw new Error("EmailNotVerified");
  }

  if (requirePassword) {
    const isValid = await bcrypt.compare(password, accountPassword);
    if (!isValid) {
      await logAudit({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: "user",
        entityId: user.id,
        details: { email: normalizedEmail, reason: "invalid_credentials" },
        request,
      });
      return null;
    }
  }

  const accountStatus = await getPatientAccountStatus(user.id);
  if (!accountStatus || accountStatus.disabled) {
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: "user",
      entityId: user.id,
      details: { email: normalizedEmail, reason: "account_disabled" },
      request,
    });
    throw new Error("AccountDisabled");
  }

  return user;
}

export async function authorizePatientCredentials({ request, adapter, credentials }) {
  const normalizedEmail = String(credentials?.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const verifiedLoginToken = getCookieValue(request, LOGIN_VERIFIED_COOKIE);
  if (!verifiedLoginToken) {
    await logAudit({
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: "user",
      details: { email: normalizedEmail, reason: "otp_required" },
      request,
    });
    throw new Error("OtpRequired");
  }

  const user = await validatePatientLoginAttempt({
    request,
    adapter,
    credentials,
    requireCaptcha: false,
    requirePassword: false,
  });

  if (!user) {
    return null;
  }

  const consumedOtp = await consumeOneTimeToken({
    identifier: createLoginCompleteIdentifier(normalizedEmail),
    rawToken: verifiedLoginToken,
  });

  if (!consumedOtp) {
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: "user",
      entityId: user.id,
      details: { email: normalizedEmail, reason: "otp_required" },
      request,
    });
    throw new Error("OtpRequired");
  }

  await logAudit({
    userId: user.id,
    action: AUDIT_ACTIONS.USER_LOGIN,
    entityType: "user",
    entityId: user.id,
    details: { email: normalizedEmail },
    request,
  });

  return user;
}
