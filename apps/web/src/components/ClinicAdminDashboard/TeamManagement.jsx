import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import secureFetch from "@/utils/secureFetch";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "read_only", label: "Read only" },
  { value: "billing", label: "Billing" },
  { value: "owner", label: "Owner" },
];

const ROLE_GUIDE = [
  {
    value: "owner",
    label: "Owner",
    description: "Full clinic control, including team access, ownership transfer, and sensitive settings.",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Can manage day-to-day clinic operations and team members, but cannot manage owners.",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Can work with bookings and clinic operations without changing team permissions.",
  },
  {
    value: "billing",
    label: "Billing",
    description: "Focused access for billing and payment-adjacent work without broader admin controls.",
  },
  {
    value: "read_only",
    label: "Read only",
    description: "View clinic information without making operational or access changes.",
  },
];

const MANAGEABLE_ROLE_OPTIONS = ROLE_OPTIONS.filter((option) => option.value !== "owner");

export function TeamManagement({ selectedClinicId, actorRole, currentClinicUserId }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(actorRole === "owner" ? "manager" : "staff");

  const queryKey = ["clinicTeam", selectedClinicId];
  const teamQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/clinic/invitations?clinicId=${encodeURIComponent(String(selectedClinicId))}`,
      );
      if (!res.ok) {
        throw new Error(`Could not load team access: [${res.status}] ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!selectedClinicId,
  });

  const roleOptions = useMemo(() => {
    if (actorRole === "owner") return ROLE_OPTIONS;
    return ROLE_OPTIONS.filter((option) => option.value !== "owner");
  }, [actorRole]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await secureFetch("/api/clinic/invitations", {
        method: "POST",
        body: JSON.stringify({
          clinicId: selectedClinicId,
          email,
          role,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Could not send invite");
      }
      return body;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Invite sent");
      setEmail("");
      setRole(actorRole === "owner" ? "manager" : "staff");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast.error(err?.message || "Could not send invite");
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, inviteId, membershipId, role }) => {
      const res = await secureFetch("/api/clinic/invitations", {
        method: "PATCH",
        body: JSON.stringify({
          clinicId: selectedClinicId,
          action,
          inviteId,
          membershipId,
          role,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Could not update team access");
      }
      return body;
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "revoke_invite"
          ? "Invite revoked"
          : vars.action === "resend_invite"
            ? "Invite resent"
            : vars.action === "disable_member"
              ? "Team member disabled"
              : vars.action === "enable_member"
                ? "Team member re-enabled"
                : vars.action === "update_member_role"
                  ? "Team role updated"
                  : "Ownership transferred",
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast.error(err?.message || "Could not update team access");
    },
  });

  const members = teamQuery.data?.members || [];
  const invitations = teamQuery.data?.invitations || [];
  const pendingInvites = invitations.filter((invite) => invite.status === "pending");

  function confirmAction(message) {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  }

  function handleInviteSend() {
    const selectedRole = ROLE_GUIDE.find((entry) => entry.value === role);
    const confirmed = confirmAction(
      `Send a ${selectedRole?.label || role} invite to ${email.trim()}? They will gain clinic access after accepting.`,
    );
    if (!confirmed) return;
    inviteMutation.mutate();
  }

  function handleRoleUpdate(member, nextRole) {
    if (member.role === nextRole) return;
    const nextRoleLabel = ROLE_GUIDE.find((entry) => entry.value === nextRole)?.label || nextRole;
    const confirmed = confirmAction(
      `Change ${member.name || member.email} from ${String(member.role).replace("_", " ")} to ${nextRoleLabel}? This updates their clinic access immediately.`,
    );
    if (!confirmed) return;
    actionMutation.mutate({
      action: "update_member_role",
      membershipId: member.id,
      role: nextRole,
    });
  }

  function handleOwnershipTransfer(member) {
    const confirmed = confirmAction(
      `Transfer clinic ownership to ${member.name || member.email}? You will be demoted to manager immediately.`,
    );
    if (!confirmed) return;
    actionMutation.mutate({
      action: "transfer_ownership",
      membershipId: member.id,
    });
  }

  function handleMembershipToggle(member, isDisabled) {
    const confirmed = confirmAction(
      isDisabled
        ? `Re-enable ${member.name || member.email}? They will regain clinic access immediately.`
        : `Disable ${member.name || member.email}? This removes their clinic access immediately.`,
    );
    if (!confirmed) return;
    actionMutation.mutate({
      action: isDisabled ? "enable_member" : "disable_member",
      membershipId: member.id,
    });
  }

  function handleInviteAction(invite, action) {
    const message =
      action === "resend_invite"
        ? `Resend the clinic invite to ${invite.email}?`
        : `Revoke the pending clinic invite for ${invite.email}? They will need a new invite to join later.`;
    const confirmed = confirmAction(message);
    if (!confirmed) return;
    actionMutation.mutate({
      action,
      inviteId: invite.id,
    });
  }

  return (
    <div className="space-y-6">
      <FrostedCard className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Team access</h3>
            <p className="text-sm text-gray-600 mt-1">
              Invite clinic employees and manage who can access this clinic portal.
            </p>
          </div>
          <div className="text-sm font-semibold" style={{ color: SAGE }}>
            {pendingInvites.length} pending invite{pendingInvites.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee@clinic.com"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-inter"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-inter"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleInviteSend}
            disabled={!email.trim() || inviteMutation.isPending}
            className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: SAGE }}
          >
            {inviteMutation.isPending ? "Sending..." : "Send invite"}
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200/70 bg-white/60 p-4">
          <div className="text-sm font-semibold text-gray-900">Role guide</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ROLE_GUIDE.map((roleEntry) => (
              <div key={roleEntry.value} className="rounded-xl border border-gray-200/70 bg-white p-3">
                <div className="text-sm font-semibold text-gray-900">{roleEntry.label}</div>
                <div className="mt-1 text-xs text-gray-600">{roleEntry.description}</div>
              </div>
            ))}
          </div>
        </div>
      </FrostedCard>

      <FrostedCard className="p-6">
        <h3 className="text-lg font-bold text-gray-900">Current team</h3>
        {teamQuery.isLoading ? (
          <div className="mt-4 text-gray-600">Loading clinic team…</div>
        ) : teamQuery.error ? (
          <div className="mt-4 text-red-700">
            {teamQuery.error?.message || "Could not load clinic team."}
          </div>
        ) : members.length === 0 ? (
          <div className="mt-4 text-gray-600">No clinic team members found.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {members.map((member) => {
              const isDisabled = member.status !== "active" || member.disabled_at;
              const isSelf = String(member.clinic_user_public_id) === String(currentClinicUserId);
              const canEditRole = actorRole === "owner" && !isSelf;
              const canManage =
                !isSelf &&
                (actorRole === "owner" ||
                  (actorRole === "manager" &&
                    member.role !== "owner" &&
                    member.role !== "manager"));

              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {member.name || member.email}
                    </div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="rounded-full border border-gray-200 px-2 py-1 uppercase tracking-[0.14em]">
                        {member.role}
                      </span>
                      <span>{isDisabled ? "Disabled" : "Active"}</span>
                      {isSelf && <span>This is you</span>}
                      {member.last_login_at && (
                        <span>Last login {new Date(member.last_login_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {canEditRole ? (
                      <div className="flex items-center gap-2">
                        {member.role === "owner" ? (
                          <button
                            type="button"
                            onClick={() => handleRoleUpdate(member, "manager")}
                            disabled={actionMutation.isPending}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                          >
                            Demote to manager
                          </button>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleUpdate(member, e.target.value)}
                            disabled={actionMutation.isPending}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                          >
                            {MANAGEABLE_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {member.role !== "owner" && !isDisabled ? (
                          <button
                            type="button"
                            onClick={() => handleOwnershipTransfer(member)}
                            disabled={actionMutation.isPending}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
                          >
                            Transfer ownership
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleMembershipToggle(member, isDisabled)}
                        disabled={actionMutation.isPending}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold"
                        style={{
                          borderColor: isDisabled ? "rgba(61,107,94,0.25)" : "rgba(127,29,29,0.15)",
                          color: isDisabled ? SAGE : "#991B1B",
                          background: isDisabled ? "rgba(61,107,94,0.06)" : "rgba(127,29,29,0.04)",
                        }}
                      >
                        {isDisabled ? "Re-enable" : "Disable"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FrostedCard>

      <FrostedCard className="p-6">
        <h3 className="text-lg font-bold text-gray-900">Pending invites</h3>
        {pendingInvites.length === 0 ? (
          <div className="mt-4 text-gray-600">No pending invites.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-gray-900">{invite.email}</div>
                  <div className="text-sm text-gray-600 capitalize">{invite.role.replace("_", " ")}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    Expires {new Date(invite.expires_at).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInviteAction(invite, "resend_invite")}
                  disabled={actionMutation.isPending}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => handleInviteAction(invite, "revoke_invite")}
                  disabled={actionMutation.isPending}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </FrostedCard>
    </div>
  );
}

export default TeamManagement;
