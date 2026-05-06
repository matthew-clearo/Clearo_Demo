import {
  generateRawToken,
  storeOneTimeToken,
  consumeOneTimeToken,
} from "./authTokens";
import { sendSystemEmail } from "./emailTemplates";
import { getClinicAppOrigin, toClinicCanonicalPath } from "@/utils/clinicPortal";
import { getRequiredClinicAppOrigin } from "@/utils/siteSurface";

function getClinicBaseUrl() {
  return getClinicAppOrigin() || getRequiredClinicAppOrigin();
}

export async function issueClinicVerificationLink(clinicUserId, email) {
  const verifyToken = generateRawToken();
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const identifier = `clinic-verify-email:${clinicUserId}`;

  await storeOneTimeToken({
    identifier,
    rawToken: verifyToken,
    expiresAt: verifyExpiry,
  });

  const verifyUrl = `${getClinicBaseUrl()}${toClinicCanonicalPath(
    `/verify-email?uid=${encodeURIComponent(clinicUserId)}&token=${encodeURIComponent(verifyToken)}`,
  )}`;

  return sendSystemEmail({
    slug: "clinic-account-verification",
    to: email,
    mergeValues: {
      verify_url: verifyUrl,
      expiry_window: "24 hours",
    },
  });
}

export async function issueClinicPasswordResetLink(clinicUserId, email) {
  const resetToken = generateRawToken();
  const resetExpiry = new Date(Date.now() + 30 * 60 * 1000);
  const identifier = `clinic-reset-password:${clinicUserId}`;

  await storeOneTimeToken({
    identifier,
    rawToken: resetToken,
    expiresAt: resetExpiry,
  });

  const resetUrl = `${getClinicBaseUrl()}${toClinicCanonicalPath(
    `/reset-password?uid=${encodeURIComponent(clinicUserId)}&token=${encodeURIComponent(resetToken)}`,
  )}`;

  return sendSystemEmail({
    slug: "clinic-password-reset",
    to: email,
    mergeValues: {
      reset_url: resetUrl,
      expiry_window: "30 minutes",
    },
  });
}

export async function consumeClinicVerificationToken(clinicUserId, rawToken) {
  return consumeOneTimeToken({
    identifier: `clinic-verify-email:${clinicUserId}`,
    rawToken,
  });
}

export async function consumeClinicPasswordResetToken(clinicUserId, rawToken) {
  return consumeOneTimeToken({
    identifier: `clinic-reset-password:${clinicUserId}`,
    rawToken,
  });
}
