import { Search, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/components/ui/DatePicker";

export function DesktopSearchBar({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  selectedScanType,
  selectedCity,
  onSearch,
}) {
  const todayIso = new Date().toISOString().split("T")[0];
  const SAGE = "#3D6B5E";

  // Fetch a few suggested times based on the current filters so they come from
  // real availability data (available_slots table).
  const {
    data: suggestedTimes = [],
    isLoading: isLoadingTimes,
    isError: isTimesError,
  } = useQuery({
    queryKey: ["suggested-times", selectedDate, selectedScanType, selectedCity],
    // Relax this so users only need to pick a date to see suggestions.
    enabled: !!selectedDate,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("date", selectedDate);
      if (selectedScanType) {
        params.append("scanType", String(selectedScanType));
      }
      if (selectedCity) {
        params.append("city", selectedCity);
      }
      const response = await fetch(
        `/api/slots/suggestions?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(
          `When fetching /api/slots/suggestions, the response was [${response.status}] ${response.statusText}`,
        );
      }
      const json = await response.json();
      return Array.isArray(json.times) ? json.times : [];
    },
  });

  const formatTime = (timeString) => {
    // timeString is expected to be something like "09:30:00" or "09:30"
    if (!timeString) return "";
    const timeParts = timeString.split(":");
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1] || "0", 10);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return timeString;

    const suffix = hour >= 12 ? "pm" : "am";
    const hour12 = ((hour + 11) % 12) + 1;
    const minutesPadded = String(minute).padStart(2, "0");
    return `${hour12}:${minutesPadded} ${suffix}`;
  };

  const hasSuggestedTimes =
    !isTimesError && !isLoadingTimes && suggestedTimes.length > 0;

  return (
    <div className="absolute top-10 lg:top-12 left-1/2 -translate-x-1/2 w-full px-6 lg:px-10 pointer-events-auto">
      <div className="max-w-3xl mx-auto">
        {/* White card behind the search bar to separate it from the busy map */}
        <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100 pointer-events-auto flex flex-col gap-3">
          <div className="bg-gray-50/90 rounded-full px-4 py-2 flex items-center gap-3 border border-gray-200">
            {/* What - search term */}
            <div className="flex items-center gap-2 px-3 border-r border-gray-200 flex-1 min-w-[200px]">
              <Search className="text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Clinic or location"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 placeholder-gray-500 font-inter"
              />
            </div>

            {/* When - date selector */}
            <div className="flex items-center gap-2 px-3 min-w-[140px]">
              <Calendar className="text-gray-400" size={18} />
              <DatePicker
                disabledPast={true}
                value={selectedDate || ""}
                onChange={(e) => setSelectedDate(e.target.value || "")}
                className="bg-transparent border-0 outline-none text-sm text-gray-900 font-inter flex items-center justify-between text-left h-[34px] w-full"
              />
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={onSearch}
              className="ml-1 px-4 lg:px-5 py-1.5 rounded-full font-semibold transition-all text-xs lg:text-sm font-inter whitespace-nowrap border-2"
              style={{
                borderColor: SAGE,
                color: "#0F172A",
                background: "rgba(61,107,94,0.10)",
              }}
            >
              Search
            </button>
          </div>

          {/* Suggested times row, based on real availability */}
          {selectedDate && (
            <div className="px-1 flex flex-col gap-1">
              <span className="text-[11px] text-gray-600 font-inter">
                {isLoadingTimes
                  ? "Looking up suggested times..."
                  : hasSuggestedTimes
                    ? "Suggested times for this date"
                    : "No suggested times found for this date"}
              </span>
              {hasSuggestedTimes && (
                <div className="flex flex-wrap gap-2">
                  {suggestedTimes.map((time) => (
                    <span
                      key={time}
                      className="px-3 py-1 rounded-full border border-gray-200 bg-white/90 text-[11px] text-gray-800 font-inter"
                    >
                      {formatTime(time)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
