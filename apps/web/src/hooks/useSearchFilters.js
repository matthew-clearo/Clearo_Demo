import { useState, useEffect } from "react";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useSearchFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedScanType, setSelectedScanType] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  // NEW: track selected date for "When" filter
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey);
  const [initialScanTypeParam, setInitialScanTypeParam] = useState("");

  // Initialize filters from URL on first load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get("search") || params.get("location") || "";
    const urlScanType = params.get("scanType") || "";
    const urlDate = params.get("date") || "";

    if (urlSearch) setSearchTerm(urlSearch);
    if (urlScanType) {
      setInitialScanTypeParam(urlScanType);
    }
    if (urlDate) {
      setSelectedDate(urlDate);
    }
  }, []);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedScanType("");
    setSelectedCity("");
    setPriceRange({ min: "", max: "" });
    setSelectedDate(getTodayDateKey());
  };

  const hasActiveFilters =
    selectedScanType ||
    selectedDate;

  return {
    searchTerm,
    setSearchTerm,
    selectedScanType,
    setSelectedScanType,
    selectedCity,
    setSelectedCity,
    priceRange,
    setPriceRange,
    selectedDate,
    setSelectedDate,
    initialScanTypeParam,
    setInitialScanTypeParam,
    clearFilters,
    hasActiveFilters,
  };
}
