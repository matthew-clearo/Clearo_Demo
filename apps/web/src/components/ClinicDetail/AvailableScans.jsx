import FrostedCard from "@/components/ui/FrostedCard";
import { ScanCard } from "./ScanCard";

export function AvailableScans({ scans, onBook }) {
  return (
    <FrostedCard className="p-5 sm:p-6 lg:p-8">
      <h2 className="text-xl sm:text-2xl font-heading text-gray-900 mb-4 sm:mb-6">
        Available Scans
      </h2>
      <div className="space-y-4">
        {scans?.map((scan) => (
          <ScanCard key={scan.id} scan={scan} onBook={onBook} />
        ))}
      </div>
    </FrostedCard>
  );
}
