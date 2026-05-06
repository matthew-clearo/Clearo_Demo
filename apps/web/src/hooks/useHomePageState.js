import { useState, useRef } from "react";

export function useHomePageState() {
  // Wizard state - show wizard on page load for guided search
  const [showWizard, setShowWizard] = useState(true);
  const [wizardCompleted, setWizardCompleted] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState("map"); // 'map' | 'list'
  const [expandedClinicId, setExpandedClinicId] = useState(null);
  const [selectedClinicId, setSelectedClinicId] = useState(null);

  // Map state
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState({ lat: -33.8688, lng: 151.2093 }); // Sydney fallback
  const [mapZoom, setMapZoom] = useState(11);
  const [userInteractedWithMap, setUserInteractedWithMap] = useState(false);

  // Auth and booking
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [continueUrl, setContinueUrl] = useState("/");
  const [bookingClinicId, setBookingClinicId] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [openingBooking, setOpeningBooking] = useState(false);

  const appliedFromUrl = useRef(false);
  const appliedPendingSelection = useRef(false);

  return {
    showWizard,
    setShowWizard,
    wizardCompleted,
    setWizardCompleted,
    viewMode,
    setViewMode,
    expandedClinicId,
    setExpandedClinicId,
    selectedClinicId,
    setSelectedClinicId,
    mapRef,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    userInteractedWithMap,
    setUserInteractedWithMap,
    authGateOpen,
    setAuthGateOpen,
    continueUrl,
    setContinueUrl,
    bookingClinicId,
    setBookingClinicId,
    pendingSelection,
    setPendingSelection,
    openingBooking,
    setOpeningBooking,
    appliedFromUrl,
    appliedPendingSelection,
  };
}
