import { useQuery } from "@tanstack/react-query";

export function useClinicUser() {
  return useQuery({
    queryKey: ["clinicAuthMe"],
    queryFn: async () => {
      const res = await fetch("/api/clinic/auth/me");
      if (res.status === 401) return { user: null, memberships: [] };
      if (!res.ok) {
        throw new Error(`Could not load clinic session: [${res.status}] ${res.statusText}`);
      }
      return res.json();
    },
  });
}

export default useClinicUser;
