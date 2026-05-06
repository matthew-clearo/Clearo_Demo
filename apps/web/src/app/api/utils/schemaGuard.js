import sql from "./sql";

export class MissingDatabaseSchemaError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MissingDatabaseSchemaError";
    this.code = "MISSING_DATABASE_SCHEMA";
    this.details = details;
  }
}

function formatLocation(schema, table = null) {
  return table ? `${schema}.${table}` : schema;
}

function formatColumns(columns) {
  return columns.map((column) => `"${column}"`).join(", ");
}

export async function assertSchemaExists(schema, context = "application startup") {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const [row] = await sql`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = ${schema}
    LIMIT 1
  `;

  if (!row) {
    throw new MissingDatabaseSchemaError(
      `Missing required database schema ${formatLocation(schema)} while handling ${context}. Apply the database migrations before serving traffic.`,
      { schema, context },
    );
  }
}

export async function assertTableColumns({
  schema = "public",
  table,
  columns,
  context = "application startup",
}) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${table}
  `;

  if (!rows.length) {
    throw new MissingDatabaseSchemaError(
      `Missing required database table ${formatLocation(schema, table)} while handling ${context}. Apply the database migrations before serving traffic.`,
      { schema, table, context },
    );
  }

  const availableColumns = new Set(rows.map((row) => row.column_name));
  const missingColumns = columns.filter((column) => !availableColumns.has(column));

  if (missingColumns.length > 0) {
    throw new MissingDatabaseSchemaError(
      `Missing required column(s) ${formatColumns(missingColumns)} on ${formatLocation(schema, table)} while handling ${context}. Apply the database migrations before serving traffic.`,
      { schema, table, columns: missingColumns, context },
    );
  }
}
