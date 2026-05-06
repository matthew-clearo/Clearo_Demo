import sql from "./sql";
import logger from "./logger";
import { assertSchemaExists, assertTableColumns } from "./schemaGuard";
import { generateRawToken, hashToken } from "./authTokens";
import { sendSystemEmail } from "./emailTemplates";
import { logClinicAudit } from "./clinicAudit";
import { getClinicAppOrigin, toClinicCanonicalPath } from "@/utils/clinicPortal";
import { getRequiredClinicAppOrigin } from "@/utils/siteSurface";

let clinicInvitationTablesEnsured = false;

export function normalizeClinicEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function ensureClinicInvitationTables({
  context = "clinic invitation schema validation",
} = {}) {
  if (clinicInvitationTablesEnsured) return;

  try {
    await assertSchemaExists("clinic", context);
    await assertTableColumns({
      schema: "clinic",
      table: "invitations",
      columns: [
        "public_id",
        "clinic_id",
        "email",
        "normalized_email",
        "role",
        "status",
        "invited_by_clinic_user_id",
        "invited_clinic_user_id",
        "token_hash",
        "expires_at",
        "accepted_at",
        "revoked_at",
        "created_at",
        "updated_at",
      ],
      context,
    });

    clinicInvitationTablesEnsured = true;
  } catch (err) {
    logger.error({ err }, "Failed to ensure clinic invitation tables");
    throw err;
  }
}

async function sendClinicInviteEmail({
  clinicName,
  email,
  rawToken,
  invitedByName,
}) {
  const appOrigin = getClinicAppOrigin() || getRequiredClinicAppOrigin();
  const signUpUrl = `${appOrigin}${toClinicCanonicalPath(
    `/signup?email=${encodeURIComponent(email)}&clinicInvite=${encodeURIComponent(rawToken)}&callbackUrl=${encodeURIComponent("/dashboard")}`,
  )}`;

  return sendSystemEmail({
    slug: "clinic-staff-invite",
    to: email,
    mergeValues: {
      signup_url: signUpUrl,
      expiry_window: "7 days",
      clinic_name: clinicName,
      invited_by_suffix: invitedByName ? ` by ${invitedByName}` : "",
    },
  });
}

async function sendClinicAccessGrantedEmail({
  clinicName,
  email,
  invitedByName,
}) {
  const appOrigin = getClinicAppOrigin() || getRequiredClinicAppOrigin();
  const signInUrl = `${appOrigin}${toClinicCanonicalPath("/signin")}`;

  return sendSystemEmail({
    slug: "clinic-staff-access-granted",
    to: email,
    mergeValues: {
      signin_url: signInUrl,
      clinic_name: clinicName,
      invited_by_suffix: invitedByName ? ` by ${invitedByName}` : "",
    },
  });
}

async function countActiveOwners(clinicId, runner = sql) {
  const [row] = await runner`
    SELECT COUNT(*)::int AS count
    FROM clinic.memberships
    WHERE clinic_id = ${clinicId}
      AND role = 'owner'
      AND status = 'active'
      AND disabled_at IS NULL
  `;

  return row?.count || 0;
}

function canAssignRole(role) {
  return ["owner", "manager", "staff", "read_only", "billing"].includes(role);
}

async function getMembershipRecord(clinicId, clinicUserId) {
  const [membership] = await sql`
    SELECT id, clinic_id, clinic_user_id, role, status, disabled_at
    FROM clinic.memberships
    WHERE clinic_id = ${clinicId}
      AND clinic_user_id = ${clinicUserId}
    LIMIT 1
  `;

  return membership || null;
}

export async function listClinicTeam({ clinicId }) {
  const [members, invitations] = await sql.transaction((txn) => [
    txn`
      SELECT
        cm.id,
        cm.role,
        cm.status,
        cm.accepted_at,
        cm.disabled_at,
        cm.created_at,
        cu.public_id AS clinic_user_public_id,
        cu.email,
        cu.name,
        cu.last_login_at
      FROM clinic.memberships cm
      JOIN clinic.users cu ON cu.id = cm.clinic_user_id
      WHERE cm.clinic_id = ${clinicId}
      ORDER BY
        CASE cm.role
          WHEN 'owner' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'billing' THEN 3
          WHEN 'staff' THEN 4
          ELSE 5
        END,
        cm.created_at ASC
    `,
    txn`
      SELECT
        ci.id,
        ci.public_id,
        ci.email,
        ci.role,
        ci.status,
        ci.expires_at,
        ci.accepted_at,
        ci.created_at,
        inviter.email AS invited_by_email,
        invited_user.public_id AS invited_user_public_id
      FROM clinic.invitations ci
      LEFT JOIN clinic.users inviter ON inviter.id = ci.invited_by_clinic_user_id
      LEFT JOIN clinic.users invited_user ON invited_user.id = ci.invited_clinic_user_id
      WHERE ci.clinic_id = ${clinicId}
      ORDER BY
        CASE ci.status
          WHEN 'pending' THEN 1
          WHEN 'accepted' THEN 2
          WHEN 'revoked' THEN 3
          ELSE 4
        END,
        ci.created_at DESC
    `,
  ]);

  return { members, invitations };
}

