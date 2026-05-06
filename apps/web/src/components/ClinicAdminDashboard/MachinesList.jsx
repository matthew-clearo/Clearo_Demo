import { Wrench } from "lucide-react";
import FrostedCard from "@/components/ui/FrostedCard";
import { SAGE } from "@/app/clinic-admin/dashboard/constants";

export function MachinesList({ machinesFromApi, toggleMachineMutation }) {
  return (
    <FrostedCard className="p-6">
      <div className="flex items-center gap-2">
        <Wrench size={18} style={{ color: SAGE }} />
        <h3 className="text-lg font-bold text-gray-900">
          Machines
        </h3>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Each machine creates its own appointment times when you generate slots.
      </p>

      {machinesFromApi.length ? (
        <div className="mt-5 grid gap-3">
          {machinesFromApi.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-gray-200/70 bg-white/50 p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <div>
                <div className="font-semibold text-gray-900">
                  {m.machine_name}
                </div>
                <div className="text-xs text-gray-500">
                  {m.scan_type_name ? `${m.scan_type_name} • ` : ""}
                  Machine ID {m.id}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(m.is_active)}
                  onChange={(e) => {
                    toggleMachineMutation.mutate({
                      machineId: m.id,
                      is_active: e.target.checked,
                    });
                  }}
                  disabled={toggleMachineMutation.isPending}
                />
                Active
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-gray-200/70 bg-white/50 p-4 text-gray-700">
          No machines found.
        </div>
      )}
    </FrostedCard>
  );
}
