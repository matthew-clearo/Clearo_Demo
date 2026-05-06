import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import { consumeOneTimeToken, storeOneTimeToken } from "@/app/api/utils/authTokens";
import {
    buildLoginCookie,
    clearLoginCookie,
    createLoginCompleteIdentifier,
    createLoginOtpIdentifier,
    generateVerifiedLoginToken,
    getCookieValue,
    LOGIN_CHALLENGE_COOKIE,
    LOGIN_VERIFIED_COOKIE,
    LOGIN_VERIFIED_EXPIRY_MINUTES,
    normalizeLoginEmail,
} from "@/app/api/utils/loginOtp";

/**
 * POST /api/auth/login-otp/verify
 *
 * Verifies the 6-digit OTP code sent to the user's email.
 * On success, mints a short-lived verified-login token that the
 * credentials callback must consume before creating a real session.
 *
 * Body: { email: string, code: string }
 */
export async function POST(request) {
    return withFullProtectionAndCsrf(request, "login-otp-verify", async () => {
        try {
            const body = await request.json();
            const email = normalizeLoginEmail(body?.email);
            const code = String(body?.code || "").trim();

            if (!email || !code) {
                return Response.json(
                    { error: "Email and verification code are required" },
                    { status: 400 },
                );
            }

            // Validate code format (6 digits)
            if (!/^\d{6}$/.test(code)) {
                return Response.json(
                    { error: "Invalid verification code format" },
                    { status: 400 },
                );
            }

            const challengeToken = getCookieValue(request, LOGIN_CHALLENGE_COOKIE);
            if (!challengeToken) {
                return Response.json(
                    { error: "Login session expired. Please sign in again." },
                    { status: 401 },
                );
            }

            const tokenRow = await consumeOneTimeToken({
                identifier: createLoginOtpIdentifier(email, challengeToken),
                rawToken: code,
            });

            if (!tokenRow) {
                return Response.json(
                    { error: "Invalid or expired verification code. Please request a new one." },
                    { status: 401 },
                );
            }

            const verifiedLoginToken = generateVerifiedLoginToken();
            await storeOneTimeToken({
                identifier: createLoginCompleteIdentifier(email),
                rawToken: verifiedLoginToken,
                expiresAt: new Date(Date.now() + LOGIN_VERIFIED_EXPIRY_MINUTES * 60 * 1000),
            });

            const response = Response.json({ verified: true });
            response.headers.append(
                "Set-Cookie",
                buildLoginCookie({
                    request,
                    name: LOGIN_VERIFIED_COOKIE,
                    value: verifiedLoginToken,
                    maxAgeSeconds: LOGIN_VERIFIED_EXPIRY_MINUTES * 60,
                    path: "/api/auth",
                }),
            );
            response.headers.append(
                "Set-Cookie",
                clearLoginCookie({
                    request,
                    name: LOGIN_CHALLENGE_COOKIE,
                    path: "/api/auth",
                }),
            );
            return response;
        } catch (err) {
            logger.error({ err }, "Error in login OTP verify");
            return Response.json(
                { error: "Something went wrong. Please try again." },
                { status: 500 },
            );
        }
    });
}
