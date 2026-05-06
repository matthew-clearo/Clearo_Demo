import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";

const DAY_PARTS = ["Morning", "Afternoon", "Evening"];

function formatDateParts(dateStr) {
  try {
    if (!dateStr) {
      return { weekday: "", day: "", month: "" };
    }

    const d = String(dateStr).includes("T")
      ? parseISO(String(dateStr))
      : parseISO(`${String(dateStr).slice(0, 10)}T00:00:00.000Z`);

    if (Number.isNaN(d.getTime())) {
      return {
        weekday: String(dateStr).slice(0, 3).toUpperCase(),
        day: "",
        month: "",
      };
    }

    return {
      weekday: format(d, "EEE").toUpperCase(),
      day: format(d, "d"),
      month: format(d, "MMM"),
    };
  } catch {
    return { weekday: "", day: "", month: "" };
  }
}

function formatTimeLabel(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const parts = timeStr.split(":");
  const hour = parseInt(parts[0] || "", 10);
  const minute = parseInt(parts[1] || "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeStr;

  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = ((hour + 11) % 12) + 1;
  const minutesPadded = String(minute).padStart(2, "0");
  return `${hour12}:${minutesPadded} ${suffix}`;
}

function getHourFromTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const parts = timeStr.split(":");
  const hh = Number(parts[0]);
  if (!Number.isFinite(hh)) return null;
  return hh;
}

function getDayPartLabel(timeStr) {
  const hh = getHourFromTimeString(timeStr);
  if (hh === null) return "Day";
  if (hh < 12) return "Morning";
  if (hh < 17) return "Afternoon";
  return "Evening";
}

