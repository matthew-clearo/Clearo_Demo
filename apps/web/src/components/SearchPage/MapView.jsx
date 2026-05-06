import { useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { PricePin } from "../HomePage/PricePin";

const CLEARO_MAP_STYLES = [
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f5a56" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ebe5da" }, { lightness: 4 }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "geometry.stroke",
    stylers: [{ color: "#bdb4a6" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c9c0b2" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#e3dacd" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#d7d9d0" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#d9d1c5" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#b9cfbb" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f7f2e8" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d5cbbe" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#8ea894" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#748b79" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#c8cfc9" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#93b6c7" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3f6472" }],
  },
];

const DEFAULT_MARKER_PATH =
  "M12 2C7.582 2 4 5.582 4 10c0 5.25 5.18 10.79 7.127 12.708a1.2 1.2 0 0 0 1.684 0C14.82 20.79 20 15.25 20 10c0-4.418-3.582-8-8-8z";

/**
 * SVG map pin rendered inside an AdvancedMarker.
 * Replaces the deprecated google.maps.Marker icon configuration.
 */
function DefaultPin({ isSelected }) {
  const size = isSelected ? 38 : 32;
  return (
    <div
      style={{
        cursor: "pointer",
        transform: isSelected ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.2s ease, filter 0.2s ease",
        filter: isSelected
          ? "drop-shadow(0 6px 10px rgba(59,126,161,0.45))"
          : "drop-shadow(0 3px 6px rgba(0,0,0,0.25))",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
      >
        <path
          d={DEFAULT_MARKER_PATH}
          fill={isSelected ? "#4E95B8" : "#3B7EA1"}
          stroke={isSelected ? "#F8FBFD" : "#E8F1F6"}
          strokeWidth={isSelected ? 1.6 : 1.5}
        />
      </svg>
    </div>
  );
}

export function MapView({
  clinics,
  apiKey,
  mapId,
  variant = "desktop",
  onClinicClick,
  selectedClinicId,
  selectedScanType,
  mapCenter,
  mapZoom,
  onCenterChanged,
}) {
  const SAGE = "#3D6B5E";
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasMapId = Boolean(mapId);

  const hasValidApiKey =
    apiKey &&
    apiKey.length > 10 &&
    !apiKey.includes("undefined") &&
    !apiKey.includes("YOUR_API_KEY");

  const isDesktop = variant === "desktop";
  const mapHeight = isDesktop ? "100%" : 360;

  // Fallback UI when API key is missing or invalid
  if (!hasValidApiKey) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(61,107,94,0.06) 0%, rgba(61,107,94,0.03) 100%)",
        }}
      >
        <div className="text-center px-4 sm:px-8">
          <div
            className="w-12 sm:w-16 h-12 sm:h-16 rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(61,107,94,0.12) 0%, rgba(61,107,94,0.08) 100%)",
            }}
          >
            <MapPin
              size={24}
              style={{ color: SAGE }}
              className="sm:w-8 sm:h-8"
            />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 font-inter">
            Map view unavailable
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 font-inter">
            Map configuration unavailable
          </p>
        </div>
      </div>
    );
  }

  // Fallback UI when map fails to load
  if (mapError) {
    console.error("Google Maps failed to load");
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(61,107,94,0.06) 0%, rgba(61,107,94,0.03) 100%)",
        }}
      >
        <div className="text-center px-4 sm:px-8">
          <div
            className="w-12 sm:w-16 h-12 sm:h-16 rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(61,107,94,0.12) 0%, rgba(61,107,94,0.08) 100%)",
            }}
          >
            <MapPin
              size={24}
              style={{ color: SAGE }}
              className="sm:w-8 sm:h-8"
            />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 font-inter">
            Map temporarily unavailable
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 font-inter">
            Use the list view to browse clinics
          </p>
        </div>
      </div>
    );
  }

  const clinicsWithLocation = clinics.filter((c) => c.latitude && c.longitude);

  return (
    <APIProvider
      apiKey={apiKey}
      onLoad={() => {
        setMapLoaded(true);
      }}
      onError={(error) => {
        console.error("Google Maps API error:", error);
        setMapError(true);
      }}
    >
      <Map
        style={{ width: "100%", height: mapHeight }}
        center={mapCenter}
        zoom={mapZoom}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={false}
        keyboardShortcuts={false}
        colorScheme="LIGHT"
        styles={hasMapId ? undefined : CLEARO_MAP_STYLES}
        mapId={hasMapId ? mapId : undefined}
        onCenterChanged={onCenterChanged}
        onLoad={() => setMapLoaded(true)}
      >
        {mapLoaded &&
          clinicsWithLocation.map((clinic) => (
            hasMapId ? (
              <AdvancedMarker
                key={clinic.id}
                position={{
                  lat: Number(clinic.latitude),
                  lng: Number(clinic.longitude),
                }}
                onClick={() => onClinicClick && onClinicClick(clinic)}
              >
                <PricePin
                  clinic={clinic}
                  selectedScanType={selectedScanType}
                  isSelected={selectedClinicId === clinic.id}
                  onClick={() => onClinicClick && onClinicClick(clinic)}
                />
              </AdvancedMarker>
            ) : (
              <AdvancedMarker
                key={clinic.id}
                position={{
                  lat: Number(clinic.latitude),
                  lng: Number(clinic.longitude),
                }}
                zIndex={selectedClinicId === clinic.id ? 2 : 1}
                onClick={() => onClinicClick && onClinicClick(clinic)}
              >
                <DefaultPin isSelected={selectedClinicId === clinic.id} />
              </AdvancedMarker>
            )
          ))}
      </Map>
    </APIProvider>
  );
}
