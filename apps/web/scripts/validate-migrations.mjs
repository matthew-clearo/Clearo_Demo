import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function listSqlFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "en"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message);
  }
}

export async function validateMigrations() {
  const mainDir = path.join(root, "migrations", "main");
  const phiDir = path.join(root, "migrations", "phi-vault");
  const legacySqlDir = path.join(root, "sql");
  const readmePath = path.join(root, "migrations", "README.md");

  const [mainFiles, phiFiles, legacySqlFiles, readme] = await Promise.all([
    listSqlFiles(mainDir),
    listSqlFiles(phiDir),
    listSqlFiles(legacySqlDir),
    fs.readFile(readmePath, "utf8"),
  ]);

  if (legacySqlFiles.length > 0) {
    throw new Error(
      `Legacy SQL files still exist under apps/web/sql: ${legacySqlFiles.join(", ")}. Keep canonical tracked migrations under apps/web/migrations only.`,
    );
  }

  if (mainFiles[0] !== "0_foundation_schema.sql") {
    throw new Error(
      `Expected apps/web/migrations/main to start with 0_foundation_schema.sql, found ${mainFiles[0] || "nothing"}.`,
    );
  }

  if (!phiFiles.includes("1_initial_schema.sql")) {
    throw new Error("Expected apps/web/migrations/phi-vault/1_initial_schema.sql to exist.");
  }

  assertIncludes(
    readme,
    "`npm run migrate:bootstrap`",
    "Migration README must document the canonical bootstrap command.",
  );
  if (/apps\/web\/sql\/[^\s`]+\.sql/.test(readme)) {
    throw new Error("Migration README still points at executable files under apps/web/sql/.");
  }

  const foundation = await fs.readFile(path.join(mainDir, "0_foundation_schema.sql"), "utf8");
  const requiredFragments = [
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
    "CREATE TYPE public.user_role AS ENUM",
    "CREATE TABLE IF NOT EXISTS public.auth_users",
    "CREATE TABLE IF NOT EXISTS public.auth_accounts",
    "CREATE TABLE IF NOT EXISTS public.auth_sessions",
    "CREATE TABLE IF NOT EXISTS public.auth_verification_token",
    "CREATE TABLE IF NOT EXISTS public.clinics",
    "CREATE TABLE IF NOT EXISTS public.scan_types",
    "CREATE TABLE IF NOT EXISTS public.bookings",
    "CREATE TABLE IF NOT EXISTS public.patient_profiles",
    "CREATE TABLE IF NOT EXISTS clinic.users",
    "CREATE TABLE IF NOT EXISTS clinic.sessions",
    "CREATE TABLE IF NOT EXISTS clinic.memberships",
  ];

  for (const fragment of requiredFragments) {
    assertIncludes(
      foundation,
      fragment,
      `Foundation migration is missing required bootstrap fragment: ${fragment}`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await validateMigrations();
    console.log("Migration layout looks valid.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
