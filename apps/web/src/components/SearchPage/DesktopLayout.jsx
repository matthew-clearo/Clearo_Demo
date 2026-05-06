import { Crosshair } from "lucide-react";
import { ClinicsList } from "./ClinicsList";
import { MapView } from "./MapView";
import { SearchCard } from "@/components/HomePage/SearchCard";

export function DesktopLayout({
  searchTerm,
  handleLocationChange,
  handleLocationFocus,
  locationSuggestions,
  showSuggestions,
  setShowSuggestions,
  selectLocation,
  hasActiveFilters,
  clearFilters,
  scanTypes,
  selectedScanType,
  setSelectedScanType,
  priceRange,
  setPriceRange,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  resultsCount,
  clinics,
  isLoading,
  isClinicsError,
  apiKey,
  mapId,
  onClinicClick,
  expandedClinicId,
  setExpandedClinicId,
  // NEW
  availabilityByClinic,
  availabilityLoading,
  availabilityError,
  selectedScanTypeForAvailability,
  onPickSlot,
  // map state
  mapCenter,
  mapZoom,
  userInteractedWithMap,
  setUserInteractedWithMap,
  recenterMap,
}) {
  return (
    <div className="hidden md:block relative z-10 px-4 lg:px-8 py-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="relative z-30">
          <SearchCard
            selectedScanType={selectedScanType}
            setSelectedScanType={setSelectedScanType}
            scanTypes={scanTypes}
            searchTerm={searchTerm}
            handleLocationChange={handleLocationChange}
            handleLocationFocus={handleLocationFocus}
            locationSuggestions={locationSuggestions}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            selectLocation={selectLocation}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            hasActiveFilters={hasActiveFilters}
            resultsCount={resultsCount}
            clearFilters={clearFilters}
          />
        </div>

        <div
          className="relative z-0 grid h-[calc(100vh-220px)] gap-6"
          style={{
            gridTemplateColumns:
              viewMode === "map"
                ? "minmax(460px, 0.95fr) minmax(420px, 520px)"
                : "minmax(420px, 0.95fr) minmax(460px, 620px)",
          }}
        >
          <section className="relative min-h-0 overflow-hidden rounded-[12px] border border-gray-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <MapView
              clinics={clinics}
              apiKey={apiKey}
              mapId={mapId}
              variant="desktop"
              onClinicClick={onClinicClick}
              selectedClinicId={expandedClinicId}
              selectedScanType={selectedScanType}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              onCenterChanged={(e) => {
                if (e?.detail?.center) {
                  setUserInteractedWithMap(true);
                }
              }}
            />

            {userInteractedWithMap ? (
              <button
                type="button"
                onClick={recenterMap}
                className="absolute bottom-6 left-6 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg transition-all hover:shadow-xl"
                aria-label="Recenter map"
              >
                <Crosshair size={18} style={{ color: "#3D6B5E" }} />
              </button>
            ) : null}
          </section>

          <section className="min-h-0 overflow-hidden rounded-[12px] border border-gray-200 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 px-6 py-5">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase font-inter"
                  style={{ backgroundColor: '#e8f3ee', color: '#3D6B5E', borderRadius: '4px' }}
                >
                  Search Results
                </span>
                <h2 className="mt-2 text-2xl font-heading font-semibold text-gray-900">
                  {isLoading
                    ? "Searching nearby clinics..."
                    : `${resultsCount} clinic${resultsCount === 1 ? "" : "s"} available`}
                </h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <ClinicsList
                  clinics={clinics}
                  isLoading={isLoading}
                  isClinicsError={isClinicsError}
                  hasActiveFilters={hasActiveFilters}
                  clearFilters={clearFilters}
                  variant="desktop"
                  expandedClinicId={expandedClinicId}
                  setExpandedClinicId={setExpandedClinicId}
                  selectedDateFilter={selectedDate}
                  availabilityByClinic={availabilityByClinic}
                  availabilityLoading={availabilityLoading}
                  availabilityError={availabilityError}
                  selectedScanTypeForAvailability={selectedScanTypeForAvailability}
                  onPickSlot={onPickSlot}
                  onClinicClick={onClinicClick}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
