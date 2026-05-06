import sql from "@/app/api/utils/sql";

const AUTH_USERS_CREATED_AT_CANDIDATES = ["created_at", "createdAt", "createdat"];

let authUsersColumnCachePromise = null;

function quoteIdentifier(identifier) {
  return /^[a-z_][a-z0-9_]*$/.test(identifier) ? identifier : `"${identifier}"`;
}

async function getAuthUsersColumns() {
  if (!authUsersColumnCachePromise) {
    authUsersColumnCachePromise = sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'auth_users'
    `.then((rows) => new Set(rows.map((row) => row.column_name)));
  }

  return authUsersColumnCachePromise;
}

function qualifyIdentifier(identifier, tableAlias = null) {
  return `${tableAlias ? `${tableAlias}.` : ""}${quoteIdentifier(identifier)}`;
}

export async function getAuthUsersCreatedAtColumnSql(tableAlias = null) {
  if (process.env.NODE_ENV === "test") {
    return qualifyIdentifier("createdAt", tableAlias);
  }

  const columns = await getAuthUsersColumns();
  const columnName = AUTH_USERS_CREATED_AT_CANDIDATES.find((candidate) => columns.has(candidate));

  if (!columnName) {
    return null;
  }

  return qualifyIdentifier(columnName, tableAlias);
}

export async function getAuthUsersCreatedAtSelectSql(tableAlias = null) {
  const columnSql = await getAuthUsersCreatedAtColumnSql(tableAlias);
  return columnSql || "NULL";
}

export async function getAuthUsersCreatedAtOrderBySql(tableAlias = null, direction = "DESC") {
  const normalizedDirection = String(direction).toUpperCase() === "ASC" ? "ASC" : "DESC";
  const createdAtSql = await getAuthUsersCreatedAtColumnSql(tableAlias);
  if (createdAtSql) {
    return `${createdAtSql} ${normalizedDirection}`;
  }

  return `${qualifyIdentifier("id", tableAlias)} ${normalizedDirection}`;
}
