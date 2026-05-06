import { Shield, ShieldCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import secureFetch from "@/utils/secureFetch";
import { toast } from "sonner";

export function SecuritySettings({ clinicUser, mfaEligible, mfaEnabled, mfaVerified }) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["clinicSessions"],
    queryFn: async () => {
      const res = await fetch("/api/clinic/auth/sessions");
      if (!res.ok) {
        throw new Error(`Could not load sessions: [${res.status}] ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!clinicUser,
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ action, sessionId }) => {
      const res = await secureFetch("/api/clinic/auth/sessions", {
        method: "DELETE",
        body: JSON.stringify({ action, sessionId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Could not update sessions");
      }
      return body;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "revoke_others" ? "Other sessions revoked" : "Session revoked");
      queryClient.invalidateQueries({ queryKey: ["clinicSessions"] });
    },
    onError: (err) => {
      toast.error(err?.message || "Could not update sessions");
    },
  });

  const sessions = sessionsQuery.data?.sessions || [];

  return (
    <div className="space-y-6">
      <FrostedCard className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Security settings</h3>
            <p className="mt-1 text-sm text-gray-600">
              Manage extra sign-in protection for your clinic portal account.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{
              color: mfaEnabled ? SAGE : "#9CA3AF",
              background: mfaEnabled ? "rgba(61,107,94,0.10)" : "rgba(107,114,128,0.08)",
              border: mfaEnabled ? "1px solid rgba(61,107,94,0.18)" : "1px solid rgba(107,114,128,0.12)",
            }}
          >
            {mfaEnabled ? <ShieldCheck size={14} /> : <Shield size={14} />}
            {mfaEnabled ? "MFA enabled" : "MFA not enabled"}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200/70 bg-white/60 p-5">
          <div className="text-sm text-gray-900 font-semibold">
            {clinicUser?.name || clinicUser?.email || "Clinic account"}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {mfaEligible
              ? "Any active clinic team member can enable MFA here. It’s optional and managed from clinic settings."
              : "MFA setup is available for active clinic team members with access to this portal."}
          </div>
          {mfaEligible ? (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {!mfaEnabled ? (
                <a
                  href={getClinicLocalHref("/clinic-admin/mfa-setup")}
                  className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: SAGE }}
                >
                  Set up MFA
                </a>
              ) : (
                <a
                  href={getClinicLocalHref("/clinic-admin/mfa-challenge")}
                  className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: SAGE }}
                >
                  Verify MFA
                </a>
              )}
              <div className="text-xs text-gray-500">
                Session status: {mfaEnabled ? (mfaVerified ? "verified" : "not verified") : "not set up"}
              </div>
            </div>
          ) : null}
        </div>
      </FrostedCard>

      <FrostedCard className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Active sessions</h3>
            <p className="mt-1 text-sm text-gray-600">
              Review where this clinic account is signed in and revoke old devices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => revokeMutation.mutate({ action: "revoke_others" })}
            disabled={revokeMutation.isPending || sessions.filter((session) => !session.is_current).length === 0}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 disabled:opacity-50"
          >
            Sign out other sessions
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {sessionsQuery.isLoading ? (
            <div className="text-gray-600">Loading sessions…</div>
          ) : sessionsQuery.error ? (
            <div className="text-red-700">{sessionsQuery.error?.message || "Could not load sessions."}</div>
          ) : sessions.length === 0 ? (
            <div className="text-gray-600">No active sessions found.</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-gray-900">
                    {session.is_current ? "Current session" : "Signed-in device"}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {session.user_agent || "Unknown browser or device"}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                    <span>Started {new Date(session.created_at).toLocaleString()}</span>
                    <span>Expires {new Date(session.expires_at).toLocaleString()}</span>
                    {session.ip_address ? <span>IP {session.ip_address}</span> : null}
                  </div>
                </div>
                {!session.is_current ? (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate({ action: "revoke_session", sessionId: session.id })}
                    disabled={revokeMutation.isPending}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </FrostedCard>
    </div>
  );
}

export default SecuritySettings;
