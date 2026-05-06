import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value, options) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}

export function DateTimeStep({
  selectedDate,
  setSelectedDate,
  selectedSlotId,
  setSelectedSlotId,
  slots,
  slotsLoading,
  slotsEnabled,
}) {
  const SAGE = "#3D6B5E";
  const availableSlots = Array.isArray(slots) ? slots : [];
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate || "");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialMonth = new Date();
    initialMonth.setDate(1);
    initialMonth.setHours(0, 0, 0, 0);
    return initialMonth;
  });
  const calendarRef = useRef(null);

  const today = useMemo(() => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    return next;
  }, []);

  const todayKey = useMemo(() => toDateKey(today), [today]);

  const quickDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + index);
        return nextDate;
      }),
    [today],
  );

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

  useEffect(() => {
    function handlePointerDown(event) {
      if (!calendarRef.current?.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    }

    if (isCalendarOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isCalendarOpen]);

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    setDraftDate(selectedDate || "");

    const nextMonth = selectedDate
      ? new Date(`${selectedDate}T12:00:00`)
      : new Date(today);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    setVisibleMonth(nextMonth);
  }, [isCalendarOpen, selectedDate, today]);

  const slotGroups = [
    { key: "morning", label: "Morning", minHour: 0, maxHour: 11 },
    { key: "afternoon", label: "Afternoon", minHour: 12, maxHour: 16 },
    { key: "evening", label: "Evening", minHour: 17, maxHour: 23 },
  ]
    .map((group) => ({
      ...group,
      slots: availableSlots.filter((slot) => {
        const hour = Number(slot.slot_time?.slice(0, 2));
        return (
          Number.isFinite(hour) && hour >= group.minHour && hour <= group.maxHour
        );
      }),
    }))
    .filter((group) => group.slots.length > 0);

  const noSlotsMessage =
    slotsEnabled && !slotsLoading && availableSlots.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-600 font-inter">
        No slots for this day. Try another date.
      </div>
    ) : null;

  const selectedDateLabel = selectedDate
    ? formatDateLabel(selectedDate, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Choose another date";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-[#FBF8F3] p-4">
        <label className="block text-sm font-medium text-gray-700 font-inter">
          Choose Date *
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {quickDates.map((date) => {
            const value = toDateKey(date);
            const isSelected = selectedDate === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSelectedDate(value);
                  setSelectedSlotId(null);
                }}
                className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                  isSelected
                    ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                    : "border-white bg-white text-gray-900 hover:border-gray-300"
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.12em] font-semibold font-inter opacity-80">
                  {date.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className="mt-1 text-sm font-semibold font-inter">
                  {date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </button>
            );
          })}
        </div>

        <div ref={calendarRef} className="relative mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
            Or choose another date
          </label>
          <button
            type="button"
            onClick={() => setIsCalendarOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 font-inter"
          >
            <span>{selectedDateLabel}</span>
            <CalendarDays size={16} className="text-gray-400" />
          </button>

          {isCalendarOpen ? (
            <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-[28px] border border-black/[0.06] bg-white p-3 shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:w-[19.5rem]">
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
                    setSelectedSlotId(null);
                    setIsCalendarOpen(false);
                  }}
                  className="flex-1 rounded-full border border-black/[0.06] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:bg-gray-50 font-inter"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(draftDate);
                    setSelectedSlotId(null);
                    setIsCalendarOpen(false);
                  }}
                  className="flex-[1.35] rounded-full px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 font-inter"
                  style={{ background: SAGE }}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 font-inter">
          Choose Time *
        </label>
        <div className="min-h-[44px] space-y-3">
          {slotsLoading ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-600 font-inter">
              Loading available times...
            </div>
          ) : (
            slotGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
                  {group.label}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.slots.map((slot) => {
                    const time = slot.slot_time?.slice(0, 5) || "";
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`rounded-full border px-4 py-2 text-sm font-inter transition-all ${
                          isSelected
                            ? "border-[#1A1A1A] text-white"
                            : "border-gray-200 text-gray-900 hover:border-gray-400"
                        }`}
                        style={isSelected ? { backgroundColor: "#1A1A1A" } : {}}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          {noSlotsMessage}
        </div>
      </div>
    </div>
  );
}
