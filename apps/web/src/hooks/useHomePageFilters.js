import { useEffect } from "react";

export function useHomePageFilters({
  initialScanTypeParam,
  scanTypes,
  setSelectedScanType,
  setInitialScanTypeParam,
}) {
  // Apply initial scan type from URL param
  useEffect(() => {
    if (!initialScanTypeParam || !scanTypes.length) return;

    let match = scanTypes.find(
      (type) => String(type.id) === String(initialScanTypeParam),
    );

    if (!match) {
      match = scanTypes.find(
        (type) =>
          type.name &&
          type.name.toLowerCase() === initialScanTypeParam.toLowerCase(),
      );
    }

    if (match) {
      setSelectedScanType(String(match.id));
    }

    setInitialScanTypeParam("");
  }, [
    initialScanTypeParam,
    scanTypes,
    setSelectedScanType,
    setInitialScanTypeParam,
  ]);
}
