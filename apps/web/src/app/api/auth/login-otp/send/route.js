import { withRateLimit } from "@/app/api/utils/rateLimit";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import { sendSystemEmail } from "@/app/api/utils/emailTemplates";
import { storeOneTimeToken } from "@/app/api/utils/authTokens";
import { validatePatientLoginAttempt } from "@/app/api/utils/patientCredentialAuth";
import {
    buildLoginCookie,
    clearLoginCookie,
    createLoginOtpIdentifier,
    generateLoginChallengeToken,
    getCookieValue,
    LOGIN_CHALLENGE_COOKIE,
    LOGIN_OTP_EXPIRY_MINUTES,
    LOGIN_VERIFIED_COOKIE,
    normalizeLoginEmail,
} from "@/app/api/utils/loginOtp";
import { randomInt } from "crypto";
import { isDemoEmail, isDemoMode } from "@/app/api/utils/demoMode";

/**
 * POST /api/auth/login-otp/send
 *
 * Called after the user submits email/password. This route validates
 * credentials without creating a session, then sends the OTP challenge.
 *
 * Body: { email: string, password?: string, captchaToken?: string }
 */
export async function POST(request) {
    return withFullProtectionAndCsrf(request, "login-otp-send", () =>
        withRateLimit(request, "login-otp-send", async () => {
            try {
                const body = await request.json();
                const email = normalizeLoginEmail(body?.email);
                const password = typeof body?.password === "string" ? body.password : "";
                const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";

                if (!email) {
                    return Response.json({ error: "Email is required" }, { status: 400 });
                }

                let challengeToken = getCookieValue(request, LOGIN_CHALLENGE_COOKIE);
                const shouldValidateCredentials = !challengeToken;

                if (shouldValidateCredentials) {
                    const user = await validatePatientLoginAttempt({
                        request,
                        credentials: {
                            email,
                            password,
                            captchaToken,
                        },
                    });

                    if (!user) {
                        return Response.json({ error: "CredentialsSignin" }, { status: 401 });
                    }

                    challengeToken = generateLoginChallengeToken();
                }

                const code = isDemoMode() && isDemoEmail(email)
                    ? "000000"
                    : String(randomInt(100000, 999999));
                const expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000);
                await storeOneTimeToken({
                    identifier: createLoginOtpIdentifier(email, challengeToken),
                    rawToken: code,
                    expiresAt,
                });

                try {
                    await sendSystemEmail({
                        slug: "login-otp",
                        to: email,
                        mergeValues: {
                            otp_code: code,
                            expiry_minutes: String(LOGIN_OTP_EXPIRY_MINUTES),
                        },
                    });
                } catch (emailErr) {
                    logger.error({ err: emailErr }, "Failed to send login OTP email");
                    return Response.json(
                        { error: "Could not send verification email. Please try again." },
                        { status: 503 },
                    );
                }

                const response = Response.json({ sent: true });
                response.headers.append(
                    "Set-Cookie",
                    buildLoginCookie({
                        request,
                        name: LOGIN_CHALLENGE_COOKIE,
                        value: challengeToken,
                        maxAgeSeconds: LOGIN_OTP_EXPIRY_MINUTES * 60,
                        path: "/api/auth",
                    }),
                );
                response.headers.append(
                    "Set-Cookie",
                    clearLoginCookie({
                        request,
                        name: LOGIN_VERIFIED_COOKIE,
                        path: "/api/auth",
                    }),
                );
                return response;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
                if (
                    message === "CredentialsSignin" ||
                    message === "EmailNotVerified" ||
                    message === "CaptchaRequired" ||
                    message === "CaptchaUnavailable" ||
                    message === "CaptchaValidationFailed" ||
                    message === "AccountDisabled"
                ) {
                    const status = message === "CredentialsSignin" ? 401 : 400;
                    return Response.json({ error: message }, { status });
                }
                logger.error({ err }, "Error in login OTP send");
                return Response.json(
                    { error: "Something went wrong. Please try again." },
                    { status: 500 },
                );
            }
        }),
    );
}
