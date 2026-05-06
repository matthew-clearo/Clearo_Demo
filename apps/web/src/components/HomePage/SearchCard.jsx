import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  List,
  Map as MapIcon,
  X,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value, options) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}

export function SearchCard({
  selectedScanType,
  setSelectedScanType,
  scanTypes,
  searchTerm,
  handleLocationChange,
  locationSuggestions,
  showSuggestions,
  setShowSuggestions,
  selectLocation,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  hasActiveFilters,
  resultsCount,
  clearFilters,
}) {
  const SAGE = "#3D6B5E";
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate || "");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialMonth = new Date();
    initialMonth.setDate(1);
    initialMonth.setHours(0, 0, 0, 0);
    return initialMonth;
  });
  const datePickerRef = useRef(null);

  const today = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const todayKey = useMemo(() => toDateKey(today), [today]);

  const monthLabel = useMemo(
    () =>
      visibleMonth.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [visibleMonth],
  );

  const calendarDays = useMemo(() => {
    const monthStart = new Date(visibleMonth);
    monthStart.setDate(1);

    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      const value = toDateKey(date);
      return {
        value,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
        isPast: value < todayKey,
      };
    });
  }, [todayKey, visibleMonth]);

  const selectedDateLabel = selectedDate
    ? toDisplayDate(selectedDate, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Select date";

  useEffect(() => {
    function handlePointerDown(event) {
      if (!datePickerRef.current?.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    }

    if (isDatePickerOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }

    setDraftDate(selectedDate || "");

    const nextMonth = selectedDate
      ? new Date(`${selectedDate}T12:00:00`)
      : new Date(today);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    setVisibleMonth(nextMonth);
  }, [isDatePickerOpen, selectedDate, today]);

  function handleClearFilters() {
    clearFilters();
  }

  function handleSearchClick() {
    setShowSuggestions(false);
    setIsDatePickerOpen(false);

    if (typeof document !== "undefined" && document.activeElement) {
      document.activeElement.blur?.();
    }
  }

  return (
    <div
      className="rounded-[12px] sm:rounded-[16px] bg-white"
      style={{
        border: "1px solid rgba(0,0,0,0.06)",
        borderTop: `3px solid ${SAGE}`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(70,54,39,0.08)",
      }}
    >
      <div className="flex items-center justify-between px-3.5 pt-3.5 sm:px-6 sm:pt-6 md:px-7">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:gap-2 sm:px-3 sm:py-1.5 rounded-full"
          style={{
            backgroundColor: "rgba(61,107,94,0.06)",
            color: SAGE,
          }}
        >
          <Search size={13} />
          <span className="text-[10px] font-inter font-semibold uppercase tracking-[0.14em] sm:text-[11px]">
            Find a scan
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`rounded-lg p-1.5 transition-all active:scale-95 sm:p-2 ${
              viewMode === "map"
                ? "shadow-sm"
                : "border border-gray-200 bg-white"
            }`}
            style={
              viewMode === "map"
                ? { backgroundColor: SAGE, borderColor: SAGE, border: `1px solid ${SAGE}` }
                : undefined
            }
            aria-label="Map view"
          >
            <MapIcon
              size={16}
              className={`sm:w-[18px] sm:h-[18px] ${
                viewMode === "map" ? "text-white" : "text-gray-600"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-lg p-1.5 transition-all active:scale-95 sm:p-2 ${
              viewMode === "list"
                ? "shadow-sm"
                : "border border-gray-200 bg-white"
            }`}
            style={
              viewMode === "list"
                ? { backgroundColor: SAGE, borderColor: SAGE, border: `1px solid ${SAGE}` }
                : undefined
            }
            aria-label="List view"
          >
            <List
              size={16}
              className={`sm:w-[18px] sm:h-[18px] ${
                viewMode === "list" ? "text-white" : "text-gray-600"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-2.5 sm:px-6 sm:pb-6 sm:pt-3 md:px-7">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 md:gap-3 lg:grid-cols-[1.1fr_1.5fr_1fr_auto]">
          <div className="rounded-lg sm:rounded-[12px] border border-black/[0.06] bg-white px-3 py-2.5 sm:px-4 sm:py-3.5 transition-all hover:border-black/[0.10] hover:shadow-sm">
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Scan type
            </div>
            <select
              value={selectedScanType}
              onChange={(e) => setSelectedScanType(e.target.value)}
              className="mt-0.5 sm:mt-1 w-full bg-transparent text-gray-900 font-semibold font-inter focus:outline-none text-[13px] sm:text-base"
            >
              <option value="">All scans</option>
              {scanTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative rounded-lg sm:rounded-[12px] border border-black/[0.06] bg-white px-3 py-2.5 sm:px-4 sm:py-3.5 transition-all hover:border-black/[0.10] hover:shadow-sm">
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Location
            </div>
            <div className="mt-0.5 sm:mt-1 flex items-center gap-2">
              <MapPin className="text-gray-400" size={14} />
              <input
                type="text"
                placeholder="City, state"
                value={searchTerm}
                onChange={(e) => handleLocationChange(e.target.value)}
                onFocus={() => handleLocationChange(searchTerm)}
                className="w-full bg-transparent text-gray-900 font-semibold font-inter placeholder:text-gray-400 focus:outline-none text-[13px] sm:text-base"
              />
            </div>

            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[12px] shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
                {locationSuggestions.map((loc, index) => (
                  <button
                    key={index}
                    onClick={() => selectLocation(loc)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(61,107,94,0.10) 0%, rgba(61,107,94,0.06) 100%)",
                        }}
                      >
                        <MapPin size={16} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-inter">
                          {loc.name}
                        </div>
                        <div className="text-xs text-gray-500 font-inter">
                          {loc.state}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            ref={datePickerRef}
            className="relative rounded-lg sm:rounded-[12px] border border-black/[0.06] bg-white px-3 py-2.5 sm:px-4 sm:py-3.5 transition-all hover:border-black/[0.10] hover:shadow-sm"
          >
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Date
            </div>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen((open) => !open)}
              className="mt-0.5 sm:mt-1 flex w-full items-center justify-between gap-2 bg-transparent text-left text-gray-900"
            >
              <span className="text-[13px] font-semibold font-inter sm:text-base">
                {selectedDateLabel}
              </span>
              <CalendarDays size={16} className="text-gray-400" />
            </button>

            {isDatePickerOpen ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-[18.5rem] rounded-[16px] border border-black/[0.06] bg-white p-3 shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:w-[19.5rem]">
                <div className="flex items-center justify-between px-1 pb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth((currentMonth) => {
                        const nextMonth = new Date(currentMonth);
                        nextMonth.setMonth(currentMonth.getMonth() - 1);
                        return nextMonth;
                      })
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] text-gray-500 transition-colors hover:bg-gray-50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="text-sm font-semibold text-gray-900 font-inter">
                    {monthLabel}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth((currentMonth) => {
                        const nextMonth = new Date(currentMonth);
                        nextMonth.setMonth(currentMonth.getMonth() + 1);
                        return nextMonth;
                      })
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] text-gray-500 transition-colors hover:bg-gray-50"
                    aria-label="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 px-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 font-inter">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <div key={`${day}-${index}`} className="py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1 px-1">
                  {calendarDays.map((day) => {
                    const isSelected = draftDate === day.value;
                    const isToday = day.value === todayKey;
                    const isDisabled = day.isPast;

                    return (
                      <button
                        key={day.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setDraftDate(day.value)}
                        className="flex h-9 items-center justify-center rounded-full text-sm font-medium font-inter transition-all disabled:cursor-not-allowed"
                        style={
                          isSelected
                            ? {
                                background: SAGE,
                                color: "#FFFFFF",
                              }
                            : {
                                background: "transparent",
                                color: day.isCurrentMonth
                                  ? "#111827"
                                  : "rgba(17,24,39,0.30)",
                                boxShadow: isToday
                                  ? `inset 0 0 0 1px ${SAGE}`
                                  : "none",
                              }
                        }
                      >
                        <span style={{ opacity: isDisabled ? 0.28 : 1 }}>
                          {day.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftDate("");
                      setSelectedDate("");
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-1 rounded-lg border border-black/[0.06] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:bg-gray-50 font-inter"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(draftDate);
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-[1.35] rounded-lg px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 font-inter"
                    style={{ background: SAGE }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSearchClick}
            className="flex items-center justify-center gap-2 rounded-lg sm:rounded-[12px] border px-4 py-2.5 sm:px-5 sm:py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: SAGE,
              borderColor: SAGE,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            <Search size={18} />
            <span className="text-sm sm:text-base">Search</span>
          </button>
        </div>

        {hasActiveFilters && (
          <div
            className="mt-3 sm:mt-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3"
            style={{ backgroundColor: "rgba(61,107,94,0.04)" }}
          >
            <div className="text-[11px] sm:text-sm text-gray-700 font-inter">
              Found {resultsCount} clinic
              {resultsCount !== 1 ? "s" : ""}
              {searchTerm && ` near ${searchTerm}`}
            </div>
            <button
              onClick={handleClearFilters}
              className="text-sm font-semibold hover:text-gray-900 font-inter flex items-center gap-2"
              style={{ color: SAGE }}
            >
              <X size={16} />
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
