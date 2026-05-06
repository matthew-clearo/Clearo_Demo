import { useQuery } from "@tanstack/react-query";

export function useSearchData(
  searchTerm,
  selectedScanType,
  selectedCity,
  _priceRange,
  selectedDate,
) {
  // Fetch scan types
  const { data: scanTypes = [] } = useQuery({
    queryKey: ["scanTypes"],
    queryFn: async () => {
      const response = await fetch("/api/scan-types");
      if (!response.ok) throw new Error("Failed to fetch scan types");
      const data = await response.json();

      // Accept both API shapes: [] and { scanTypes: [] }
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.scanTypes)) return data.scanTypes;
      return [];
    },
  });

  // Fetch clinics with filters
  const {
    data: clinics = [],
    isLoading,
    isError: isClinicsError,
  } = useQuery({
    queryKey: [
      "clinics",
      searchTerm,
      selectedCity,
      selectedScanType,
      selectedDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCity) {
        params.append("city", selectedCity);
      } else if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (selectedScanType) params.append("scanType", selectedScanType);
      if (selectedDate) params.append("date", selectedDate);

      const queryString = params.toString();
      const url = queryString ? `/api/clinics?${queryString}` : "/api/clinics";

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch clinics");
      return response.json();
    },
  });

  return {
    scanTypes,
    clinics,
    isLoading,
    isClinicsError,
  };
}
