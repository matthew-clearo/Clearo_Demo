/**
 * PHI Vault Utilities
 * Handles encryption, tokenization, and secure storage of Protected Health Information
 *
 * SECURITY NOTES:
 * - All PHI is encrypted at rest using AES-256-GCM
 * - Tokens are UUID v4 (cryptographically random)
 * - All access is logged for HIPAA compliance
 * - Separate database from main app database
 */

import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import logger from "@/app/api/utils/logger";
import { getActivePhiKeyVersion } from "@/app/api/utils/phiKeyVersion";
import { MissingDatabaseSchemaError } from "@/app/api/utils/schemaGuard";

// PHI vault database query function
let phiQuery = null;

function getPhiQuery() {
  if (!phiQuery) {
    const connectionString = process.env.PHI_VAULT_DATABASE_URL;
    if (!connectionString) {
      const isDev = process.env.NODE_ENV === 'development';
      throw new Error(
        isDev
          ? "PHI_VAULT_DATABASE_URL environment variable not set"
          : "PHI vault configuration error"
      );
    }
    phiQuery = neon(connectionString);
  }
  return phiQuery;
}

/**
 * Execute SQL query on PHI vault database
 */
async function phiVaultQuery(query, params = []) {
  const sql = getPhiQuery();
  return await sql(query, params);
}

/**
 * Execute a non-interactive transaction on the PHI vault database.
 *
 * The neon() HTTP driver only supports non-interactive transactions:
 *   sql.transaction([sql`...`, sql`...`])           – array of queries
 *   sql.transaction(txn => [txn`...`, txn`...`])    – function returning array
 *
 * For queries with inter-row dependencies (e.g. RETURNING id used in the next
 * INSERT), prefer a single query with CTEs instead of this helper.
 */
async function phiVaultTransaction(queriesOrFn, options) {
  const sql = getPhiQuery();

  if (typeof sql.transaction !== "function") {
    throw new Error("PHI vault transaction support unavailable");
  }

  return sql.transaction(queriesOrFn, options);
}

function formatLocation(table) {
  return `public.${table}`;
}

function formatColumns(columns) {
  return columns.map((column) => `"${column}"`).join(", ");
}

async function assertPhiVaultTableColumns({
  table,
  columns,
  context = "application startup",
}) {
  const rows = await phiVaultQuery(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [table],
  );

  if (!rows.length) {
    throw new MissingDatabaseSchemaError(
      `Missing required database table ${formatLocation(table)} while handling ${context}. Apply the database migrations before serving traffic.`,
      { schema: "public", table, context },
    );
  }

  const availableColumns = new Set(rows.map((row) => row.column_name));
  const missingColumns = columns.filter((column) => !availableColumns.has(column));

  if (missingColumns.length > 0) {
    throw new MissingDatabaseSchemaError(
      `Missing required column(s) ${formatColumns(missingColumns)} on ${formatLocation(table)} while handling ${context}. Apply the database migrations before serving traffic.`,
      { schema: "public", table, columns: missingColumns, context },
    );
  }
}

class PhiAuditLogWriteError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "PhiAuditLogWriteError";
    this.cause = cause;
  }
}

// ============================================
// ENCRYPTION FUNCTIONS
// ============================================

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
/**
 * Get encryption key from environment
 * In production, use a proper key management service (AWS KMS, Azure Key Vault, etc.)
 */
