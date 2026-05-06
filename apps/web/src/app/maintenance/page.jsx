import MaintenancePage from "@/components/MaintenancePage";

export const metadata = {
  title: "Maintenance | Clearo",
  description: "Clearo is temporarily unavailable while scheduled maintenance is in progress.",
};

export default function Maintenance() {
  return <MaintenancePage />;
}
