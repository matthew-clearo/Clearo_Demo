import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

function shouldUseSecureCookies(requestUrl) {
	const envUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;

	// Prefer explicit configured URL when valid.
	if (envUrl) {
		try {
			return new URL(envUrl).protocol === 'https:';
		} catch {
			// Fall through to request URL / environment fallback.
		}
	}

	// Derive from current request URL if available.
	if (requestUrl) {
		try {
			return new URL(requestUrl).protocol === 'https:';
		} catch {
			// Fall through to environment fallback.
		}
	}

	return process.env.NODE_ENV === 'production';
}

export default function CreateAuth() {
	const auth = async () => {
		const c = getContext();
		const token = await getToken({
			req: c.req.raw,
			secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
			secureCookie: shouldUseSecureCookies(c.req.raw?.url),
		});
		if (token) {
			return {
				user: {
					id: token.sub,
					email: token.email,
					name: token.name,
					image: token.picture,
				},
				expires: token.exp.toString(),
			};
		}
	};
	return {
		auth,
	};
}