function getEncryptionKey() {
  const key = process.env.PHI_ENCRYPTION_KEY;
  if (!key) {
    const isDev = process.env.NODE_ENV === 'development';
    throw new Error(
      isDev
        ? "PHI_ENCRYPTION_KEY environment variable not set"
        : "PHI encryption configuration error"
    );
  }
  // Key should be 32 bytes (256 bits) for AES-256
  return Buffer.from(key, "hex");
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {Object} data - The data to encrypt
 * @returns {string} - Encrypted data in format: iv:authTag:encryptedData
 */
function encryptData(data) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // 128-bit IV
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const jsonData = JSON.stringify(data);
  let encrypted = cipher.update(jsonData, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encryptData()
 * @param {string} encryptedString - Encrypted data in format: iv:authTag:encryptedData
 * @returns {Object} - Decrypted data
 */
function decryptData(encryptedString) {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedData] = encryptedString.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}

// ============================================
// TOKENIZATION FUNCTIONS
// ============================================

/**
 * Store PHI and return a secure token
 * @param {Object} phiData - Sensitive patient data
 * @param {string} entityType - Type of entity ('booking', 'patient_profile', etc.)
 * @param {number} entityId - ID of the entity in main database
 * @param {Object} auditInfo - Information for audit log
 * @returns {string} - Secure token
 */
export async function tokenizePHI(
  phiData,
  entityType,
  entityId = null,
  auditInfo = {},
  options = {},
) {
  try {
    const keyVersion = getActivePhiKeyVersion();

    // Encrypt the data
    const encryptedData = encryptData(phiData);

    // Generate secure token (UUID v4)
    const token = crypto.randomUUID();

    // Default to non-expiring token for persistent application data.
    const expiresAt =
      Object.prototype.hasOwnProperty.call(options, "expiresAt")
        ? options.expiresAt
        : null;

    // Use a CTE to chain the inserts so the RETURNING id from the first
    // insert feeds into the second and third.  This runs as a single
    // statement which is inherently atomic.
    const { userId = null, ipAddress = null, userAgent = null, requestPath = null } = auditInfo;

    await phiVaultQuery(
      `WITH new_phi AS (
        INSERT INTO encrypted_phi (encrypted_data, encryption_key_id, data_type)
        VALUES ($1, $2, $3)
        RETURNING id
      ), new_token AS (
        INSERT INTO phi_tokens (token, phi_record_id, entity_type, entity_id, expires_at)
        SELECT $4, id, $5, $6, $7 FROM new_phi
      )
      INSERT INTO phi_access_logs (phi_record_id, user_id, action, ip_address, user_agent, request_path, success, failure_reason)
      SELECT id, $8, 'write', $9, $10, $11, true, NULL FROM new_phi`,
      [
        encryptedData, keyVersion, entityType,
        token, entityType, entityId, expiresAt,
        userId, ipAddress, userAgent, requestPath,
      ],
    );

    return token;
  } catch (error) {
    logger.error({ err: error }, "Error tokenizing PHI");

    // Audit log for failure
    await logPhiAccess({
      action: "write",
      success: false,
      failureReason: error.message,
      ...auditInfo,
    }).catch(() => { });

    throw new Error("Failed to tokenize PHI");
  }
}

/**
 * Batch-retrieve and decrypt PHI for multiple tokens in a single query.
 * @param {string[]} tokens - Array of secure tokens
 * @param {Object} auditInfo - Information for audit log
 * @returns {Map<string, Object>} - Map of token → decrypted PHI data
 */
export async function batchDetokenizePHI(tokens, auditInfo = {}) {
  const results = new Map();
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return results;
  }

  // Deduplicate tokens
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return results;
  }

  try {
    // Single query to fetch all token records at once
    const tokenRecords = await phiVaultQuery(
      `SELECT pt.token, pt.phi_record_id, pt.expires_at, ep.encrypted_data
       FROM phi_tokens pt
       JOIN encrypted_phi ep ON pt.phi_record_id = ep.id
       WHERE pt.token = ANY($1::text[])`,
      [uniqueTokens],
    );

    if (!tokenRecords || tokenRecords.length === 0) {
      return results;
    }

    const now = new Date();
    const validRecordIds = [];

    for (const record of tokenRecords) {
      // Check expiration
      if (record.expires_at && new Date(record.expires_at) < now) {
        continue;
      }

      try {
        const decryptedData = decryptData(record.encrypted_data);
        results.set(record.token, decryptedData);
        validRecordIds.push(record.phi_record_id);
      } catch (decryptErr) {
        logger.error({ err: decryptErr, token: record.token }, "Error decrypting PHI in batch");
      }
    }

    // Batch update access timestamps and log reads in a single statement
    if (validRecordIds.length > 0) {
      const { userId = null, ipAddress = null, userAgent = null, requestPath = null } = auditInfo;

      await phiVaultQuery(
        `WITH updated AS (
          UPDATE encrypted_phi
          SET accessed_at = CURRENT_TIMESTAMP,
              access_count = access_count + 1
          WHERE id = ANY($1::int[])
          RETURNING id
        )
        INSERT INTO phi_access_logs (phi_record_id, user_id, action, ip_address, user_agent, request_path, success, failure_reason)
        SELECT id, $2, 'read', $3, $4, $5, true, NULL FROM updated`,
        [validRecordIds, userId, ipAddress, userAgent, requestPath],
      ).catch((err) => {
        logger.error({ err }, "Failed to log batch PHI access");
      });
    }

    return results;
  } catch (error) {
    logger.error({ err: error }, "Error batch-detokenizing PHI");
    throw new Error("Failed to batch detokenize PHI");
  }
}

