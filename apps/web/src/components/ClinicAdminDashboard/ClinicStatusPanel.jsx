import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";

function getStatusConfig(status) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        title: "Your clinic is live on Clearo.",
        description:
          "Patients can now discover your clinic and book according to your current availability and scan setup.",
        tone: {
          background: "rgba(61,107,94,0.08)",
          border: "rgba(61,107,94,0.18)",
          badgeBg: "rgba(61,107,94,0.12)",
          badgeColor: SAGE,
        },
        bullets: [
          "Keep hours, machines, and pricing up to date.",
          "Review referrals and booking activity regularly.",
        ],
      };
    case "rejected":
      return {
        label: "Needs Attention",
        title: "Your clinic submission needs changes before approval.",
        description:
          "Internal ops has not approved this clinic yet. Review your details and contact support if you need clarification on what must be updated.",
        tone: {
          background: "rgba(127,29,29,0.05)",
          border: "rgba(127,29,29,0.14)",
          badgeBg: "rgba(127,29,29,0.10)",
          badgeColor: "#991B1B",
        },
        bullets: [
          "Check clinic profile, contact details, machines, and pricing.",
          "Reach out to Clearo support if approval feedback is missing.",
        ],
      };
    default:
      return {
        label: "Under Review",
        title: "Your clinic has been submitted and is awaiting review.",
        description:
          "You can continue setting up operations while the Clearo team reviews your clinic. We’ll email you once the clinic is approved or if we need more information.",
        tone: {
          background: "rgba(180,83,9,0.05)",
          border: "rgba(180,83,9,0.16)",
          badgeBg: "rgba(180,83,9,0.10)",
          badgeColor: "#B45309",
        },
        bullets: [
          "Keep your team, machines, business hours, and pricing accurate.",
          "Watch for approval or follow-up emails from Clearo.",
        ],
      };
  }
}

export function ClinicStatusPanel({ clinic }) {
  const status = clinic?.approval_status || "pending";
  const config = getStatusConfig(status);

  return (
    <FrostedCard className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div
            className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{
              background: config.tone.badgeBg,
              color: config.tone.badgeColor,
            }}
          >
            {config.label}
          </div>
          <h3 className="mt-3 text-lg font-bold text-gray-900">{config.title}</h3>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">{config.description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {config.bullets.map((bullet) => (
          <div
            key={bullet}
            className="rounded-2xl px-4 py-3 text-sm text-gray-700"
            style={{
              background: config.tone.background,
              border: `1px solid ${config.tone.border}`,
            }}
          >
            {bullet}
          </div>
        ))}
      </div>
    </FrostedCard>
  );
}

export default ClinicStatusPanel;
