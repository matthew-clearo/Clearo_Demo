import sql from "@/app/api/utils/sql";
import { assertTableColumns } from "@/app/api/utils/schemaGuard";

let patientSessionColumnsEnsured = false;

export async function ensurePatientSessionColumns({
  context = "patient session schema validation",
} = {}) {
  if (patientSessionColumnsEnsured) {
    return;
  }

  await assertTableColumns({
    table: "auth_users",
    columns: ["session_version"],
    context,
  });

  patientSessionColumnsEnsured = true;
}

export async function revokePatientSessions(userId) {
  if (!userId) {
    throw new Error("revokePatientSessions requires a userId");
  }

  await ensurePatientSessionColumns();

  await sql`
    UPDATE auth_users
    SET session_version = COALESCE(session_version, 0) + 1
    WHERE id = ${userId}
  `;
}
