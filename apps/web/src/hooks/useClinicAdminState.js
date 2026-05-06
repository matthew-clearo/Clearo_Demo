import { useState, useEffect, useMemo } from "react";
import { DAYS } from "@/app/clinic-admin/dashboard/constants";
import {
  toTimeInputValue,
  getTodayISO,
  getDatePlusDaysISO,
} from "@/utils/dateHelpers";

export function useHoursDraft(hoursFromApi, selectedClinicId) {
  const [hoursDraft, setHoursDraft] = useState(null);

  useEffect(() => {
    if (!hoursFromApi) return;

    const byDay = new Map(hoursFromApi.map((h) => [Number(h.day_of_week), h]));
    const normalized = DAYS.map((d) => {
      const row = byDay.get(d.idx);
      const openTime = row?.open_time || "09:00:00";
      const closeTime = row?.close_time || "17:00:00";
      return {
        day_of_week: d.idx,
        is_closed: Boolean(row?.is_closed),
        open_time: toTimeInputValue(openTime) || "09:00",
        close_time: toTimeInputValue(closeTime) || "17:00",
      };
    });

    setHoursDraft(normalized);
  }, [hoursFromApi, selectedClinicId]);

  return [hoursDraft, setHoursDraft];
}

export function usePricingDraft(scanPricingFromApi, selectedClinicId) {
  const [pricingDraft, setPricingDraft] = useState(null);

  useEffect(() => {
    if (!scanPricingFromApi) return;

    const normalized = scanPricingFromApi.map((s) => ({
      scan_type_id: s.scan_type_id,
      scan_type_name: s.scan_type_name,
      price: s.price,
      duration_minutes: s.duration_minutes || 30,
      available: Boolean(s.available),
      requires_referral: Boolean(s.requires_referral),
      prep_instructions: s.prep_instructions || "",
    }));

    setPricingDraft(normalized);
  }, [scanPricingFromApi, selectedClinicId]);

  return [pricingDraft, setPricingDraft];
}

export function useSlotRange() {
  const todayISO = useMemo(() => getTodayISO(), []);
  const plus14ISO = useMemo(() => getDatePlusDaysISO(14), []);

  const [slotRange, setSlotRange] = useState({
    startDate: todayISO,
    endDate: plus14ISO,
  });

  return [slotRange, setSlotRange];
}

export function useBlockRange() {
  const todayISO = useMemo(() => getTodayISO(), []);
  const plus14ISO = useMemo(() => getDatePlusDaysISO(14), []);

  const [blockRange, setBlockRange] = useState({
    startDate: todayISO,
    endDate: plus14ISO,
    scanTypeId: "",
  });

  return [blockRange, setBlockRange];
}

export function useUpcomingBookings(clinicBookings) {
  return useMemo(() => {
    const now = new Date();
    const upcoming = [];

    for (const b of clinicBookings) {
      const dt = new Date(`${b.appointment_date}T${b.appointment_time}`);
      if (isNaN(dt.getTime())) {
        upcoming.push(b);
        continue;
      }
      if (dt >= now && b.status !== "cancelled") {
        upcoming.push(b);
      }
    }

    upcoming.sort(
      (a, b) =>
        new Date(`${a.appointment_date}T${a.appointment_time}`) -
        new Date(`${b.appointment_date}T${b.appointment_time}`),
    );

    return upcoming;
  }, [clinicBookings]);
}

export function useScanTypeOptions(machinesFromApi) {
  return useMemo(() => {
    const options = [];
    for (const m of machinesFromApi) {
      if (!m.scan_type_id) continue;
      if (!m.scan_type_name) continue;
      options.push({ id: m.scan_type_id, name: m.scan_type_name });
    }

    const seen = new Set();
    const deduped = [];
    for (const opt of options) {
      const key = String(opt.id);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(opt);
    }

    deduped.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return deduped;
  }, [machinesFromApi]);
}
