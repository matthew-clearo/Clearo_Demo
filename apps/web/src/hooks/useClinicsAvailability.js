import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export function useClinicsAvailability({
  clinics,
  selectedScanType,
  startDate,
  days = 7,
}) {
  const clinicIds = useMemo(() => {
    return (clinics || [])
      .map((c) => c?.id)
      .filter(Boolean);
  }, [clinics]);

  const clinicIdsKey = useMemo(() => clinicIds.join(","), [clinicIds]);

  const enabled = clinicIds.length > 0;

  const query = useQuery({
    queryKey: [
      "clinicsAvailability",
      clinicIdsKey,
      selectedScanType || "",
      startDate || "",
      days,
    ],
    enabled,
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("clinicIds", clinicIdsKey);
      q.set("days", String(days));
      if (selectedScanType) {
        q.set("scanTypeId", String(selectedScanType));
      }
      if (startDate) {
        q.set("startDate", String(startDate).slice(0, 10));
      }

      const res = await fetch(`/api/clinics/availability?${q.toString()}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/clinics/availability, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
  });

  const byClinic = query.data?.byClinic || {};

  return {
    ...query,
    byClinic,
  };
}