/**
 * Retrieve and decrypt PHI using token
 * @param {string} token - Secure token
 * @param {Object} auditInfo - Information for audit log
 * @returns {Object|null} - Decrypted PHI data or null if not found/expired
 */
export async function detokenizePHI(token, auditInfo = {}) {
  try {
    // Look up token
    const tokenRecords = await phiVaultQuery(
      `SELECT pt.phi_record_id, pt.expires_at, ep.encrypted_data
       FROM phi_tokens pt
       JOIN encrypted_phi ep ON pt.phi_record_id = ep.id
       WHERE pt.token = $1`,
      [token],
    );

    if (!tokenRecords || tokenRecords.length === 0) {
      await logPhiAccess({
        action: "read",
        success: false,
        failureReason: "Token not found",
        ...auditInfo,
      }).catch(() => { });
      return null;
    }

    const record = tokenRecords[0];

    // Check expiration
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      await logPhiAccess({
        phiRecordId: record.phi_record_id,
        action: "read",
        success: false,
        failureReason: "Token expired",
        ...auditInfo,
      }).catch(() => { });
      return null;
    }

    // Decrypt data
    const decryptedData = decryptData(record.encrypted_data);

    // Use a CTE so the UPDATE and audit INSERT are a single atomic statement.
    const { userId = null, ipAddress = null, userAgent = null, requestPath = null } = auditInfo;

    await phiVaultQuery(
      `WITH updated AS (
        UPDATE encrypted_phi
        SET accessed_at = CURRENT_TIMESTAMP,
            access_count = access_count + 1
        WHERE id = $1
        RETURNING id
      )
      INSERT INTO phi_access_logs (phi_record_id, user_id, action, ip_address, user_agent, request_path, success, failure_reason)
      SELECT id, $2, 'read', $3, $4, $5, true, NULL FROM updated`,
      [record.phi_record_id, userId, ipAddress, userAgent, requestPath],
    );

    return decryptedData;
  } catch (error) {
    logger.error({ err: error }, "Error detokenizing PHI");

    await logPhiAccess({
      action: "read",
      success: false,
      failureReason: error.message,
      ...auditInfo,
    }).catch(() => { });

    throw new Error("Failed to detokenize PHI");
  }
}

/**
 * Update PHI data for an existing token
 */
export async function updateTokenizedPHI(token, newPhiData, auditInfo = {}) {
  try {
    const keyVersion = getActivePhiKeyVersion();

    // Look up token
    const tokenRecords = await phiVaultQuery(
      `SELECT phi_record_id FROM phi_tokens WHERE token = $1`,
      [token],
    );

    if (!tokenRecords || tokenRecords.length === 0) {
      return false;
    }

    const phiRecordId = tokenRecords[0].phi_record_id;

    // Encrypt new data
    const encryptedData = encryptData(newPhiData);

    // Use a CTE so the UPDATE and audit INSERT are a single atomic statement.
    const { userId = null, ipAddress = null, userAgent = null, requestPath = null } = auditInfo;

    await phiVaultQuery(
      `WITH updated AS (
        UPDATE encrypted_phi
        SET encrypted_data = $1, encryption_key_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id
      )
      INSERT INTO phi_access_logs (phi_record_id, user_id, action, ip_address, user_agent, request_path, success, failure_reason)
      SELECT id, $4, 'write', $5, $6, $7, true, NULL FROM updated`,
      [encryptedData, keyVersion, phiRecordId, userId, ipAddress, userAgent, requestPath],
    );

    return true;
  } catch (error) {
    logger.error({ err: error }, "Error updating tokenized PHI");

    await logPhiAccess({
      action: "write",
      success: false,
      failureReason: error.message,
      ...auditInfo,
    }).catch(() => { });

    return false;
  }
}

/**
 * Delete PHI and associated token
 */
