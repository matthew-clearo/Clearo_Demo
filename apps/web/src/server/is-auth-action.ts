import { AUTH_API_BASENAME } from './api-paths';

const authActions = [
    "providers",
    "session",
    "csrf",
    "signin",
    "signout",
    "callback",
    "verify-request",
    "error",
    "webauthn-options",
]

export function isAuthAction(
    pathname: string,
): boolean {
    const details = getAuthActionDetails(pathname)

    return details !== null
}

export function getAuthActionDetails(
    pathname: string,
): { action: string; providerId: string | null } | null {
    const base = AUTH_API_BASENAME
    const a = pathname.match(new RegExp(`^${base}(.+)`))

    if (a === null) {
        return null
    }

    const actionAndProviderId = a.at(-1)

    if (!actionAndProviderId) {
        return null
    }

    const b = actionAndProviderId.replace(/^\//, "").split("/").filter(Boolean)

    if (b.length !== 1 && b.length !== 2) {
        return null
    }

    const [action, providerId = null] = b

    if (!authActions.includes(action)) {
        return null
    }

    return { action, providerId }
}
