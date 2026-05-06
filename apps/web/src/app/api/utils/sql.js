import { neon } from '@neondatabase/serverless';

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

const NullishQueryFunction = () => {
  const isDev = process.env.NODE_ENV === 'development';
  throw new Error(
    isDev
      ? 'No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set'
      : 'Database configuration error'
  );
};
NullishQueryFunction.transaction = () => {
  const isDev = process.env.NODE_ENV === 'development';
  throw new Error(
    isDev
      ? 'No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set'
      : 'Database configuration error'
  );
};
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : NullishQueryFunction;
const NullishRlsQueryFunction = () => {
  throw new ConfigurationError(
    'DATABASE_URL_RLS is required. Refusing to run RLS queries with an unrestricted database connection.'
  );
};
NullishRlsQueryFunction.transaction = () => {
  throw new ConfigurationError(
    'DATABASE_URL_RLS is required. Refusing to run RLS queries with an unrestricted database connection.'
  );
};
const sqlRls = process.env.DATABASE_URL_RLS
  ? neon(process.env.DATABASE_URL_RLS)
  : NullishRlsQueryFunction;

export function isPrivilegedDatabaseRole(roleName) {
  return /owner|postgres|root|admin/i.test(String(roleName || ""));
}

/**
 * Execute a query with RLS context set via SET LOCAL inside a transaction.
 * This ensures the database enforces Row-Level Security policies using
 * the provided user ID and role.
 *
 * Usage:
 *   const rows = await sqlWithRLS(userId, role, (tx) => [
 *     tx`SELECT * FROM bookings WHERE id = ${bookingId}`,
 *   ]);
 *
 * @param {number|string} userId - The authenticated user's ID
 * @param {string} userRole - The shared-app role context (for example 'patient')
 * @param {function} queryFn - A function that receives a transaction handle and returns an array of queries
 * @returns {Promise<Array>} - Results of the last query in the transaction
 */
export async function sqlWithRLS(userId, userRole, queryFn) {
  if (!userId || !userRole) {
    throw new Error('sqlWithRLS requires both userId and userRole');
  }
  const results = await sqlRls.transaction((tx) => {
    const queuedQueries = queryFn(tx);
    const queries = Array.isArray(queuedQueries) ? queuedQueries : [queuedQueries];

    return [
      tx`SELECT set_config('app.current_user_id', ${String(userId)}, true)`,
      tx`SELECT set_config('app.user_role', ${userRole}, true)`,
      ...queries,
    ];
  });
  // First two results are the set_config calls, return the rest
  return results.slice(2);
}

export async function sqlWithBookingTokenRLS(bookingPublicId, manageToken, queryFn) {
  const bookingOwners = await sql`
    SELECT user_id
    FROM bookings
    WHERE public_id = ${bookingPublicId}
      AND manage_token = ${manageToken}
    LIMIT 1
  `;

  const bookingOwnerId = bookingOwners[0]?.user_id;
  if (!bookingOwnerId) {
    return [];
  }

  return sqlWithRLS(bookingOwnerId, 'patient', queryFn);
}

export async function getDatabaseConnectionDiagnostics() {
  const [mainRoleRow, rlsRoleRow] = await Promise.all([
    sql`SELECT current_user AS current_user`,
    sqlRls`SELECT current_user AS current_user`,
  ]);

  return {
    mainRole: mainRoleRow?.[0]?.current_user || null,
    rlsRole: rlsRoleRow?.[0]?.current_user || null,
  };
}

export async function getRlsCoverageDiagnostics(tableNames = []) {
  if (!Array.isArray(tableNames) || tableNames.length === 0) {
    return [];
  }

  return sql(
    `
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        COALESCE(policy_counts.policy_count, 0) AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN (
        SELECT tablename, COUNT(*)::int AS policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
      ) policy_counts ON policy_counts.tablename = c.relname
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])
      ORDER BY c.relname ASC
    `,
    [tableNames],
  );
}

export default sql;