export async function deleteTokenizedPHI(token, auditInfo = {}) {
  try {
    const tokenRecords = await phiVaultQuery(
      `SELECT phi_record_id FROM phi_tokens WHERE token = $1`,
      [token],
    );

    if (!tokenRecords || tokenRecords.length === 0) {
      return false;
    }

    const phiRecordId = tokenRecords[0].phi_record_id;

    // Audit log first (phi_record_id will be null since we're deleting),
    // then delete in a transaction using the array-of-queries pattern.
    const sql = getPhiQuery();
    const { userId = null, ipAddress = null, userAgent = null, requestPath = null } = auditInfo;

    await sql.transaction((txn) => [
      txn(
        `INSERT INTO phi_access_logs (phi_record_id, user_id, action, ip_address, user_agent, request_path, success, failure_reason)
         VALUES (NULL, $1, 'delete', $2, $3, $4, true, NULL)`,
        [userId, ipAddress, userAgent, requestPath],
      ),
      txn(`DELETE FROM phi_tokens WHERE token = $1`, [token]),
      txn(`DELETE FROM encrypted_phi WHERE id = $1`, [phiRecordId]),
    ]);

    return true;
  } catch (error) {
    logger.error({ err: error }, "Error deleting tokenized PHI");
    return false;
  }
}

// ============================================
// AUDIT LOGGING
// ============================================

async function logPhiAccess(
  {
    phiRecordId = null,
    userId = null,
    action,
    ipAddress = null,
    userAgent = null,
    requestPath = null,
    success,
    failureReason = null,
  },
  {
    query = phiVaultQuery,
    failClosed = false,
  } = {},
) {
  try {
    await query(
      `INSERT INTO phi_access_logs 
       (phi_record_id, user_id, action, ip_address, user_agent, request_path, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        phiRecordId,
        userId,
        action,
        ipAddress,
        userAgent,
        requestPath,
        success,
        failureReason,
      ],
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        action,
        phiRecordId,
        userId,
        requestPath,
        success,
        failClosed,
      },
      "Failed to log PHI access",
    );

    if (failClosed) {
      throw new PhiAuditLogWriteError("Critical PHI audit log write failed", error);
    }
  }
}

// ============================================
// INITIALIZATION & SETUP
// ============================================

export async function validatePhiVaultSchema({
  context = "PHI vault schema validation",
} = {}) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  await assertPhiVaultTableColumns({
    table: "encrypted_phi",
    columns: [
      "encrypted_data",
      "encryption_key_id",
      "data_type",
      "created_at",
      "updated_at",
      "accessed_at",
      "access_count",
    ],
    context,
  });
  await assertPhiVaultTableColumns({
    table: "phi_tokens",
    columns: [
      "token",
      "phi_record_id",
      "entity_type",
      "entity_id",
      "expires_at",
      "created_at",
    ],
    context,
  });
  await assertPhiVaultTableColumns({
    table: "phi_access_logs",
    columns: [
      "phi_record_id",
      "user_id",
      "action",
      "ip_address",
      "user_agent",
      "request_path",
      "success",
      "failure_reason",
      "created_at",
    ],
    context,
  });
}

export async function getPhiVaultConfigurationStatus() {
  const status = {
    phi_vault_url_configured: Boolean(process.env.PHI_VAULT_DATABASE_URL),
    encryption_key_configured: Boolean(process.env.PHI_ENCRYPTION_KEY),
    schema_validated: false,
    ready: false,
    message: null,
  };

  if (!status.phi_vault_url_configured) {
    status.message = "PHI_VAULT_DATABASE_URL not configured";
    return status;
  }

  if (!status.encryption_key_configured) {
    status.message =
      "PHI_ENCRYPTION_KEY not configured. Generate a key locally with: openssl rand -hex 32";
    return status;
  }

  try {
    await validatePhiVaultSchema({ context: "PHI vault status check" });
    status.schema_validated = true;
    status.ready = true;
    status.message = "PHI vault schema is present and ready";
  } catch (error) {
    status.message =
      error?.message ||
      "PHI vault schema validation failed. Apply the PHI vault migrations and restart the service.";
  }

  return status;
}

export async function initializePhiVault() {
  throw new Error(
    "Runtime PHI vault initialization is disabled. Apply apps/web/migrations/phi-vault/1_initial_schema.sql during deployment.",
  );
}

/**
 * Generate a new encryption key
 * Store this in PHI_ENCRYPTION_KEY environment variable
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString("hex");
}
