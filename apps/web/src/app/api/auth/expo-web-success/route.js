import { getToken } from "@auth/core/jwt";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

function shouldUseSecureCookies(requestUrl) {
  const envUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;

  if (envUrl) {
    try {
      return new URL(envUrl).protocol === "https:";
    } catch {
      // Ignore malformed env URL and continue with request URL.
    }
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).protocol === "https:";
    } catch {
      // Ignore malformed request URL and continue with env fallback.
    }
  }

  return process.env.NODE_ENV === "production";
}

export async function GET(request) {
  const secureCookie = shouldUseSecureCookies(request?.url);

  const [token, jwt] = await Promise.all([
    getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie,
      raw: true,
    }),
    getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie,
    }),
  ]);

  // Use specific target origin instead of wildcard for security
  const targetOrigin =
    process.env.EXPO_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    getRequiredPublicAppOrigin();

  if (!jwt) {
    return new Response(
      `
			<html>
				<body>
					<script>
						const targetOrigin = '${targetOrigin}';
						window.parent.postMessage({ type: 'AUTH_ERROR', error: 'Unauthorized' }, targetOrigin);
					</script>
				</body>
			</html>
			`,
      {
        status: 401,
        headers: {
          "Content-Type": "text/html",
          "X-Frame-Options": "SAMEORIGIN",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  const message = {
    type: "AUTH_SUCCESS",
    jwt: token,
    user: {
      id: jwt.sub,
      email: jwt.email,
      name: jwt.name,
    },
  };

  return new Response(
    `
		<html>
			<body>
				<script>
					const targetOrigin = '${targetOrigin}';
					window.parent.postMessage(${JSON.stringify(message)}, targetOrigin);
				</script>
			</body>
		</html>
		`,
    {
      headers: {
        "Content-Type": "text/html",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
