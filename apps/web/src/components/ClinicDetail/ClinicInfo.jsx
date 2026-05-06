import { MapPin, Phone, Mail } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";

export function ClinicInfo({ clinic }) {
  return (
    <FrostedCard className="p-5 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-heading text-gray-900 mb-3 sm:mb-4">
        {clinic.name}
      </h1>
      <p className="text-gray-700 mb-4 sm:mb-6 font-inter leading-relaxed text-sm sm:text-base">
        {clinic.description}
      </p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <MapPin size={20} className="text-gray-400 mt-0.5" />
          <div>
            <p className="text-gray-900 font-inter text-sm sm:text-base">
              {clinic.address}
            </p>
            <p className="text-gray-600 font-inter text-sm">
              {clinic.city}, {clinic.state} {clinic.zip_code}
            </p>
          </div>
        </div>
        {clinic.phone && (
          <div className="flex items-center gap-3">
            <Phone size={20} className="text-gray-400" />
            <a
              href={`tel:${clinic.phone}`}
              className="text-gray-900 hover:text-[#3D6B5E] transition-colors font-inter text-sm sm:text-base"
            >
              {clinic.phone}
            </a>
          </div>
        )}
        {clinic.email && (
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-gray-400" />
            <a
              href={`mailto:${clinic.email}`}
              className="text-gray-900 hover:text-[#3D6B5E] transition-colors font-inter text-sm sm:text-base"
            >
              {clinic.email}
            </a>
          </div>
        )}
      </div>
    </FrostedCard>
  );
}
