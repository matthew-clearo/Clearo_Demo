import { useState } from "react";
import { ArrowRight, MapPin, Scan } from "lucide-react";

const SAGE = "#3D6B5E";

export function HomePageSearchForm({
  scanTypes = [],
  buttonLabel = "Compare prices",
  compact = false,
  heroWide = false,
  className = "",
}) {
  const [selectedScanType, setSelectedScanType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const canSearch = Boolean(selectedScanType && searchTerm);

  const handleLocationChange = async (value) => {
    setSearchTerm(value);

    try {
      const response = await fetch(
        `/api/locations?scope=major&search=${encodeURIComponent(value)}`,
      );

      if (!response.ok) {
        setShowSuggestions(false);
        return;
      }

      const data = await response.json();
      setLocationSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setShowSuggestions(false);
    }
  };

  const selectLocation = (location) => {
    setSearchTerm(location.name);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    if (!canSearch) return;

    setShowSuggestions(false);
    window.location.href = `/search?scanType=${selectedScanType}&location=${encodeURIComponent(searchTerm)}`;
  };

  return (
    <div
      className={`border ${
        heroWide && !compact
          ? "rounded-[24px] p-2 sm:p-2.5"
          : `rounded-[18px] ${compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"}`
      } ${className}`}
      style={{
        backgroundColor: heroWide && !compact ? "#FFFFFF" : compact ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.9)",
        borderColor: "rgba(26,26,26,0.08)",
        boxShadow: compact
          ? "0 8px 24px rgba(70,54,39,0.05)"
          : "0 1px 3px rgba(0,0,0,0.03), 0 18px 48px rgba(70,54,39,0.08)",
        backdropFilter: heroWide && !compact ? undefined : "blur(16px)",
        WebkitBackdropFilter: heroWide && !compact ? undefined : "blur(16px)",
      }}
    >
      <div
        className={`grid grid-cols-1 ${
          heroWide && !compact
            ? "gap-2 lg:gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)_4.5rem] lg:items-center"
            : compact
              ? "gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto]"
              : "gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto]"
        }`}
      >
        <div
          className={`${
            heroWide && !compact
              ? "rounded-[18px] border px-4 py-3.5 lg:min-h-[5.25rem] lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:border-0 lg:border-r lg:px-7 lg:py-3"
              : `rounded-[14px] border ${compact ? "px-3.5 py-3" : "px-4 py-3.5"}`
          }`}
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "rgba(26,26,26,0.06)",
          }}
        >
          <div className="text-[10px] font-inter font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(26,26,26,0.42)" }}>
            Scan type
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
            >
              <Scan size={16} style={{ color: SAGE }} />
            </div>
            <select
              value={selectedScanType}
              onChange={(event) => setSelectedScanType(event.target.value)}
              className="w-full bg-transparent text-[15px] sm:text-base text-gray-900 font-inter font-semibold focus:outline-none"
            >
              <option value="">Select scan type</option>
              {scanTypes.map((scanType) => (
                <option key={scanType.id} value={scanType.id}>
                  {scanType.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <div
            className={`${
              heroWide && !compact
                ? "rounded-[18px] border px-4 py-3.5 lg:min-h-[5.25rem] lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:border-0 lg:border-r lg:px-7 lg:py-3"
                : `rounded-[14px] border ${compact ? "px-3.5 py-3" : "px-4 py-3.5"}`
            }`}
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "rgba(26,26,26,0.06)",
            }}
          >
            <div className="text-[10px] font-inter font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(26,26,26,0.42)" }}>
              Location
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
              >
                <MapPin size={16} style={{ color: SAGE }} />
              </div>
              <input
                type="text"
                placeholder="City or suburb"
                value={searchTerm}
                onChange={(event) => handleLocationChange(event.target.value)}
                onFocus={() => handleLocationChange(searchTerm)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSearch) {
                    handleSearch();
                  }
                }}
                className="w-full bg-transparent text-[15px] sm:text-base text-gray-900 font-inter font-semibold placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
              />
            </div>
          </div>

          {showSuggestions && locationSuggestions.length > 0 ? (
            <div
              className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden rounded-[16px] bg-white"
              style={{
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
              }}
            >
              {locationSuggestions.map((location, index) => (
                <button
                  key={`${location.name}-${location.state}-${index}`}
                  onClick={() => selectLocation(location)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b last:border-b-0"
                  style={{ borderColor: "rgba(0,0,0,0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
                    >
                      <MapPin size={15} style={{ color: SAGE }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-inter font-semibold text-gray-900 truncate">
                        {location.name}
                      </div>
                      <div className="text-xs font-inter truncate" style={{ color: "#8A8A8A" }}>
                        {location.state}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          onClick={handleSearch}
          disabled={!canSearch}
          className={`w-full lg:w-auto ${
            heroWide && !compact
              ? "px-6 py-4 lg:justify-self-center lg:self-center lg:w-[3.5rem] lg:h-[3.5rem] lg:min-w-0 lg:rounded-full lg:px-0"
              : `px-6 sm:px-7 ${compact ? "py-3.5" : "py-4"} rounded-[14px]`
          } font-inter font-semibold text-[15px] sm:text-base transition-all flex items-center justify-center gap-2.5 ${
            canSearch
              ? "text-white hover:opacity-90 active:scale-[0.98]"
              : "text-gray-400 cursor-not-allowed"
          }`}
          style={{
            backgroundColor: canSearch ? SAGE : "rgba(0,0,0,0.05)",
            boxShadow: canSearch
              ? "0 1px 3px rgba(0,0,0,0.08), 0 10px 24px rgba(0,0,0,0.12)"
              : "none",
            minWidth: heroWide && !compact ? "unset" : compact ? "unset" : "180px",
          }}
        >
          <span className={heroWide && !compact ? "lg:hidden" : ""}>{buttonLabel}</span>
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