export async function createClinicInvitation({
  clinicId,
  invitedByClinicUserId,
  email,
  role,
  request = null,
}) {
  const normalizedEmail = normalizeClinicEmail(email);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [clinicRow] = await sql`
    SELECT name
    FROM public.clinics
    WHERE id = ${clinicId}
    LIMIT 1
  `;
  const [inviter] = await sql`
    SELECT name, email
    FROM clinic.users
    WHERE id = ${invitedByClinicUserId}
    LIMIT 1
  `;
  const [existingUser] = await sql`
    SELECT id, public_id, email
    FROM clinic.users
    WHERE normalized_email = ${normalizedEmail}
    LIMIT 1
  `;

  if (existingUser) {
    const existingMembership = await getMembershipRecord(clinicId, existingUser.id);
    if (existingMembership?.status === "active" && !existingMembership?.disabled_at) {
      throw new Error("ClinicUserAlreadyActive");
    }
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const [invite] = await sql`
    INSERT INTO clinic.invitations (
      clinic_id,
      email,
      normalized_email,
      role,
      status,
      invited_by_clinic_user_id,
      invited_clinic_user_id,
      token_hash,
      expires_at,
      accepted_at,
      revoked_at,
      updated_at
    )
    VALUES (
      ${clinicId},
      ${normalizedEmail},
      ${normalizedEmail},
      ${role},
      'pending',
      ${invitedByClinicUserId},
      NULL,
      ${tokenHash},
      ${expiresAt.toISOString()},
      NULL,
      NULL,
      NOW()
    )
    ON CONFLICT (clinic_id, normalized_email)
    WHERE status = 'pending'
    DO UPDATE SET
      role = EXCLUDED.role,
      invited_by_clinic_user_id = EXCLUDED.invited_by_clinic_user_id,
      invited_clinic_user_id = NULL,
      token_hash = EXCLUDED.token_hash,
      expires_at = EXCLUDED.expires_at,
      status = 'pending',
      accepted_at = NULL,
      revoked_at = NULL,
      updated_at = NOW()
    RETURNING id, public_id, email, role, status, expires_at, created_at
  `;

  if (existingUser) {
    await sql`
      INSERT INTO clinic.memberships (
        clinic_id,
        clinic_user_id,
        role,
        status,
        invited_by_clinic_user_id,
        invited_at,
        accepted_at,
        disabled_at
      )
      VALUES (
        ${clinicId},
        ${existingUser.id},
        ${role},
        'active',
        ${invitedByClinicUserId},
        NOW(),
        NOW(),
        NULL
      )
      ON CONFLICT (clinic_id, clinic_user_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        status = 'active',
        invited_by_clinic_user_id = EXCLUDED.invited_by_clinic_user_id,
        accepted_at = COALESCE(clinic.memberships.accepted_at, NOW()),
        disabled_at = NULL,
        updated_at = NOW()
    `;

    await sql`
      UPDATE clinic.invitations
      SET
        status = 'accepted',
        invited_clinic_user_id = ${existingUser.id},
        accepted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${invite.id}
    `;

    await logClinicAudit({
      clinicId,
      clinicUserId: invitedByClinicUserId,
      action: "CLINIC_TEAM_MEMBER_GRANTED",
      entityType: "clinic_membership",
      entityId: existingUser.public_id,
      details: { email: normalizedEmail, role },
      request,
    });

    try {
      await sendClinicAccessGrantedEmail({
        clinicName: clinicRow?.name || "your clinic",
        email: normalizedEmail,
        invitedByName: inviter?.name || inviter?.email || null,
      });
    } catch (err) {
      logger.error({ err, clinicId, email: normalizedEmail }, "Failed to send clinic access granted email");
    }

    return { invite, existingUserPromoted: true };
  }

  const emailSent = await sendClinicInviteEmail({
    clinicName: clinicRow?.name || "your clinic",
    email: normalizedEmail,
    rawToken,
    invitedByName: inviter?.name || inviter?.email || null,
  });

  if (!emailSent) {
    throw new Error("ClinicInviteEmailUnavailable");
  }

  await logClinicAudit({
    clinicId,
    clinicUserId: invitedByClinicUserId,
    action: "CLINIC_TEAM_MEMBER_INVITED",
    entityType: "clinic_invitation",
    entityId: invite.public_id,
    details: { email: normalizedEmail, role },
    request,
  });

  return { invite, existingUserPromoted: false };
}

export async function validateClinicInvitationToken({ email, rawToken }) {
  const normalizedEmail = normalizeClinicEmail(email);
  const hashed = hashToken(rawToken);
  const [invite] = await sql`
    SELECT *
    FROM clinic.invitations
    WHERE normalized_email = ${normalizedEmail}
      AND status = 'pending'
      AND token_hash = ${hashed}
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return invite || null;
}

export async function finalizeClinicInvitation({ clinicUserId, inviteId }) {
  const [invite] = await sql`
    SELECT *
    FROM clinic.invitations
    WHERE id = ${inviteId}
      AND status = 'pending'
      AND expires_at > NOW()
    LIMIT 1
  `;

  if (!invite) return null;

  await sql`
    INSERT INTO clinic.memberships (
      clinic_id,
      clinic_user_id,
      role,
      status,
      invited_by_clinic_user_id,
      invited_at,
      accepted_at,
      disabled_at
    )
    VALUES (
      ${invite.clinic_id},
      ${clinicUserId},
      ${invite.role},
      'active',
      ${invite.invited_by_clinic_user_id},
      ${invite.created_at},
      NOW(),
      NULL
    )
    ON CONFLICT (clinic_id, clinic_user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
      invited_by_clinic_user_id = EXCLUDED.invited_by_clinic_user_id,
      accepted_at = NOW(),
      disabled_at = NULL,
      updated_at = NOW()
  `;

  await sql`
    UPDATE clinic.invitations
    SET
      status = 'accepted',
      invited_clinic_user_id = ${clinicUserId},
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = ${invite.id}
  `;

  return invite;
}

export async function revokeClinicInvitation({ clinicId, inviteId, clinicUserId, request = null }) {
  const [invite] = await sql`
    UPDATE clinic.invitations
    SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
    WHERE id = ${inviteId}
      AND clinic_id = ${clinicId}
      AND status = 'pending'
    RETURNING id, public_id, email
  `;

  if (invite) {
    await logClinicAudit({
      clinicId,
      clinicUserId,
      action: "CLINIC_TEAM_INVITE_REVOKED",
      entityType: "clinic_invitation",
      entityId: invite.public_id,
      details: { email: invite.email },
      request,
    });
  }

  return invite || null;
}

export async function resendClinicInvitation({
  clinicId,
  inviteId,
  invitedByClinicUserId,
  request = null,
}) {
  const [invite] = await sql`
    SELECT id, email, role, status
    FROM clinic.invitations
    WHERE id = ${inviteId}
      AND clinic_id = ${clinicId}
    LIMIT 1
  `;

  if (!invite) {
    return null;
  }

  if (invite.status !== "pending") {
    throw new Error("ClinicInviteNotPending");
  }

  return createClinicInvitation({
    clinicId,
    invitedByClinicUserId,
    email: invite.email,
    role: invite.role,
    request,
  });
}

export async function setClinicMembershipStatus({
  clinicId,
  membershipId,
  actorMembership,
  clinicUserId,
  action,
  request = null,
}) {
  return sql.transaction(async (txn) => {
    const [target] = await txn`
      SELECT
        cm.id,
        cm.role,
        cm.status,
        cm.clinic_user_id,
        cu.public_id AS clinic_user_public_id,
        cu.email
      FROM clinic.memberships cm
      JOIN clinic.users cu ON cu.id = cm.clinic_user_id
      WHERE cm.id = ${membershipId}
        AND cm.clinic_id = ${clinicId}
      LIMIT 1
    `;

    if (!target) {
      return null;
    }

    if (target.clinic_user_id === clinicUserId && action === "disable") {
      throw new Error("SelfDisableForbidden");
    }

    const actorIsOwner = actorMembership.role === "owner";
    if (target.role === "owner" && !actorIsOwner) {
      throw new Error("OwnerPrivilegesRequired");
    }
    if (target.role === "manager" && !actorIsOwner) {
      throw new Error("ManagerPrivilegesRequired");
    }

    if (action === "disable" && target.role === "owner") {
      const activeOwners = await countActiveOwners(clinicId, txn);
      if (activeOwners <= 1) {
        throw new Error("LastOwnerProtected");
      }
    }

    const nextStatus = action === "disable" ? "disabled" : "active";
    const [updated] = await txn`
      UPDATE clinic.memberships
      SET
        status = ${nextStatus},
        disabled_at = CASE WHEN ${action === "disable"} THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = ${membershipId}
        AND clinic_id = ${clinicId}
      RETURNING id, status
    `;

    await logClinicAudit({
      clinicId,
      clinicUserId,
      action: action === "disable" ? "CLINIC_TEAM_MEMBER_DISABLED" : "CLINIC_TEAM_MEMBER_ENABLED",
      entityType: "clinic_membership",
      entityId: target.clinic_user_public_id,
      details: { email: target.email, role: target.role },
      request,
    });

    return updated || null;
  });
}

export async function updateClinicMembershipRole({
  clinicId,
  membershipId,
  actorMembership,
  clinicUserId,
  nextRole,
  request = null,
}) {
  if (actorMembership.role !== "owner") {
    throw new Error("OwnerPrivilegesRequired");
  }
  if (!canAssignRole(nextRole) || nextRole === "owner") {
    throw new Error("InvalidClinicRole");
  }

  return sql.transaction(async (txn) => {
    const [target] = await txn`
      SELECT
        cm.id,
        cm.role,
        cm.status,
        cm.disabled_at,
        cm.clinic_user_id,
        cu.public_id AS clinic_user_public_id,
        cu.email
      FROM clinic.memberships cm
      JOIN clinic.users cu ON cu.id = cm.clinic_user_id
      WHERE cm.id = ${membershipId}
        AND cm.clinic_id = ${clinicId}
      LIMIT 1
    `;

    if (!target) {
      return null;
    }

    if (target.clinic_user_id === clinicUserId) {
      throw new Error("SelfRoleChangeForbidden");
    }

    if (target.role === nextRole) {
      return target;
    }

    if (target.role === "owner") {
      const activeOwners = await countActiveOwners(clinicId, txn);
      if (activeOwners <= 1) {
        throw new Error("LastOwnerProtected");
      }
    }

    const [updated] = await txn`
      UPDATE clinic.memberships
      SET
        role = ${nextRole},
        updated_at = NOW()
      WHERE id = ${membershipId}
        AND clinic_id = ${clinicId}
      RETURNING id, role, status, clinic_user_id
    `;

    await logClinicAudit({
      clinicId,
      clinicUserId,
      action: "CLINIC_TEAM_MEMBER_ROLE_UPDATED",
      entityType: "clinic_membership",
      entityId: target.clinic_user_public_id,
      details: {
        email: target.email,
        previous_role: target.role,
        next_role: nextRole,
      },
      request,
    });

    return updated || null;
  });
}

export async function transferClinicOwnership({
  clinicId,
  membershipId,
  actorMembership,
  clinicUserId,
  request = null,
}) {
  if (actorMembership.role !== "owner") {
    throw new Error("OwnerPrivilegesRequired");
  }

  return sql.transaction(async (txn) => {
    const [target] = await txn`
      SELECT
        cm.id,
        cm.role,
        cm.status,
        cm.disabled_at,
        cm.clinic_user_id,
        cu.public_id AS clinic_user_public_id,
        cu.email
      FROM clinic.memberships cm
      JOIN clinic.users cu ON cu.id = cm.clinic_user_id
      WHERE cm.id = ${membershipId}
        AND cm.clinic_id = ${clinicId}
      LIMIT 1
    `;

    if (!target) {
      return null;
    }

    if (target.clinic_user_id === clinicUserId) {
      throw new Error("OwnershipTransferSelfForbidden");
    }

    if (target.status !== "active" || target.disabled_at) {
      throw new Error("OwnershipTransferTargetInvalid");
    }

    const [actorTargetMembership] = await txn`
      SELECT id, role
      FROM clinic.memberships
      WHERE id = ${actorMembership.id}
        AND clinic_id = ${clinicId}
      LIMIT 1
    `;

    if (!actorTargetMembership || actorTargetMembership.role !== "owner") {
      throw new Error("OwnerPrivilegesRequired");
    }

    await txn`
      UPDATE clinic.memberships
      SET
        role = CASE
          WHEN id = ${membershipId} THEN 'owner'
          WHEN id = ${actorMembership.id} THEN 'manager'
          ELSE role
        END,
        updated_at = NOW()
      WHERE id IN (${membershipId}, ${actorMembership.id})
        AND clinic_id = ${clinicId}
    `;

    await logClinicAudit({
      clinicId,
      clinicUserId,
      action: "CLINIC_OWNERSHIP_TRANSFERRED",
      entityType: "clinic_membership",
      entityId: target.clinic_user_public_id,
      details: {
        email: target.email,
        previous_target_role: target.role,
        previous_actor_role: actorTargetMembership.role,
        next_target_role: "owner",
        next_actor_role: "manager",
      },
      request,
    });

    return { id: target.id, clinic_user_id: target.clinic_user_id, role: "owner" };
  });
}
