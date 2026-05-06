import { useEffect, useState } from "react";

export function FiltersSidebar({
  showFilters,
  hasActiveFilters,
  clearFilters,
  scanTypes,
  selectedScanType,
  setSelectedScanType,
  selectedCity,
  setSelectedCity,
  priceRange,
  setPriceRange,
}) {
  const [cities, setCities] = useState([]);
  const [citiesError, setCitiesError] = useState(null);

  const SAGE = "#3D6B5E";
  const sageChipStyle = {
    borderColor: SAGE,
    background: "rgba(61,107,94,0.10)",
    color: "#0F172A",
  };

  useEffect(() => {
    let isMounted = true;

    async function loadCities() {
      try {
        const response = await fetch("/api/locations/cities");
        if (!response.ok) {
          throw new Error(
            `When fetching /api/locations/cities, the response was [${response.status}] ${response.statusText}`,
          );
        }
        const data = await response.json();
        if (isMounted) {
          setCities(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load cities for filters:", error);
        if (isMounted) {
          setCitiesError("Could not load cities");
        }
      }
    }

    loadCities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside
      // Widen the sidebar on desktop so the filters don't feel like a tall thin list
      className={`${showFilters ? "block" : "hidden"} md:block w-[300px] lg:w-[340px] flex-shrink-0 pointer-events-auto`}
    >
      <div className="bg-white/95 rounded-3xl p-5 sm:p-6 lg:p-6 pb-7 border border-gray-200 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 font-inter">
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm hover:underline font-inter"
              style={{ color: SAGE }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Scan Type Filter - pill chips */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3 font-inter">
            Scan type
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedScanType("")}
              className="px-3.5 py-1.5 rounded-full border-2 text-sm font-inter transition-colors"
              style={selectedScanType === "" ? sageChipStyle : undefined}
            >
              All types
            </button>
            {scanTypes.map((type) => {
              const isActive = String(type.id) === String(selectedScanType);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() =>
                    setSelectedScanType(isActive ? "" : String(type.id))
                  }
                  className="px-3.5 py-1.5 rounded-full border-2 text-sm font-inter transition-colors"
                  style={isActive ? sageChipStyle : undefined}
                >
                  {type.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* City Filter - chips based on real cities from the database */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3 font-inter">
            City
          </label>
          {citiesError ? (
            <p className="text-xs text-red-500 font-inter">{citiesError}</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className="px-3.5 py-1.5 rounded-full border-2 text-sm font-inter transition-colors"
                style={selectedCity === "" ? sageChipStyle : undefined}
              >
                All cities
              </button>
              {cities.map((city) => {
                const isActive = city === selectedCity;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(isActive ? "" : city)}
                    className="px-3.5 py-1.5 rounded-full border-2 text-sm font-inter transition-colors"
                    style={isActive ? sageChipStyle : undefined}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Price Range Filter */}
        <div className="pt-1">
          <label className="block text-sm font-medium text-gray-700 mb-3 font-inter">
            Price range
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min}
              onChange={(e) =>
                setPriceRange({ ...priceRange, min: e.target.value })
              }
              className="w-1/2 px-3.5 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 font-inter"
              style={{
                // sage focus ring (simple)
                borderColor: priceRange.min
                  ? "rgba(61,107,94,0.55)"
                  : undefined,
              }}
            />
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max}
              onChange={(e) =>
                setPriceRange({ ...priceRange, max: e.target.value })
              }
              className="w-1/2 px-3.5 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 font-inter"
              style={{
                borderColor: priceRange.max
                  ? "rgba(61,107,94,0.55)"
                  : undefined,
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
