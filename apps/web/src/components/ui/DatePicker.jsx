import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value, options) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}

export function DatePicker({
  value,
  onChange,
  disabledPast = false,
  placeholder = "Select date",
  className = "w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter text-left flex items-center justify-between",
  required = false
}) {
  const SAGE = "#3D6B5E";
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(value || "");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialMonth = value ? new Date(`${value}T12:00:00`) : new Date();
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

      const val = toDateKey(date);
      return {
        value: val,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
        isPast: val < todayKey,
      };
    });
  }, [todayKey, visibleMonth]);

  const selectedDateLabel = value
    ? toDisplayDate(value, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : placeholder;

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

    setDraftDate(value || "");

    const nextMonth = value
      ? new Date(`${value}T12:00:00`)
      : new Date(today);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    setVisibleMonth(nextMonth);
  }, [isDatePickerOpen, value, today]);

  // Custom navigation to handle larger jumps (useful for DOB)
  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setFullYear(newYear);
      return next;
    });
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(newMonth);
      return next;
    });
  };

  const currentYear = visibleMonth.getFullYear();
  const currentMonthIdx = visibleMonth.getMonth();
  const years = Array.from({ length: 100 }, (_, i) => today.getFullYear() - 80 + i).reverse();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div ref={datePickerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsDatePickerOpen((open) => !open)}
        className={className}
        style={{ color: value ? "#111827" : "#9CA3AF" }}
      >
        <span className="truncate">{selectedDateLabel}</span>
        <CalendarDays size={18} className="text-gray-400 flex-shrink-0 ml-2" />
      </button>

      {isDatePickerOpen ? (
        <div className="absolute left-0 top-full z-[100] mt-2 w-[18.5rem] rounded-[28px] border border-black/[0.06] bg-white p-3 shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:w-[19.5rem]">
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

            <div className="flex gap-1 text-sm font-semibold text-gray-900 font-inter">
              <select
                value={currentMonthIdx}
                onChange={handleMonthChange}
                className="bg-transparent focus:outline-none cursor-pointer appearance-none text-center"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="bg-transparent focus:outline-none cursor-pointer appearance-none text-center"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
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
              const isDisabled = disabledPast && day.isPast;

              return (
                <button
                  key={day.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setDraftDate(day.value);
                    onChange({ target: { value: day.value } });
                    setIsDatePickerOpen(false);
                  }}
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
            {!required && (
              <button
                type="button"
                onClick={() => {
                  setDraftDate("");
                  onChange({ target: { value: "" } });
                  setIsDatePickerOpen(false);
                }}
                className="flex-1 rounded-full border border-black/[0.06] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:bg-gray-50 font-inter"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onChange({ target: { value: draftDate } });
                setIsDatePickerOpen(false);
              }}
              className="flex-[1.35] rounded-full px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 font-inter"
              style={{ background: SAGE, width: required ? '100%' : undefined }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
