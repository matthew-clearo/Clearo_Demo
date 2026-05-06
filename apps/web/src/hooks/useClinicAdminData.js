import { useQuery } from "@tanstack/react-query";

export function useClinics(user) {
  return useQuery({
    queryKey: ["clinicAdminClinics"],
    queryFn: async () => {
      const res = await fetch("/api/clinic-admin/clinics");
      if (!res.ok) {
        throw new Error(
          `Could not load clinics: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!user,
  });
}

export function useClinicDetails(selectedClinicId) {
  return useQuery({
    queryKey: ["clinicAdminClinic", selectedClinicId],
    queryFn: async () => {
      const url = `/api/clinic-admin/clinic?clinicId=${encodeURIComponent(String(selectedClinicId))}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Could not load clinic details: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!selectedClinicId,
  });
}

export function useSlotSummary(selectedClinicId, slotRange) {
  return useQuery({
    queryKey: ["slotSummary", selectedClinicId, slotRange],
    queryFn: async () => {
      const url = `/api/clinic-admin/slots/summary?clinicId=${encodeURIComponent(String(selectedClinicId))}&startDate=${encodeURIComponent(slotRange.startDate)}&endDate=${encodeURIComponent(slotRange.endDate)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Could not load slot summary: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!selectedClinicId,
  });
}

export function useCalendarData(selectedClinicId, month) {
  return useQuery({
    queryKey: ["clinicCalendar", selectedClinicId, month],
    queryFn: async () => {
      const url = `/api/clinic-admin/slots/calendar?clinicId=${encodeURIComponent(String(selectedClinicId))}&month=${encodeURIComponent(month)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Could not load calendar data: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!selectedClinicId && !!month,
  });
}

export function useClinicBookings(selectedClinicId) {
  return useQuery({
    queryKey: ["clinicBookings", selectedClinicId],
    queryFn: async () => {
      const res = await fetch(
        `/api/clinic-admin/bookings?clinicId=${encodeURIComponent(String(selectedClinicId))}`,
      );
      if (!res.ok) {
        throw new Error(
          `Could not load bookings: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!selectedClinicId,
  });
}
