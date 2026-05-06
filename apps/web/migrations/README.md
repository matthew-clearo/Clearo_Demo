# Database Migrations

This directory contains the only tracked database migrations for `apps/web`.
Fresh environments must be reproducible from these files alone.

## Structure

```
migrations/
├── main/
│   ├── 0_foundation_schema.sql
│   ├── 1_initial_schema.sql
│   └── ...
└── phi-vault/     ← PHI vault database (PHI_VAULT_DATABASE_URL)
    └── 1_initial_schema.sql
```

`apps/web/sql/` is no longer a migration source. Legacy operator-run SQL files were retired so there is a single canonical path.

## Naming Convention

New migration files must be **sequentially numbered** with a descriptive name:

```
# Sequence-based (recommended for this project)
2_add_referral_expiry.sql
3_clinic_membership_indexes.sql

# Timestamp-based also works
20260320120000_add_referral_expiry.sql
```

Migration files are applied **in numeric/alphabetical order** and tracked in a
`migrations` table (main DB) or `phi_vault_migrations` table (PHI vault DB).

The `0_foundation_schema.sql` file was added to capture base tables that used to
exist only out-of-band. On older environments it may appear as a late pending
migration even if `1_*` through `5_*` are already recorded; that is intentional,
and it is written to be idempotent.

## Commands

| Command | Description |
|---|---|
| `npm run migrate:validate` | Validate migration layout, canonical paths, and bootstrap docs |
| `npm run migrate:bootstrap` | Validate, then apply main DB and PHI vault migrations |
| `npm run migrate` | Apply pending migrations → main DB |
| `npm run migrate:phi` | Apply pending migrations → PHI vault DB |
| `npm run migrate:down` | Roll back last migration → main DB |
| `npm run migrate:phi:down` | Roll back last migration → PHI vault DB |
| `npm run migrate:status` | Show applied/pending status → main DB |
| `npm run migrate:phi:status` | Show applied/pending status → PHI vault DB |

## Environment Variables Required

| Variable | Used for |
|---|---|
| `DATABASE_URL` | Main DB migrations |
| `PHI_VAULT_DATABASE_URL` | PHI vault migrations |

## Bootstrap Path

For a fresh environment:

1. Configure `DATABASE_URL` and `PHI_VAULT_DATABASE_URL`.
2. Run `npm run migrate:bootstrap` from `apps/web`.
3. Restart the service so startup validation can re-check both databases before serving traffic.

For an already-provisioned environment:

1. Run `npm run migrate:validate`.
2. Run `npm run migrate` for the main DB.
3. Run `npm run migrate:phi` for the PHI vault DB.
4. Restart the service.

## Creating a new migration

1. Add a new `.sql` file to `migrations/main/` or `migrations/phi-vault/` with the next sequence number.
2. Write idempotent SQL (`IF NOT EXISTS`, `IF EXISTS`).
3. Run `npm run migrate:validate`.
4. Commit the file alongside the code that requires it.
5. Run `npm run migrate` (or `migrate:phi`) before deploying the code change.

## What NOT to do

- ❌ Never add tracked schema changes under `apps/web/sql/`.
- ❌ Never put raw PHI table definitions (encrypted_phi, phi_tokens, phi_access_logs) in a main DB migration.
- ❌ Never put `*_token` UUID lookup columns in the PHI vault migration — they live in the main DB.
- ❌ Never commit `.env` files with real connection strings.
