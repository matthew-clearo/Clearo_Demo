import logger from "@/app/api/utils/logger";
import { withFullProtection, withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";
import {
  createClinicInvitation,
  listClinicTeam,
  resendClinicInvitation,
  revokeClinicInvitation,
  setClinicMembershipStatus,
  transferClinicOwnership,
  updateClinicMembershipRole,
} from "@/app/api/utils/clinicInvitations";

const VALID_ROLES = new Set(["owner", "manager", "staff", "read_only", "billing"]);

function canInviteRole(actorRole, targetRole) {
  if (actorRole === "owner") return VALID_ROLES.has(targetRole);
  if (actorRole === "manager") {
    return ["manager", "staff", "read_only", "billing"].includes(targetRole);
  }
  return false;
}

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");

      if (!clinicPublicId) {
        return Response.json({ error: "Missing clinicId" }, { status: 400 });
      }

      const membershipResult = await requireClinicMembership(request, clinicPublicId);
      if (membershipResult instanceof Response) return membershipResult;

      const team = await listClinicTeam({ clinicId: membershipResult.clinic.id });
      return Response.json(team);
    } catch (err) {
      logger.error({ err }, "GET /api/clinic/invitations error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const clinicPublicId = typeof body.clinicId === "string" ? body.clinicId : "";
      const email = typeof body.email === "string" ? body.email : "";
      const role = typeof body.role === "string" ? body.role : "staff";

      if (!clinicPublicId || !email.trim() || !VALID_ROLES.has(role)) {
        return Response.json({ error: "clinicId, email, and valid role are required" }, { status: 400 });
      }

      const membershipResult = await requireClinicMembership(
        request,
        clinicPublicId,
        ["owner", "manager"],
      );
      if (membershipResult instanceof Response) return membershipResult;

      if (!canInviteRole(membershipResult.membership.role, role)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const { invite, existingUserPromoted } = await createClinicInvitation({
        clinicId: membershipResult.clinic.id,
        invitedByClinicUserId: membershipResult.clinicUser.id,
        email,
        role,
        request,
      });

      return Response.json({
        success: true,
        invitation: invite,
        existingUserPromoted,
        message: existingUserPromoted
          ? "Existing clinic user added to this clinic and notified by email."
          : "Clinic team invitation sent.",
      });
    } catch (err) {
      logger.error({ err }, "POST /api/clinic/invitations error");

      if (err?.message === "ClinicInviteEmailUnavailable") {
        return Response.json({ error: "Could not send invite email right now." }, { status: 503 });
      }
      if (err?.message === "ClinicUserAlreadyActive") {
        return Response.json({ error: "That email already has active access to this clinic." }, { status: 409 });
      }

      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

export async function PATCH(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const clinicPublicId = typeof body.clinicId === "string" ? body.clinicId : "";
      const action = typeof body.action === "string" ? body.action : "";

      if (!clinicPublicId || !action) {
        return Response.json({ error: "clinicId and action are required" }, { status: 400 });
      }

      const membershipResult = await requireClinicMembership(
        request,
        clinicPublicId,
        ["owner", "manager"],
      );
      if (membershipResult instanceof Response) return membershipResult;

      if (action === "revoke_invite" || action === "resend_invite") {
        const inviteId = Number(body.inviteId);
        if (!Number.isInteger(inviteId) || inviteId <= 0) {
          return Response.json({ error: "Valid inviteId is required" }, { status: 400 });
        }

        if (action === "resend_invite") {
          const resent = await resendClinicInvitation({
            clinicId: membershipResult.clinic.id,
            inviteId,
            invitedByClinicUserId: membershipResult.clinicUser.id,
            request,
          });
          if (!resent) {
            return Response.json({ error: "Invitation not found" }, { status: 404 });
          }
          return Response.json({
            success: true,
            message: resent.existingUserPromoted
              ? "Existing clinic user added to this clinic and notified by email."
              : "Clinic invitation resent.",
          });
        }

        const invite = await revokeClinicInvitation({
          clinicId: membershipResult.clinic.id,
          inviteId,
          clinicUserId: membershipResult.clinicUser.id,
          request,
        });
        if (!invite) {
          return Response.json({ error: "Invitation not found" }, { status: 404 });
        }
        return Response.json({ success: true });
      }

      if (action === "disable_member" || action === "enable_member") {
        const membershipId = Number(body.membershipId);
        if (!Number.isInteger(membershipId) || membershipId <= 0) {
          return Response.json({ error: "Valid membershipId is required" }, { status: 400 });
        }

        const updated = await setClinicMembershipStatus({
          clinicId: membershipResult.clinic.id,
          membershipId,
          actorMembership: membershipResult.membership,
          clinicUserId: membershipResult.clinicUser.id,
          action: action === "disable_member" ? "disable" : "enable",
          request,
        });

        if (!updated) {
          return Response.json({ error: "Membership not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      }

      if (action === "update_member_role") {
        const membershipId = Number(body.membershipId);
        const role = typeof body.role === "string" ? body.role : "";
        if (!Number.isInteger(membershipId) || membershipId <= 0 || !VALID_ROLES.has(role)) {
          return Response.json({ error: "Valid membershipId and role are required" }, { status: 400 });
        }

        const updated = await updateClinicMembershipRole({
          clinicId: membershipResult.clinic.id,
          membershipId,
          actorMembership: membershipResult.membership,
          clinicUserId: membershipResult.clinicUser.id,
          nextRole: role,
          request,
        });

        if (!updated) {
          return Response.json({ error: "Membership not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      }

      if (action === "transfer_ownership") {
        const membershipId = Number(body.membershipId);
        if (!Number.isInteger(membershipId) || membershipId <= 0) {
          return Response.json({ error: "Valid membershipId is required" }, { status: 400 });
        }

        const updated = await transferClinicOwnership({
          clinicId: membershipResult.clinic.id,
          membershipId,
          actorMembership: membershipResult.membership,
          clinicUserId: membershipResult.clinicUser.id,
          request,
        });

        if (!updated) {
          return Response.json({ error: "Membership not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      }

      return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
      logger.error({ err }, "PATCH /api/clinic/invitations error");

      if (err?.message === "LastOwnerProtected") {
        return Response.json({ error: "You cannot remove the last active clinic owner." }, { status: 409 });
      }
      if (err?.message === "SelfDisableForbidden") {
        return Response.json({ error: "You cannot disable your own clinic access." }, { status: 409 });
      }
      if (err?.message === "SelfRoleChangeForbidden") {
        return Response.json({ error: "You cannot change your own clinic role here." }, { status: 409 });
      }
      if (err?.message === "OwnershipTransferSelfForbidden") {
        return Response.json({ error: "Select another team member to transfer ownership." }, { status: 409 });
      }
      if (err?.message === "OwnershipTransferTargetInvalid") {
        return Response.json({ error: "Ownership can only be transferred to an active team member." }, { status: 409 });
      }
      if (err?.message === "ClinicInviteNotPending") {
        return Response.json({ error: "Only pending invites can be resent." }, { status: 409 });
      }
      if (err?.message === "InvalidClinicRole") {
        return Response.json({ error: "Invalid clinic role." }, { status: 400 });
      }
      if (err?.message === "OwnerPrivilegesRequired" || err?.message === "ManagerPrivilegesRequired") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
