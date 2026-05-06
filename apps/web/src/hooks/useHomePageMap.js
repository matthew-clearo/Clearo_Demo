import { useEffect, useCallback } from "react";

export function useHomePageMap({
  clinics,
  userInteractedWithMap,
  setMapCenter,
  setMapZoom,
  setSelectedClinicId,
  setExpandedClinicId,
  setViewMode,
}) {
  // Auto-center map on clinics when filters change
  useEffect(() => {
    if (userInteractedWithMap) return;
    if (!clinics || clinics.length === 0) return;

    const clinicsWithLocation = clinics.filter(
      (c) => c.latitude && c.longitude,
    );
    if (clinicsWithLocation.length === 0) return;

    if (clinicsWithLocation.length === 1) {
      setMapCenter({
        lat: Number(clinicsWithLocation[0].latitude),
        lng: Number(clinicsWithLocation[0].longitude),
      });
      setMapZoom(13);
    } else {
      // Calculate bounds
      const lats = clinicsWithLocation.map((c) => Number(c.latitude));
      const lngs = clinicsWithLocation.map((c) => Number(c.longitude));
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      setMapCenter({ lat: avgLat, lng: avgLng });
      setMapZoom(11);
    }
  }, [clinics, userInteractedWithMap, setMapCenter, setMapZoom]);

  // Handle clinic marker click
  const handleClinicClick = useCallback(
    (clinic) => {
      if (!clinic?.id) return;
      setSelectedClinicId(clinic.id);
      setExpandedClinicId(clinic.id);
      setViewMode("list");

      // Center map on clinic
      if (clinic.latitude && clinic.longitude) {
        setMapCenter({
          lat: Number(clinic.latitude),
          lng: Number(clinic.longitude) + 0.02, // Offset for sidebar
        });
        setMapZoom(13);
      }
    },
    [
      setSelectedClinicId,
      setExpandedClinicId,
      setViewMode,
      setMapCenter,
      setMapZoom,
    ],
  );

  return {
    handleClinicClick,
  };
}
