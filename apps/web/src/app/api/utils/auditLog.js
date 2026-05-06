import sql from "./sql";
import logger from "@/app/api/utils/logger";

export class AuditLogWriteError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "AuditLogWriteError";
    this.cause = cause;
  }
}

function getRequestPath(request) {
  if (!request?.url) {
    return null;
  }

  try {
    return new URL(request.url).pathname;
  } catch {
    return null;
  }
}

function isCriticalAuditEvent({ action, entityType, request, failClosed }) {
  if (typeof failClosed === "boolean") {
    return failClosed;
  }

  if (typeof action === "string" && action.startsWith("PHI_")) {
    return true;
  }

  return entityType === "phi_access";
}

/**
 * Log an audit event, failing closed for critical PHI paths.
 * @param {Object} options
 * @param {number} options.userId - User ID performing the action
 * @param {string} options.action - Action being performed (e.g., 'CLINIC_APPROVED', 'BOOKING_CANCELLED')
 * @param {string} options.entityType - Type of entity (e.g., 'clinic', 'booking', 'user')
 * @param {number} options.entityId - ID of the entity
 * @param {Object} options.details - Additional details as JSON
 * @param {Request} options.request - Request object (optional, for IP and user agent)
 * @param {boolean} options.failClosed - Override whether audit failures should abort the caller
 */
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details = {},
  request = null,
  failClosed,
}) {
  const critical = isCriticalAuditEvent({ action, entityType, request, failClosed });

  try {
    let ipAddress = null;
    let userAgent = null;

    if (request) {
      // Get IP address from request
      const forwardedFor = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

      // Get user agent
      userAgent = request.headers.get("user-agent") || null;
    }

    await sql`
      INSERT INTO audit_logs (
        user_id, 
        action, 
        entity_type, 
        entity_id, 
        details, 
        ip_address, 
        user_agent
      )
      VALUES (
        ${userId || null},
        ${action},
        ${entityType},
        ${entityId || null},
        ${JSON.stringify(details)},
        ${ipAddress},
        ${userAgent}
      )
    `;
  } catch (error) {
    logger.error(
      {
        err: error,
        action,
        entityType,
        entityId,
        userId,
        critical,
        requestPath: getRequestPath(request),
      },
      "Failed to write audit log",
    );

    if (critical) {
      throw new AuditLogWriteError("Critical audit log write failed", error);
    }
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(entityType, entityId, limit = 50) {
  try {
    const logs = await sql`
      SELECT 
        al.*,
        au.email as user_email,
        au.name as user_name
      FROM audit_logs al
      LEFT JOIN auth_users au ON al.user_id = au.id
      WHERE al.entity_type = ${entityType} 
        AND al.entity_id = ${entityId}
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `;

    return logs;
  } catch (error) {
    // Silently fail
    return [];
  }
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(userId, limit = 50) {
  try {
    const logs = await sql`
      SELECT *
      FROM audit_logs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return logs;
  } catch (error) {
    // Silently fail
    return [];
  }
}

// Common audit action constants
export const AUDIT_ACTIONS = {
  // Clinic actions
  CLINIC_CREATED: "CLINIC_CREATED",
  CLINIC_APPROVED: "CLINIC_APPROVED",
  CLINIC_REJECTED: "CLINIC_REJECTED",
  CLINIC_UPDATED: "CLINIC_UPDATED",
  CLINIC_DELETED: "CLINIC_DELETED",

  // Booking actions
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_AUTO_CANCELLED: "BOOKING_AUTO_CANCELLED",
  BOOKING_COMPLETED: "BOOKING_COMPLETED",
  REFERRAL_STATUS_CHANGED: "REFERRAL_STATUS_CHANGED",

  // User actions
  USER_LOGIN: "USER_LOGIN",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  USER_LOGOUT: "USER_LOGOUT",
  USER_SIGNUP: "USER_SIGNUP",
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",
  CLINIC_LOGIN_SUCCESS: "CLINIC_LOGIN_SUCCESS",
  CLINIC_LOGIN_FAILED: "CLINIC_LOGIN_FAILED",

  // Admin actions
  ADMIN_CREATED: "ADMIN_CREATED",
  SLOT_GENERATED: "SLOT_GENERATED",
  PRICING_UPDATED: "PRICING_UPDATED",
  DATA_EXPORTED: "DATA_EXPORTED",

  // Admin auth actions
  ADMIN_LOGIN_SUCCESS: "ADMIN_LOGIN_SUCCESS",
  ADMIN_LOGIN_FAILED: "ADMIN_LOGIN_FAILED",
  ADMIN_MFA_VERIFIED: "ADMIN_MFA_VERIFIED",
  ADMIN_MFA_FAILED: "ADMIN_MFA_FAILED",

  // Internal ops auth actions
  INTERNAL_OPS_LOGIN_SUCCESS: "INTERNAL_OPS_LOGIN_SUCCESS",
  INTERNAL_OPS_LOGIN_FAILED: "INTERNAL_OPS_LOGIN_FAILED",

  // Patient support actions
  PATIENT_VIEWED: "PATIENT_VIEWED",
  PATIENT_PHI_VIEWED: "PATIENT_PHI_VIEWED",
  PATIENT_PHI_ACCESS_DENIED: "PATIENT_PHI_ACCESS_DENIED",
  PATIENT_PHI_VIEWED_HIGH_SENSITIVITY: "PATIENT_PHI_VIEWED_HIGH_SENSITIVITY",
  PATIENT_SEARCHED: "PATIENT_SEARCHED",
  PATIENT_NOTE_ADDED: "PATIENT_NOTE_ADDED",

  // Booking support actions
  BOOKING_STATUS_CHANGED: "BOOKING_STATUS_CHANGED",
  BOOKING_ADMIN_CANCELLED: "BOOKING_ADMIN_CANCELLED",

  // Clinic admin actions
  CLINIC_VIEWED: "CLINIC_VIEWED",
  CLINIC_SETTINGS_CHANGED: "CLINIC_SETTINGS_CHANGED",

  // Admin user management
  ADMIN_ROLE_CHANGED: "ADMIN_ROLE_CHANGED",
  ADMIN_INVITED: "ADMIN_INVITED",
  ADMIN_DISABLED: "ADMIN_DISABLED",
  ADMIN_ENABLED: "ADMIN_ENABLED",
  ADMIN_FORCE_LOGOUT: "ADMIN_FORCE_LOGOUT",

  // System actions
  SYSTEM_SETTING_CHANGED: "SYSTEM_SETTING_CHANGED",
  TEMPLATE_CREATED: "TEMPLATE_CREATED",
  TEMPLATE_UPDATED: "TEMPLATE_UPDATED",
};
