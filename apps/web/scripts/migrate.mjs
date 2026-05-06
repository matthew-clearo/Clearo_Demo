/**
 * Database migration runner — wraps node-pg-migrate for both databases.
 *
 * Usage:
 *   npm run migrate:validate     → validates migration layout and bootstrap docs
 *   npm run migrate:bootstrap    → validates + applies main DB + PHI vault migrations
 *   npm run migrate              → runs pending migrations on main DB
 *   npm run migrate:phi          → runs pending migrations on PHI vault DB
 *   npm run migrate:down         → rolls back last migration on main DB
 *   npm run migrate:down:phi     → rolls back last migration on PHI vault DB
 *   npm run migrate:status       → shows migration status on main DB
 *   npm run migrate:status:phi   → shows migration status on PHI vault DB
 *   npm run migrate:create NAME  → creates a new timestamped migration file
 *   npm run migrate:create:phi NAME  → creates a new PHI vault migration file
 *
 * Environment variables required:
 *   DATABASE_URL         — main Postgres connection string
 *   PHI_VAULT_DATABASE_URL — PHI vault Postgres connection string
 *
 * Canonical tracked migrations live under apps/web/migrations/** only.
 */

import { runner as run } from "node-pg-migrate";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const [, , target = "main", direction = "up", ...rest] = process.argv;

const isPhi = target === "phi";
const dbUrl = isPhi
    ? process.env.PHI_VAULT_DATABASE_URL
    : process.env.DATABASE_URL;

if (!dbUrl) {
    const varName = isPhi ? "PHI_VAULT_DATABASE_URL" : "DATABASE_URL";
    console.error(`\n❌  ${varName} environment variable is not set.\n`);
    process.exit(1);
}

const migrationsDir = path.join(
    root,
    "migrations",
    isPhi ? "phi-vault" : "main",
);

console.log(`\n📦  Running ${direction} migrations on ${isPhi ? "PHI vault" : "main"} database…\n`);

try {
    await run({
        databaseUrl: dbUrl,
        dir: migrationsDir,
        direction,
        migrationsTable: isPhi ? "phi_vault_migrations" : "migrations",
        // node-pg-migrate expects files like:  1_some_name.sql or 20260318000000_some_name.sql
        // Both timestamp-prefixed and sequence-prefixed files are supported.
        count: direction === "down" ? 1 : Infinity,
        verbose: true,
        ...(rest.length > 0 && { file: rest[0] }),
    });
    console.log(`\n✅  ${direction === "up" ? "Migrations applied" : "Migration rolled back"} successfully.\n`);
} catch (err) {
    console.error("\n❌  Migration failed:", err.message, "\n");
    process.exit(1);
}
