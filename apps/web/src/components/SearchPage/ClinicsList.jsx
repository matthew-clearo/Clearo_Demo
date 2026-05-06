import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ClinicCard } from "./ClinicCard";

export function ClinicsList({
  clinics,
  isLoading,
  isClinicsError,
  hasActiveFilters,
  clearFilters,
  variant = "desktop",
  // accordion
  expandedClinicId,
  setExpandedClinicId,
  selectedDateFilter,
  // NEW
  availabilityByClinic,
  availabilityLoading,
  availabilityError,
  selectedScanTypeForAvailability,
  onPickSlot,
  onClinicClick,
}) {
  const isDesktop = variant === "desktop";
  const SAGE = "#3D6B5E";
  const CLINICS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(0);

  const gridClass = isDesktop
    ? "grid grid-cols-1 gap-6"
    : "grid grid-cols-1 gap-5 sm:gap-7 w-full max-w-full";

  const clinicRefs = useRef({});

  // Scroll the expanded clinic into view (nice when clicking a map pin)
  useEffect(() => {
    if (!expandedClinicId) return;
    const node = clinicRefs.current?.[String(expandedClinicId)];
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [expandedClinicId]);

  const clinicsKey = useMemo(
    () => (Array.isArray(clinics) ? clinics.map((c) => c?.id).join(",") : ""),
    [clinics],
  );

  // If the list changes (filters/search), collapse to avoid weird expanded state.
  useEffect(() => {
    if (!setExpandedClinicId) return;
    setExpandedClinicId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicsKey]);

  // Reset pagination when clinics change
  useEffect(() => {
    setCurrentPage(0);
  }, [clinicsKey]);

  const totalPages = isDesktop ? 1 : Math.ceil(clinics.length / CLINICS_PER_PAGE);
  const displayedClinics = isDesktop
    ? clinics
    : clinics.slice(currentPage * CLINICS_PER_PAGE, (currentPage + 1) * CLINICS_PER_PAGE);

  const listTopRef = useRef(null);

  if (isClinicsError) {
    return (
      <div
        className={`flex flex-col items-center text-center ${isDesktop ? "py-12 px-3" : "py-16 bg-white rounded-[12px] border border-gray-200"}`}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-[8px] mb-4"
          style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
        >
          <Search size={22} style={{ color: SAGE }} />
        </div>
        <h3 className="text-base font-heading font-semibold text-gray-900 mb-1">
          Something went wrong
        </h3>
        <p
          className={`text-gray-500 ${isDesktop ? "text-sm" : "text-sm"} font-inter`}
        >
          We couldn't load clinics right now. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={gridClass}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`${isDesktop ? "rounded-[12px] border border-gray-200 bg-gray-100/80 p-6" : "bg-white rounded-lg p-3.5 border border-gray-200"} animate-pulse`}
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div
        className={`flex flex-col items-center text-center ${isDesktop ? "py-12 px-3" : "py-16 bg-white rounded-[12px] border border-gray-200"}`}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-[8px] mb-4"
          style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
        >
          <Search size={22} style={{ color: SAGE }} />
        </div>
        <h3 className="text-base font-heading font-semibold text-gray-900 mb-1">
          No clinics found yet
        </h3>
        <p
          className={`text-gray-500 ${isDesktop ? "text-sm" : "text-sm"} font-inter`}
        >
          Try adjusting your filters or searching a different area
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] font-inter"
            style={{
              backgroundColor: SAGE,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedClinicId?.(null);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  return (
    <>
      <div ref={listTopRef} className={gridClass}>
        {displayedClinics.map((clinic) => {
          const availabilityForClinic = availabilityByClinic?.[clinic.id] || {};
          const isExpanded =
            expandedClinicId && String(expandedClinicId) === String(clinic.id);

          return (
            <div
              key={clinic.id}
              className="min-w-0 w-full"
              ref={(node) => {
                if (node) {
                  clinicRefs.current[String(clinic.id)] = node;
                }
              }}
            >
              <ClinicCard
                clinic={clinic}
                variant={variant}
                expanded={Boolean(isExpanded)}
                onToggleExpanded={(id) => {
                  if (!setExpandedClinicId) return;
                  const next =
                    expandedClinicId && String(expandedClinicId) === String(id)
                      ? null
                      : id;
                  setExpandedClinicId(next);
                }}
                availability={availabilityForClinic}
                availabilityLoading={availabilityLoading}
                availabilityError={availabilityError}
                selectedScanTypeForAvailability={selectedScanTypeForAvailability}
                selectedDateFilter={selectedDateFilter}
                onPickSlot={onPickSlot}
                onClick={onClinicClick ? () => onClinicClick(clinic) : undefined}
              />
            </div>
          );
        })}
      </div>

      {!isDesktop && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 rounded-[12px] border border-gray-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium font-inter transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              color: currentPage === 0 ? "#9ca3af" : SAGE,
              backgroundColor: currentPage === 0 ? "transparent" : "rgba(61,107,94,0.08)",
            }}
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <div className="flex items-center gap-1">
            {totalPages <= 5 ? (
              Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePageChange(i)}
                  className="w-8 h-8 rounded-full text-xs font-semibold font-inter transition-all"
                  style={{
                    backgroundColor: i === currentPage ? SAGE : "transparent",
                    color: i === currentPage ? "#fff" : "#6b7280",
                  }}
                >
                  {i + 1}
                </button>
              ))
            ) : (
              <span className="text-sm text-gray-500 font-inter tabular-nums">
                {currentPage + 1} / {totalPages}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium font-inter transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              color: currentPage >= totalPages - 1 ? "#9ca3af" : SAGE,
              backgroundColor: currentPage >= totalPages - 1 ? "transparent" : "rgba(61,107,94,0.08)",
            }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
