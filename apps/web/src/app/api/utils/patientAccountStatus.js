import { sqlWithRLS } from "@/app/api/utils/sql";
import { ensurePatientSessionColumns } from "@/app/api/utils/patientSessions";

export function isPatientAccountDisabled(user) {
  return Boolean(
    user && (user.role === "disabled" || user.admin_disabled_at !== null),
  );
}

export async function getPatientAccountStatus(userId) {
  if (!userId) {
    return null;
  }

  await ensurePatientSessionColumns();

  const [[user]] = await sqlWithRLS(userId, "patient", (tx) => [
    tx`
      SELECT
        id,
        role,
        admin_disabled_at,
        "emailVerified",
        COALESCE(session_version, 0) AS session_version
      FROM auth_users
      WHERE id = ${userId}
      LIMIT 1
    `,
  ]);

  if (!user) {
    return null;
  }

  return {
    ...user,
    disabled: isPatientAccountDisabled(user),
  };
}

export async function assertActivePatientAccount(userId) {
  const status = await getPatientAccountStatus(userId);

  if (!status) {
    return {
      ok: false,
      statusCode: 401,
      error: "Unauthorized",
    };
  }

  if (status.disabled) {
    return {
      ok: false,
      statusCode: 403,
      error: "This account has been disabled.",
    };
  }

  return {
    ok: true,
    user: status,
  };
}
