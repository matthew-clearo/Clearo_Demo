import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE, SAGE_2 } from "@/app/clinic-admin/dashboard/constants";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells = [];
  // Leading blanks
  for (let i = 0; i < startDow; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }
  return cells;
}

function normalizeDateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function DayCell({ cell, slotMap, bookingMap, isToday, isSelected, onClick }) {
  if (!cell) {
    return <div className="aspect-square" />;
  }

  const slots = slotMap[cell.iso];
  const bookings = bookingMap[cell.iso];
  const hasSlots = slots && slots.total_slots > 0;
  const hasBookings = bookings && bookings.total_bookings > 0;
  const utilization =
    hasSlots && slots.total_slots > 0
      ? Math.round(((slots.total_slots - slots.available_slots) / slots.total_slots) * 100)
      : 0;

  // Color the dot based on utilization
  let dotColor = "rgba(61,107,94,0.2)"; // no slots
  if (hasSlots) {
    if (utilization >= 80) dotColor = "#EF4444";
    else if (utilization >= 50) dotColor = "#F59E0B";
    else dotColor = SAGE;
  }

  return (
    <button
      type="button"
      onClick={() => onClick(cell)}
      className="relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-200 group"
      style={{
        background: isSelected
          ? "rgba(61,107,94,0.10)"
          : isToday
            ? "rgba(61,107,94,0.04)"
            : "transparent",
        border: isSelected
          ? `2px solid ${SAGE}`
          : isToday
            ? "2px solid rgba(61,107,94,0.25)"
            : "2px solid transparent",
        cursor: "pointer",
      }}
    >
      <span
        className="text-sm font-semibold transition-colors"
        style={{
          color: isSelected ? SAGE : isToday ? "#1A1A1A" : "#4B5563",
        }}
      >
        {cell.day}
      </span>

      {/* Slot / booking indicators */}
      <div className="flex items-center gap-1 mt-0.5">
        {hasSlots && (
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: dotColor }}
          />
        )}
        {hasBookings && (
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#6366F1" }}
          />
        )}
      </div>

      {/* Hover tooltip */}
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full
          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150
          z-20 min-w-[140px]"
      >
        <div
          className="rounded-xl px-3 py-2 text-xs text-left"
          style={{
            background: "#1A1A1A",
            color: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          {hasSlots ? (
            <>
              <div className="font-semibold">{slots.available_slots} available</div>
              <div style={{ color: "#A1A1A1" }}>
                {slots.total_slots} total · {utilization}% filled
              </div>
            </>
          ) : (
            <div style={{ color: "#A1A1A1" }}>No slots</div>
          )}
          {hasBookings && (
            <div className="mt-1 pt-1 border-t border-white/10">
              <span className="font-semibold">{bookings.total_bookings}</span>{" "}
              booking{bookings.total_bookings !== 1 ? "s" : ""}
              {bookings.confirmed > 0 && (
                <span style={{ color: "#86EFAC" }}> · {bookings.confirmed} confirmed</span>
              )}
              {bookings.pending > 0 && (
                <span style={{ color: "#FCD34D" }}> · {bookings.pending} pending</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function DayDetail({ cell, slotMap, bookingMap, dayBookings }) {
  if (!cell) return null;

  const slots = slotMap[cell.iso];
  const bookingSummary = bookingMap[cell.iso];
  const hasSlots = slots && slots.total_slots > 0;

  const formattedDate = new Date(cell.iso + "T12:00:00").toLocaleDateString(
    "en-AU",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  // Filter bookings for the selected day
  const bookingsForDay = (dayBookings || []).filter(
    (b) => normalizeDateKey(b.appointment_date) === cell.iso && b.status !== "cancelled",
  );

  return (
    <div
      className="mt-5 rounded-[1.25rem] p-5"
      style={{
        background: "#FBF8F3",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <h4
        className="text-base font-bold font-heading"
        style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
      >
        {formattedDate}
      </h4>

      {/* Slot stats */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "rgba(61,107,94,0.07)" }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: SAGE }}
          >
            {hasSlots ? slots.available_slots : "—"}
          </div>
          <div className="text-xs" style={{ color: "#8A8A8A" }}>
            Available
          </div>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "rgba(99,102,241,0.07)" }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: "#6366F1" }}
          >
            {hasSlots ? slots.booked_slots : "—"}
          </div>
          <div className="text-xs" style={{ color: "#8A8A8A" }}>
            Booked
          </div>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "rgba(0,0,0,0.03)" }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: "#1A1A1A" }}
          >
            {hasSlots ? slots.total_slots : "—"}
          </div>
          <div className="text-xs" style={{ color: "#8A8A8A" }}>
            Total
          </div>
        </div>
      </div>

      {/* Utilization bar */}
      {hasSlots && slots.total_slots > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: "#8A8A8A" }}>Utilization</span>
            <span className="font-semibold" style={{ color: SAGE }}>
              {Math.round(
                ((slots.total_slots - slots.available_slots) /
                  slots.total_slots) *
                  100,
              )}
              %
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(61,107,94,0.1)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(((slots.total_slots - slots.available_slots) / slots.total_slots) * 100)}%`,
                background: `linear-gradient(90deg, ${SAGE}, ${SAGE_2})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bookings list for this day */}
      {bookingsForDay.length > 0 && (
        <div className="mt-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.15em] mb-2"
            style={{ color: "#8A8A8A" }}
          >
            Bookings
          </p>
          <div className="grid gap-2">
            {bookingsForDay.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {b.patient_name}
                  </div>
                  <div className="text-xs" style={{ color: "#8A8A8A" }}>
                    {b.scan_type_name || "Scan"} · {String(b.appointment_time).slice(0, 5)}
                  </div>
                </div>
                <span
                  className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background:
                      b.status === "confirmed"
                        ? "rgba(61,107,94,0.10)"
                        : b.status === "pending"
                          ? "rgba(251,191,36,0.10)"
                          : "rgba(0,0,0,0.05)",
                    color:
                      b.status === "confirmed"
                        ? SAGE
                        : b.status === "pending"
                          ? "#B45309"
                          : "#6B7280",
                    border:
                      b.status === "confirmed"
                        ? `1px solid rgba(61,107,94,0.25)`
                        : b.status === "pending"
                          ? "1px solid rgba(251,191,36,0.25)"
                          : "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasSlots && bookingsForDay.length === 0 && (
        <p className="mt-3 text-sm" style={{ color: "#8A8A8A" }}>
          No slots or bookings for this day.
        </p>
      )}
    </div>
  );
}

