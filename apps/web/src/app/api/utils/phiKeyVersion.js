const DEFAULT_PHI_KEY_VERSION = "v1";
const KEY_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/;

function normalizePhiKeyVersion(value, { envVar, fallback = null } = {}) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return fallback;
  }

  if (!KEY_VERSION_PATTERN.test(normalized)) {
    const error = new Error(
      `${envVar || "PHI key version"} must be 1-50 characters and contain only letters, numbers, '.', '_' or '-'`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

export function getActivePhiKeyVersion() {
  return normalizePhiKeyVersion(process.env.PHI_KEY_VERSION, {
    envVar: "PHI_KEY_VERSION",
    fallback: DEFAULT_PHI_KEY_VERSION,
  });
}

export function getPendingPhiKeyVersion() {
  return normalizePhiKeyVersion(process.env.NEW_PHI_KEY_VERSION, {
    envVar: "NEW_PHI_KEY_VERSION",
    fallback: null,
  });
}

export { DEFAULT_PHI_KEY_VERSION };
