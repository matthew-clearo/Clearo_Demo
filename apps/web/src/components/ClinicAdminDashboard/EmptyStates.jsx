import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";
import { buildClinicPortalHref, getClinicLocalHref } from "@/utils/clinicPortal";

export function LoadingState() {
  return <FrostedCard className="p-6">Loading your clinic…</FrostedCard>;
}

export function NotSignedInState() {
  return (
    <FrostedCard className="p-6">
      <p className="text-gray-800">You're not signed in.</p>
      <p className="text-gray-600 mt-1">
        Sign in through the clinic portal to access your clinic dashboard.
      </p>
      <a
        href={getClinicLocalHref("/clinic-admin/signin")}
        className="inline-flex mt-4 px-4 py-2 rounded-2xl font-semibold transition-all"
        style={{
          border: `2px solid ${SAGE}`,
          color: "#0F172A",
          background: "rgba(61, 107, 94, 0.14)",
        }}
      >
        Go to clinic sign in
      </a>
    </FrostedCard>
  );
}

export function ClinicsErrorState({ error }) {
  return (
    <FrostedCard className="p-6">
      <p className="text-red-700">
        {error?.message || "Could not load clinics."}
      </p>
    </FrostedCard>
  );
}

export function NoClinicsState() {
  return (
    <FrostedCard className="p-6">
      <p className="text-gray-800 font-semibold">
        No clinic connected to this account.
      </p>
      <p className="text-gray-600 mt-1">
        If you're a provider, submit your clinic at{" "}
        <a
          className="underline"
          style={{ color: SAGE }}
          href={buildClinicPortalHref("/signup?callbackUrl=%2Fonboarding")}
        >
          clinic onboarding
        </a>
        .
      </p>
    </FrostedCard>
  );
}

export function ClinicErrorState({ error }) {
  return (
    <FrostedCard className="p-6">
      <p className="text-red-700">
        {error?.message || "Could not load clinic details."}
      </p>
    </FrostedCard>
  );
}