export function ClinicCard({
  clinic,
  variant = "desktop",
  // accordion
  expanded,
  onToggleExpanded,
  // NEW
  availability,
  availabilityLoading,
  availabilityError,
  selectedScanTypeForAvailability,
  selectedDateFilter,
  onPickSlot,
  // Map sync
  onClick,
  isSelected,
}) {
  const isDesktop = variant === "desktop";
  const SAGE = "#3D6B5E";

  const groups = useMemo(() => {
    const raw =
      availability && typeof availability === "object" ? availability : {};
    const values = Object.values(raw);
    const sorted = values.sort((a, b) => {
      const an = (a?.scanTypeName || "").toLowerCase();
      const bn = (b?.scanTypeName || "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return sorted;
  }, [availability]);

  const preferredScanTypeId = useMemo(() => {
    const st = selectedScanTypeForAvailability
      ? String(selectedScanTypeForAvailability)
      : null;
    if (st && groups.some((g) => String(g?.scanTypeId) === st)) {
      return st;
    }
    const first = groups?.[0]?.scanTypeId;
    return first || null;
  }, [groups, selectedScanTypeForAvailability]);

  const effectiveActiveScanTypeId = preferredScanTypeId;

  const activeGroup = useMemo(() => {
    if (!effectiveActiveScanTypeId) return null;
    return (
      groups.find(
        (g) => String(g?.scanTypeId) === String(effectiveActiveScanTypeId),
      ) || null
    );
  }, [groups, effectiveActiveScanTypeId]);

  const availabilityState = availabilityError
    ? "error"
    : availabilityLoading
      ? "loading"
      : "ready";

  const days = Array.isArray(activeGroup?.days) ? activeGroup.days : [];
  const dayOptions = useMemo(() => {
    return (days || []).filter((d) => (d?.times || []).length > 0);
  }, [days]);

  const [activeDate, setActiveDate] = useState(null);

  useEffect(() => {
    // Prefer the global selected date if it exists in our options.
    const preferredDate = selectedDateFilter
      ? String(selectedDateFilter).slice(0, 10)
      : null;

    const hasPreferred = preferredDate
      ? dayOptions.some((d) => String(d?.date).slice(0, 10) === preferredDate)
      : false;

    const next = hasPreferred
      ? preferredDate
      : dayOptions?.[0]?.date
        ? String(dayOptions[0].date).slice(0, 10)
        : null;

    setActiveDate(next);
  }, [dayOptions, effectiveActiveScanTypeId, selectedDateFilter]);

  const selectedDay = useMemo(() => {
    if (!activeDate) return dayOptions?.[0] || null;
    return (
      dayOptions.find(
        (d) => String(d?.date).slice(0, 10) === String(activeDate).slice(0, 10),
      ) || null
    );
  }, [dayOptions, activeDate]);

  const previewGroupedTimes = useMemo(() => {
    // Use the availability preview times (sample) so collapsed cards stay light.
    const timesRaw = Array.isArray(selectedDay?.times) ? selectedDay.times : [];
    const groupsByPart = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    for (const t of timesRaw) {
      const label = getDayPartLabel(t?.time);
      if (!groupsByPart[label]) {
        groupsByPart[label] = [];
      }
      groupsByPart[label].push(t);
    }

    return groupsByPart;
  }, [selectedDay]);

  // When expanded, fetch the *full* set of slots for the chosen clinic/scan/date.
  const slotsQueryEnabled =
    Boolean(expanded) &&
    Boolean(clinic?.id) &&
    Boolean(activeGroup?.scanTypeId) &&
    Boolean(String(activeDate || "").slice(0, 10));

  const {
    data: fullSlotsData,
    isLoading: fullSlotsLoading,
    isError: fullSlotsError,
  } = useQuery({
    queryKey: [
      "slots",
      "available",
      clinic?.id,
      activeGroup?.scanTypeId,
      String(activeDate || "").slice(0, 10),
    ],
    enabled: slotsQueryEnabled,
    queryFn: async () => {
      const q = new URLSearchParams({
        clinicId: String(clinic.id),
        scanTypeId: String(activeGroup.scanTypeId),
        date: String(activeDate).slice(0, 10),
      });
      const res = await fetch(`/api/slots/available?${q.toString()}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/slots/available, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
  });

  const fullTimes = useMemo(() => {
    const slots = Array.isArray(fullSlotsData?.slots)
      ? fullSlotsData.slots
      : [];
    const normalized = slots
      .map((s) => ({
        slotId: s?.id,
        time: String(s?.slot_time || "").slice(0, 5),
      }))
      .filter((t) => t.slotId && t.time);

    normalized.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

    return normalized;
  }, [fullSlotsData]);

  const fullGroupedTimes = useMemo(() => {
    const groupsByPart = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    for (const t of fullTimes) {
      const label = getDayPartLabel(t?.time);
      if (!groupsByPart[label]) {
        groupsByPart[label] = [];
      }
      groupsByPart[label].push(t);
    }

    return groupsByPart;
  }, [fullTimes]);

  const onTimeClick = (e, payload) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    if (!onPickSlot) {
      return;
    }

    onPickSlot(payload);
  };

  const cardBodyClass = isDesktop ? "p-6 gap-4" : "px-3.5 py-3 gap-2.5";
  const isUnavailable = availabilityState === "ready" && !activeGroup;

  const caret = expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (onClick) {
          onClick(clinic);
        }
        if (onToggleExpanded) {
          onToggleExpanded(clinic?.id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onClick) {
            onClick(clinic);
          }
          if (onToggleExpanded) {
            onToggleExpanded(clinic?.id);
          }
        }
      }}
      className={`bg-white rounded-[12px] overflow-hidden border transition-all duration-200 group cursor-pointer w-full max-w-full min-w-0 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${
        isUnavailable ? "opacity-65 grayscale-[0.2]" : ""
      }`}
      style={{
        borderColor: expanded || isSelected ? SAGE : "rgba(0, 0, 0, 0.06)",
        boxShadow: isSelected
          ? `0 0 0 1.5px ${SAGE}, 0 4px 16px rgba(0,0,0,0.08)`
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div className={`flex flex-col ${cardBodyClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base sm:text-xl font-semibold text-gray-900 font-inter truncate">
                {clinic.name}
              </h3>
              <div className="text-gray-500 flex-shrink-0 mt-0.5">
                {caret}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <MapPin size={14} className="text-gray-400 flex-shrink-0 sm:w-4 sm:h-4" />
                <span className="text-[13px] sm:text-sm text-gray-600 font-inter truncate">
                  {clinic.city}, {clinic.state}
                </span>
              </div>
            </div>
          </div>

        </div>

        <div className="rounded-[8px] border border-black/[0.06] bg-[#FBF8F3]/40 p-3 sm:p-5 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} style={{ color: SAGE }} />
              <div className="text-sm font-semibold text-gray-900 font-inter">
                Choose a date
              </div>
            </div>
            <div className="text-xs text-gray-500 font-inter">
              next 10 days
            </div>
          </div>

          {availabilityState === "loading" ? (
            <div className="mt-3 text-sm text-gray-600 font-inter">
              Loading times…
            </div>
          ) : availabilityState === "error" ? (
            <div className="mt-3 text-sm text-gray-600 font-inter">
              Couldn’t load times.
            </div>
          ) : !activeGroup ? (
            <div className="mt-3 text-sm text-gray-600 font-inter">
              No times in the next 10 days.
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-[8px] border border-black/[0.06] bg-white p-3 sm:p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 font-inter">
                  Current selection
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="rounded-full border border-black/[0.08] bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-gray-900 font-inter">
                    {activeGroup?.scanTypeName || "Scan unavailable"}
                  </div>
                  {selectedDay ? (
                    <div className="rounded-full border border-black/[0.08] bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-gray-900 font-inter">
                      {formatDateParts(selectedDay.date).weekday} {formatDateParts(selectedDay.date).day} {formatDateParts(selectedDay.date).month}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Collapsed preview */}
              {!expanded && selectedDay ? (
                <div className="mt-4 space-y-3">
                  {DAY_PARTS.map((label) => {
                    const times = previewGroupedTimes[label] || [];
                    if (!times.length) return null;

                    const gridClass = isDesktop
                      ? "grid grid-cols-3 gap-2.5"
                      : "grid grid-cols-2 gap-2";

                    return (
                      <div
                        key={label}
                        className="rounded-[8px] border border-black/[0.06] bg-white p-3 sm:p-4 space-y-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
                          {label}
                        </div>
                        <div className={gridClass}>
                          {times.map((t) => {
                            const payload = {
                              clinicId: clinic.id,
                              scanTypeId: activeGroup.scanTypeId,
                              date: selectedDay.date,
                              slotId: t.slotId,
                            };

                            return (
                              <button
                                key={t.slotId}
                                type="button"
                                onClick={(e) => onTimeClick(e, payload)}
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-[#FAFAF8] px-3 py-2 text-[11px] font-semibold text-gray-900 transition-all hover:border-gray-300 sm:py-2.5 sm:text-xs font-inter"
                              >
                                {formatTimeLabel(t.time)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Expanded full list */}
              {expanded && activeDate ? (
                <div className="mt-4 space-y-3">
                  {fullSlotsLoading ? (
                    <div className="text-sm text-gray-600 font-inter">
                      Loading full day…
                    </div>
                  ) : fullSlotsError ? (
                    <div className="text-sm text-gray-600 font-inter">
                      Couldn't load all times for this day.
                    </div>
                  ) : fullTimes.length === 0 ? (
                    <div className="text-sm text-gray-600 font-inter">
                      No times on this day.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {DAY_PARTS.map((label) => {
                        const times = fullGroupedTimes[label] || [];
                        if (!times.length) return null;

                        const gridClass = isDesktop
                          ? "grid grid-cols-3 gap-2.5"
                          : "grid grid-cols-2 gap-2";

                        return (
                          <div
                            key={label}
                            className="rounded-[8px] border border-black/[0.06] bg-white p-3 sm:p-4 space-y-3"
                          >
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
                              {label}
                            </div>
                            <div className={gridClass}>
                              {times.map((t) => {
                                const payload = {
                                  clinicId: clinic.id,
                                  scanTypeId: activeGroup.scanTypeId,
                                  date: String(activeDate).slice(0, 10),
                                  slotId: t.slotId,
                                };

                                return (
                                  <button
                                    key={t.slotId}
                                    type="button"
                                    onClick={(e) => onTimeClick(e, payload)}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-[#FAFAF8] px-3 py-2 text-[11px] font-semibold text-gray-900 transition-all hover:border-gray-300 sm:py-2.5 sm:text-xs font-inter"
                                  >
                                    {formatTimeLabel(t.time)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
