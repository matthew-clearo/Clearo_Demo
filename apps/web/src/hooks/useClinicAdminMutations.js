import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import secureFetch from "@/utils/secureFetch";

export function useSaveHours(selectedClinicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await secureFetch("/api/clinic-admin/clinic-hours", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not save hours");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Hours saved");
      queryClient.invalidateQueries({
        queryKey: ["clinicAdminClinic", selectedClinicId],
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.message || "Could not save hours");
    },
  });
}

export function useSavePricing(selectedClinicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await secureFetch("/api/clinic-admin/clinic-scans", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not save pricing");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pricing saved");
      queryClient.invalidateQueries({
        queryKey: ["clinicAdminClinic", selectedClinicId],
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.message || "Could not save pricing");
    },
  });
}

export function useToggleMachine(selectedClinicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, is_active }) => {
      const res = await secureFetch("/api/clinic-admin/machines", {
        method: "PUT",
        body: JSON.stringify({
          clinicId: selectedClinicId,
          machineId,
          is_active,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not update machine");
      }
      return res.json();
    },
    onMutate: async ({ machineId, is_active }) => {
      await queryClient.cancelQueries({
        queryKey: ["clinicAdminClinic", selectedClinicId],
      });

      const prev = queryClient.getQueryData([
        "clinicAdminClinic",
        selectedClinicId,
      ]);

      queryClient.setQueryData(
        ["clinicAdminClinic", selectedClinicId],
        (old) => {
          if (!old) return old;
          const machines = old.machines || [];
          const nextMachines = machines.map((m) =>
            String(m.id) === String(machineId) ? { ...m, is_active } : m,
          );
          return { ...old, machines: nextMachines };
        },
      );

      return { prev };
    },
    onError: (err, _vars, ctx) => {
      console.error(err);
      if (ctx?.prev) {
        queryClient.setQueryData(
          ["clinicAdminClinic", selectedClinicId],
          ctx.prev,
        );
      }
      toast.error(err?.message || "Could not update machine");
    },
    onSuccess: () => {
      toast.success("Machine updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinicAdminClinic", selectedClinicId],
      });
    },
  });
}

export function useGenerateSlots(selectedClinicId, slotRange) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clinicId, startDate, endDate }) => {
      const res = await secureFetch("/api/slots/generate", {
        method: "POST",
        body: JSON.stringify({ clinicId, startDate, endDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not generate slots");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Slots generated");
      queryClient.invalidateQueries({
        queryKey: ["slotSummary", selectedClinicId, slotRange],
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.message || "Could not generate slots");
    },
  });
}

export function useBlockRange(selectedClinicId, slotRange) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockRange, makeAvailable }) => {
      const payload = {
        clinicId: selectedClinicId,
        startDate: blockRange.startDate,
        endDate: blockRange.endDate,
        makeAvailable,
      };
      if (blockRange.scanTypeId) {
        payload.scanTypeId = String(blockRange.scanTypeId);
      }

      const res = await secureFetch(
        "/api/clinic-admin/slots/range-availability",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not update availability");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      const verb = vars.makeAvailable ? "opened" : "blocked";
      toast.success(
        `Availability updated — ${data?.changed || 0} slots ${verb}`,
      );
      queryClient.invalidateQueries({
        queryKey: ["slotSummary", selectedClinicId, slotRange],
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.message || "Could not update availability");
    },
  });
}

export function useReviewReferral(selectedClinicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, referral_status }) => {
      const res = await secureFetch("/api/clinic-admin/bookings", {
        method: "PATCH",
        body: JSON.stringify({
          bookingId,
          clinicId: selectedClinicId,
          referral_status,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not update referral status");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Referral status updated");
      queryClient.invalidateQueries({
        queryKey: ["clinicBookings", selectedClinicId],
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.message || "Could not update referral status");
    },
  });
}

export function useOverrideSafety(selectedClinicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }) => {
      const res = await secureFetch("/api/clinic-admin/bookings", {
        method: "PATCH",
        body: JSON.stringify({
          bookingId,
          clinicId: selectedClinicId,
          action: "safety_override",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not override safety review");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Safety override applied");
      queryClient.invalidateQueries({
        queryKey: ["clinicBookings", selectedClinicId],
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.message || "Could not override safety review");
    },
  });
}
