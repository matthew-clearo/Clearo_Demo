import { BadgeCheck } from "lucide-react";

export function ClinicHero({ clinic }) {
  return (
    <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl sm:rounded-3xl overflow-hidden mb-6 sm:mb-8">
      <img
        src={clinic.image_url}
        alt={clinic.name}
        className="w-full h-full object-cover"
      />
      {clinic.is_verified && (
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-white/80 backdrop-blur-xl px-3 sm:px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-white/60">
          <BadgeCheck size={20} className="text-[#3D6B5E]" />
          <span className="font-medium text-gray-900 font-inter text-sm">
            Listed Clinic
          </span>
        </div>
      )}
    </div>
  );
}
