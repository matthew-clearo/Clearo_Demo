import { ClinicCard } from "@/components/SearchPage/ClinicCard";

export function ResultsSection({
  viewMode,
  hasActiveFilters,
  isLoading,
  isClinicsError,
  clinics,
  expandedClinicId,
  setExpandedClinicId,
  availabilityByClinic,
  availabilityLoading,
  availabilityError,
  selectedScanType,
  selectedDate,
  onPickSlot,
}) {
  if (!hasActiveFilters) {
    return null;
  }

  return (
    <section className="px-6 lg:px-12 py-16 lg:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 font-inter mb-3">
            Available Clinics
          </h2>
          {clinics.length > 0 && (
            <p className="text-lg text-gray-600 font-inter">
              {clinics.length} {clinics.length === 1 ? "clinic" : "clinics"}{" "}
              found
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-gray-300 border-t-[#3D6B5E]" />
            <div className="mt-6 text-lg text-gray-600 font-inter">
              Finding clinics...
            </div>
          </div>
        ) : isClinicsError ? (
          <div className="text-center py-20">
            <div className="text-lg text-gray-600 font-inter">
              Couldn't load clinics. Please try again.
            </div>
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-lg text-gray-600 font-inter mb-6">
              No clinics found. Try adjusting your filters.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-[#3D6B5E] text-white font-bold hover:bg-[#4A7D6D] transition-colors"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {clinics.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                clinic={clinic}
                variant="desktop"
                expanded={expandedClinicId === clinic.id}
                onToggleExpanded={(id) =>
                  setExpandedClinicId(expandedClinicId === id ? null : id)
                }
                availability={availabilityByClinic[clinic.id]}
                availabilityLoading={availabilityLoading}
                availabilityError={availabilityError}
                selectedScanTypeForAvailability={selectedScanType}
                selectedDateFilter={selectedDate}
                onPickSlot={onPickSlot}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
