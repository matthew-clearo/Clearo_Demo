import { Calendar, DollarSign, BadgeCheck } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";

export function QuickInfo({ clinic }) {
  return (
    <FrostedCard className="lg:sticky lg:top-24 p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-heading text-gray-900 mb-3 sm:mb-4">
        Quick Info
      </h3>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-3 p-3 bg-white/60 border border-gray-200/60 rounded-2xl">
          <Calendar size={20} className="text-[#3D6B5E]" />
          <div>
            <p className="text-xs text-gray-500 font-inter">
              Availability
            </p>
            <p className="text-sm font-medium text-gray-900 font-inter">
              Listed appointment slots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/60 border border-gray-200/60 rounded-2xl">
          <DollarSign size={20} className="text-[#3D6B5E]" />
          <div>
            <p className="text-xs text-gray-500 font-inter">
              Starting Price
            </p>
            <p className="text-sm font-medium text-gray-900 font-inter">
              $
              {clinic.scans?.[0]
                ? parseFloat(clinic.scans[0].price).toFixed(0)
                : "N/A"}
            </p>
          </div>
        </div>
        {clinic.is_verified && (
          <div className="flex items-center gap-3 p-3 bg-green-50/80 border border-green-200/60 rounded-2xl">
            <BadgeCheck size={20} className="text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-inter">
	                Clinic listed
              </p>
              <p className="text-sm font-medium text-gray-900 font-inter">
	                Profile reviewed
              </p>
            </div>
          </div>
        )}
      </div>
    </FrostedCard>
  );
}
