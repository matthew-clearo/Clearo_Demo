import { Search, SlidersHorizontal, Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

export function MobileSearchBar({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  viewMode,
  setViewMode,
}) {
  const SAGE = "#3D6B5E";
  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white border-b border-gray-200 py-3 sm:py-4 relative z-20 md:hidden">
      <div className="w-full mx-auto px-3 sm:px-6">
        <div className="flex flex-col gap-2">
          {/* Row 1: Where */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Clinic or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-gray-300 bg-white text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 font-inter"
              style={{ boxShadow: "none" }}
            />
          </div>

          {/* Row 2: When + Filters + List/Map */}
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="min-w-0 flex items-center gap-2 px-3 rounded-2xl border border-gray-300 bg-white flex-1">
              <Calendar className="text-gray-400" size={18} />
              <DatePicker
                disabledPast={true}
                value={selectedDate || ""}
                onChange={(e) => setSelectedDate(e.target.value || "")}
                className="bg-transparent border-0 outline-none text-sm sm:text-base text-gray-900 font-inter w-full min-w-0 flex items-center justify-between text-left h-[34px]"
              />
              {selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="text-xs font-semibold text-gray-500 px-1"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-300 bg-white text-sm sm:text-base text-gray-900 transition-colors font-inter flex-shrink-0"
              style={{
                borderWidth: 2,
                borderColor: showFilters ? SAGE : undefined,
              }}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span
                  className="ml-0.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: SAGE }}
                />
              )}
            </button>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className="px-3 py-2.5 rounded-2xl font-inter text-xs sm:text-sm border-2"
                style={
                  viewMode === "list"
                    ? {
                      borderColor: SAGE,
                      background: "rgba(61,107,94,0.10)",
                      color: "#0F172A",
                    }
                    : {
                      borderColor: "rgba(0,0,0,0.15)",
                      background: "transparent",
                      color: "#111827",
                    }
                }
              >
                List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className="px-3 py-2.5 rounded-2xl font-inter text-xs sm:text-sm border-2"
                style={
                  viewMode === "map"
                    ? {
                      borderColor: SAGE,
                      background: "rgba(61,107,94,0.10)",
                      color: "#0F172A",
                    }
                    : {
                      borderColor: "rgba(0,0,0,0.15)",
                      background: "transparent",
                      color: "#111827",
                    }
                }
              >
                Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
