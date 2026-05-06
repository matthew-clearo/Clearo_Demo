import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FrostedCard from "@/components/ui/FrostedCard";

const ACTION_LABELS = {
  CLINIC_TEAM_MEMBER_INVITED: "Team member invited",
  CLINIC_TEAM_MEMBER_GRANTED: "Existing staff granted access",
  CLINIC_TEAM_INVITE_REVOKED: "Invite revoked",
  CLINIC_TEAM_MEMBER_DISABLED: "Team member disabled",
  CLINIC_TEAM_MEMBER_ENABLED: "Team member re-enabled",
  CLINIC_TEAM_MEMBER_ROLE_UPDATED: "Team role updated",
  CLINIC_OWNERSHIP_TRANSFERRED: "Ownership transferred",
};

function formatAction(action) {
  return ACTION_LABELS[action] || String(action || "").replaceAll("_", " ").toLowerCase();
}

function formatDetails(details) {
  if (!details || typeof details !== "object") return "No extra details";

  const parts = [];
  if (details.email) parts.push(details.email);
  if (details.role) parts.push(`role ${String(details.role).replace("_", " ")}`);
  if (details.previous_role && details.next_role) {
    parts.push(`${String(details.previous_role).replace("_", " ")} -> ${String(details.next_role).replace("_", " ")}`);
  }
  if (details.next_target_role && details.next_actor_role) {
    parts.push(`new owner ${String(details.next_target_role).replace("_", " ")}, previous owner ${String(details.next_actor_role).replace("_", " ")}`);
  }

  return parts.length > 0 ? parts.join(" • ") : "No extra details";
}

export function AuditActivity({ selectedClinicId, actorRole }) {
  const [actionFilter, setActionFilter] = useState("");
  const queryKey = ["clinicAuditLogs", selectedClinicId, actionFilter];

  const auditQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ clinicId: String(selectedClinicId), limit: "50" });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/clinic/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Could not load activity: [${res.status}] ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!selectedClinicId && (actorRole === "owner" || actorRole === "manager"),
  });

  const actionOptions = useMemo(
    () => (auditQuery.data?.actionSummary || []).map((item) => item.action),
    [auditQuery.data?.actionSummary],
  );

  if (actorRole !== "owner" && actorRole !== "manager") {
    return (
      <FrostedCard className="p-6">
        <h3 className="text-lg font-bold text-gray-900">Audit activity</h3>
        <p className="mt-2 text-sm text-gray-600">
          Audit activity is visible to clinic owners and managers only.
        </p>
      </FrostedCard>
    );
  }

  return (
    <div className="space-y-6">
      <FrostedCard className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Audit activity</h3>
            <p className="mt-1 text-sm text-gray-600">
              Review clinic access changes, invites, role updates, and other staff actions.
            </p>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-inter"
          >
            <option value="">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </div>
      </FrostedCard>

      <FrostedCard className="p-6">
        {auditQuery.isLoading ? (
          <div className="text-gray-600">Loading audit activity…</div>
        ) : auditQuery.error ? (
          <div className="text-red-700">{auditQuery.error?.message || "Could not load audit activity."}</div>
        ) : (auditQuery.data?.logs || []).length === 0 ? (
          <div className="text-gray-600">No audit activity found for this clinic yet.</div>
        ) : (
          <div className="grid gap-3">
            {(auditQuery.data?.logs || []).map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-gray-200/70 bg-white/60 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-gray-900">{formatAction(log.action)}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {log.actor_name || log.actor_email || "Unknown actor"}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {formatDetails(log.details)}
                </div>
              </div>
            ))}
          </div>
        )}
      </FrostedCard>
    </div>
  );
}

export default AuditActivity;
