import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export function useClinicSlots(clinic, selectedScan, selectedDate) {
  const slotsEnabled = Boolean(selectedScan?.scan_type_id && selectedDate);
  const dateParam = selectedDate;
  const clinicId = clinic?.id || null;
  const scanTypeId = selectedScan?.scan_type_id || null;

  const { data: slotData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", clinicId, scanTypeId, dateParam],
    enabled: slotsEnabled && !!clinic && !!clinicId && !!scanTypeId,
    queryFn: async () => {
      const q = new URLSearchParams({
        clinicId: String(clinicId),
        scanTypeId: String(scanTypeId),
        date: dateParam,
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

  const slots = useMemo(() => slotData?.slots || [], [slotData]);

  return { slots, slotsLoading, slotsEnabled };
}
