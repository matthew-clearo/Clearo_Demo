import { Crosshair } from "lucide-react";
import { ClinicsList } from "./ClinicsList";
import { MapView } from "./MapView";
import { SearchCard } from "@/components/HomePage/SearchCard";

export function MobileLayout({
  searchTerm,
  handleLocationChange,
  handleLocationFocus,
  locationSuggestions,
  showSuggestions,
  setShowSuggestions,
  selectLocation,
  scanTypes,
  selectedScanType,
  setSelectedScanType,
  priceRange,
  setPriceRange,
  setSelectedDate,
  clinics,
  isLoading,
  isClinicsError,
  hasActiveFilters,
  clearFilters,
  viewMode,
  setViewMode,
  resultsCount,
  apiKey,
  mapId,
  onClinicClick,
  expandedClinicId,
  setExpandedClinicId,
  selectedDate,
  availabilityByClinic,
  availabilityLoading,
  availabilityError,
  selectedScanTypeForAvailability,
  onPickSlot,
  // map state
  mapCenter,
  mapZoom,
  setUserInteractedWithMap,
  userInteractedWithMap,
  recenterMap,
}) {
  return (
    <div className="md:hidden relative z-10 overflow-x-hidden px-2.5 sm:px-4 py-3 sm:py-5">
      <div
        className="sticky top-0 z-40 pb-3 sm:pb-4"
        style={{
          backgroundColor: "rgba(251, 248, 243, 0.96)",
          backdropFilter: "blur(12px)",
        }}
      >
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

      {viewMode === "map" ? (
        <div className="relative z-0 rounded-[12px] overflow-hidden border border-gray-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <MapView
            clinics={clinics}
            apiKey={apiKey}
            mapId={mapId}
            variant="mobile"
            onClinicClick={onClinicClick}
            selectedClinicId={expandedClinicId}
            selectedScanType={selectedScanTypeForAvailability}
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
              className="absolute bottom-4 right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg"
              aria-label="Recenter map"
            >
              <Crosshair size={18} style={{ color: "#3D6B5E" }} />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div className="rounded-lg sm:rounded-[12px] border border-gray-200 bg-white px-3.5 py-3 sm:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <span
              className="inline-flex items-center px-2 py-0.5 text-[9px] sm:text-[10px] font-medium tracking-[0.08em] uppercase font-inter"
              style={{ backgroundColor: '#e8f3ee', color: '#3D6B5E', borderRadius: '4px' }}
            >
              Search Results
            </span>
            <h2 className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-heading font-semibold text-gray-900">
              {isLoading
                ? "Searching nearby clinics..."
                : `${resultsCount} clinic${resultsCount === 1 ? "" : "s"} available`}
            </h2>
            <p className="mt-0.5 sm:mt-1 text-[13px] sm:text-sm text-gray-500 font-inter">
              Toggle to map view to compare locations.
            </p>
          </div>

          <ClinicsList
            clinics={clinics}
            isLoading={isLoading}
            isClinicsError={isClinicsError}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            variant="mobile"
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
      )}
    </div>
  );
}
