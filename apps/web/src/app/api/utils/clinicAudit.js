import sql from "./sql";
import logger from "./logger";

export async function logClinicAudit({
  clinicId,
  clinicUserId,
  action,
  entityType,
  entityId,
  details = {},
  request = null,
}) {
  try {
    const forwardedFor = request?.headers?.get("x-forwarded-for");
    const realIp = request?.headers?.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;
    const userAgent = request?.headers?.get("user-agent") || null;

    await sql`
      INSERT INTO clinic.audit_logs (
        clinic_id,
        actor_clinic_user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent
      )
      VALUES (
        ${clinicId},
        ${clinicUserId},
        ${action},
        ${entityType},
        ${entityId ? String(entityId) : null},
        ${JSON.stringify(details)},
        ${ipAddress},
        ${userAgent}
      )
    `;
  } catch (err) {
    logger.error({ err, clinicId, clinicUserId, action }, "Failed to write clinic audit log");
  }
}

export default logClinicAudit;