export function BookingCalendar({
  calendarData,
  calendarLoading,
  calendarError,
  currentMonth,
  onMonthChange,
  dayBookings,
}) {
  const [selectedCell, setSelectedCell] = useState(null);

  const year = parseInt(currentMonth.split("-")[0], 10);
  const month = parseInt(currentMonth.split("-")[1], 10) - 1;

  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Build lookup maps
  const slotMap = useMemo(() => {
    const map = {};
    for (const row of calendarData?.slots || []) {
      map[normalizeDateKey(row.slot_date)] = row;
    }
    return map;
  }, [calendarData]);

  const bookingMap = useMemo(() => {
    const map = {};
    for (const row of calendarData?.bookings || []) {
      map[normalizeDateKey(row.appointment_date)] = row;
    }
    return map;
  }, [calendarData]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

  function goPrev() {
    const d = new Date(year, month - 1, 1);
    onMonthChange(getMonthString(d));
    setSelectedCell(null);
  }

  function goNext() {
    const d = new Date(year, month + 1, 1);
    onMonthChange(getMonthString(d));
    setSelectedCell(null);
  }

  function goToday() {
    const now = new Date();
    onMonthChange(getMonthString(now));
    setSelectedCell(null);
  }

  return (
    <FrostedCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(61,107,94,0.07)" }}
          >
            <Calendar size={18} style={{ color: SAGE }} />
          </div>
          <h3
            className="text-lg font-bold font-heading"
            style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
          >
            Calendar
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              color: SAGE,
              background: "rgba(61,107,94,0.07)",
              border: "1px solid rgba(61,107,94,0.15)",
            }}
          >
            Today
          </button>

          <div className="flex items-center">
            <button
              type="button"
              onClick={goPrev}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>

            <span
              className="text-sm font-semibold min-w-[140px] text-center"
              style={{ color: "#1A1A1A" }}
            >
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={goNext}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: SAGE }} />
          <span className="text-xs" style={{ color: "#8A8A8A" }}>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} />
          <span className="text-xs" style={{ color: "#8A8A8A" }}>Filling up</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "#EF4444" }} />
          <span className="text-xs" style={{ color: "#8A8A8A" }}>Nearly full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "#6366F1" }} />
          <span className="text-xs" style={{ color: "#8A8A8A" }}>Bookings</span>
        </div>
      </div>

      {/* Calendar grid */}
      {calendarLoading ? (
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-gray-50 animate-pulse"
            />
          ))}
        </div>
      ) : calendarError ? (
        <div className="mt-5 text-sm text-red-600">
          {calendarError?.message || "Could not load calendar data."}
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold py-2"
                style={{ color: "#8A8A8A" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((cell, idx) => (
              <DayCell
                key={idx}
                cell={cell}
                slotMap={slotMap}
                bookingMap={bookingMap}
                isToday={cell?.iso === todayISO}
                isSelected={cell?.iso === selectedCell?.iso}
                onClick={(c) =>
                  setSelectedCell(
                    selectedCell?.iso === c.iso ? null : c,
                  )
                }
              />
            ))}
          </div>

          {/* Selected day detail */}
          {selectedCell && (
            <DayDetail
              cell={selectedCell}
              slotMap={slotMap}
              bookingMap={bookingMap}
              dayBookings={dayBookings}
            />
          )}
        </>
      )}
    </FrostedCard>
  );
}
