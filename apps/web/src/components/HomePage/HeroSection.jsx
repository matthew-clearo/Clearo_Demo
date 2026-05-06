import { useEffect, useState } from "react";
import { APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";
import { ArrowRight, ArrowUpRight, CheckCircle } from "lucide-react";
import { HomePageSearchForm } from "@/components/HomePage/HomePageSearchForm";

const SAGE = "#3D6B5E";
const SAND = "#A69580";
const CREAM = "#FBF8F3";
const INK = "#1A1A1A";

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

/* Animated flowing curves SVG for hero background */
function FlowingCurves() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes heroCurveDrift {
          0%   { transform: translate(0, 0) rotate(0deg); }
          25%  { transform: translate(30px, -20px) rotate(2deg); }
          50%  { transform: translate(-10px, 15px) rotate(-1deg); }
          75%  { transform: translate(20px, 10px) rotate(1.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes heroCurveDrift2 {
          0%   { transform: translate(0, 0) rotate(0deg); }
          25%  { transform: translate(-20px, 10px) rotate(-1.5deg); }
          50%  { transform: translate(15px, -25px) rotate(2deg); }
          75%  { transform: translate(-10px, -10px) rotate(-0.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}</style>
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1400 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* ── Ribbon 1: sweeping S-curve, bottom-left to top-right ── */}
        <g
          style={{ animation: "heroCurveDrift 20s ease-in-out infinite" }}
          opacity="0.16"
        >
          {[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60].map((offset) => (
            <path
              key={`r1-${offset}`}
              d={`M-200 ${500 + offset} C0 ${300 + offset}, 350 ${700 + offset}, 700 ${400 + offset} S1100 ${150 + offset}, 1500 ${350 + offset}`}
              stroke="#5A9A88"
              strokeWidth="1.2"
              fill="none"
            />
          ))}
        </g>

        {/* ── Ribbon 2: arcing from top-right, crossing over ── */}
        <g
          style={{ animation: "heroCurveDrift2 25s ease-in-out infinite" }}
          opacity="0.13"
        >
          {[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60].map((offset) => (
            <path
              key={`r2-${offset}`}
              d={`M1600 ${100 + offset} C1200 ${350 + offset}, 800 ${-50 + offset}, 500 ${400 + offset} S100 ${650 + offset}, -200 ${300 + offset}`}
              stroke="#5A9A88"
              strokeWidth="1.2"
              fill="none"
            />
          ))}
        </g>

        {/* ── Ribbon 3: gentle wave through top area ── */}
        <g
          style={{ animation: "heroCurveDrift 30s ease-in-out infinite", animationDelay: "-10s" }}
          opacity="0.08"
        >
          {[0, 7, 14, 21, 28, 35, 42, 49].map((offset) => (
            <path
              key={`r3-${offset}`}
              d={`M-100 ${150 + offset} C200 ${50 + offset}, 600 ${350 + offset}, 900 ${180 + offset} S1300 ${50 + offset}, 1600 ${200 + offset}`}
              stroke="#5A9A88"
              strokeWidth="1"
              fill="none"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function pointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-6) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function polygonToPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ") + " Z";
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)
    )
  );

  const projectedX = start.x + t * dx;
  const projectedY = start.y + t * dy;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function distanceToPolygonEdge(point, polygon) {
  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i += 1) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    minDistance = Math.min(minDistance, pointToSegmentDistance(point, start, end));
  }

  return minDistance;
}

/* Dot-matrix map — stylized from geographic lon/lat anchors */
function DotMatrixMap() {
  const W = 290;
  const H = 600;
  const S = 9;
  const R = 1.3;
  const LR = 1.9;
  const CR = 2.25;

  const cols = Math.floor(W / S);
  const totalRows = Math.floor(H / S);

  const geoBounds = {
    minLon: 128.0,
    maxLon: 154.5,
    minLat: -44.8,
    maxLat: -10.2,
  };

  const mapFrame = {
    x: -8,
    y: 18,
    width: 322,
    height: 430,
  };

  const mainland = [
    { lon: 115.0, lat: -34.6 },
    { lon: 117.7, lat: -35.0 },
    { lon: 120.7, lat: -34.7 },
    { lon: 123.2, lat: -33.6 },
    { lon: 126.2, lat: -32.8 },
    { lon: 129.2, lat: -31.8 },
    { lon: 132.0, lat: -31.8 },
    { lon: 134.1, lat: -32.2 },
    { lon: 136.0, lat: -34.8 },
    { lon: 138.2, lat: -35.2 },
    { lon: 139.2, lat: -37.1 },
    { lon: 141.1, lat: -38.7 },
    { lon: 143.0, lat: -38.8 },
    { lon: 145.0, lat: -38.5 },
    { lon: 146.5, lat: -39.1 },
    { lon: 148.1, lat: -38.4 },
    { lon: 149.3, lat: -37.3 },
    { lon: 150.1, lat: -36.0 },
    { lon: 151.2, lat: -33.9 },
    { lon: 152.1, lat: -31.8 },
    { lon: 153.0, lat: -28.8 },
    { lon: 153.3, lat: -26.0 },
    { lon: 152.1, lat: -23.0 },
    { lon: 150.8, lat: -20.5 },
    { lon: 149.7, lat: -18.2 },
    { lon: 147.6, lat: -14.8 },
    { lon: 145.7, lat: -10.7 },
    { lon: 143.7, lat: -12.8 },
    { lon: 141.7, lat: -14.6 },
    { lon: 140.7, lat: -17.4 },
    { lon: 139.1, lat: -17.6 },
    { lon: 137.4, lat: -16.8 },
    { lon: 136.4, lat: -15.4 },
    { lon: 136.2, lat: -13.7 },
    { lon: 137.1, lat: -12.2 },
    { lon: 134.2, lat: -11.8 },
    { lon: 131.0, lat: -12.1 },
    { lon: 128.2, lat: -14.0 },
    { lon: 125.6, lat: -15.2 },
    { lon: 123.1, lat: -17.0 },
    { lon: 121.0, lat: -18.7 },
    { lon: 118.7, lat: -21.2 },
    { lon: 116.4, lat: -24.0 },
    { lon: 114.6, lat: -27.2 },
    { lon: 114.1, lat: -30.1 },
    { lon: 114.7, lat: -32.8 },
  ];

  const tasmania = [
    { lon: 144.5, lat: -40.8 },
    { lon: 146.4, lat: -40.7 },
    { lon: 148.0, lat: -41.7 },
    { lon: 147.4, lat: -43.2 },
    { lon: 145.8, lat: -43.6 },
    { lon: 144.4, lat: -42.2 },
  ];

  const projectGeoPoint = ({ lon, lat }) => ({
    x:
      mapFrame.x +
      ((lon - geoBounds.minLon) / (geoBounds.maxLon - geoBounds.minLon)) *
        mapFrame.width,
    y:
      mapFrame.y +
      ((geoBounds.maxLat - lat) / (geoBounds.maxLat - geoBounds.minLat)) *
        mapFrame.height,
  });

  const mainlandPolygon = mainland.map(projectGeoPoint);
  const tasmaniaPolygon = tasmania.map(projectGeoPoint);
  const polygons = [mainlandPolygon, tasmaniaPolygon];

  const dotMeta = new Map();
  const edgeFeather = S * 1.35;
  const outerFeather = S * 0.9;

  for (let r = 0; r < totalRows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const rowOffset = r % 2 === 0 ? 0 : S * 0.5;
      const point = {
        x: c * S + S / 2 + rowOffset,
        y: r * S + S / 2,
      };
      const key = `${r},${c}`;
      const isLand = polygons.some((polygon) => pointInPolygon(point, polygon));
      const edgeDistance = Math.min(
        ...polygons.map((polygon) => distanceToPolygonEdge(point, polygon))
      );
      const innerBlend = Math.max(0, 1 - edgeDistance / edgeFeather);
      const outerBlend = Math.max(0, 1 - edgeDistance / outerFeather);

      if (isLand || outerBlend > 0.28) {
        dotMeta.set(key, {
          point,
          isLand,
          edgeDistance,
          innerBlend,
          outerBlend,
        });
      }
    }
  }

  const clinics = [
    {
      lon: 153.026,
      lat: -27.47,
      label: "",
      size: 3,
      delay: "0.15s",
    },
    {
      lon: 151.2093,
      lat: -33.8688,
      label: "Sydney",
      size: 4,
      delay: "0s",
      textDx: -12,
      textDy: -12,
      textAnchor: "end",
    },
    {
      lon: 144.9631,
      lat: -37.8136,
      label: "Melbourne",
      size: 4,
      delay: "0.45s",
      textDx: -10,
      textDy: -10,
      textAnchor: "end",
    },
    {
      lon: 138.6007,
      lat: -34.9285,
      label: "",
      size: 3,
      delay: "0.75s",
    },
  ].map((clinic) => ({
    ...clinic,
    ...projectGeoPoint(clinic),
  }));

  const mainlandPath = polygonToPath(mainlandPolygon);
  const tasmaniaPath = polygonToPath(tasmaniaPolygon);
  const melbourne = clinics.find((clinic) => clinic.label === "Melbourne");
  const sydney = clinics.find((clinic) => clinic.label === "Sydney");
  const coastCurve = melbourne && sydney
    ? `M ${melbourne.x} ${melbourne.y} Q ${(melbourne.x + sydney.x) / 2 - 4} ${(melbourne.y + sydney.y) / 2 - 30} ${sydney.x} ${sydney.y}`
    : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="silhouetteFill" x1="0.08" y1="0.1" x2="0.92" y2="0.9">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="landTint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
        </linearGradient>
        <radialGradient id="eastGlow" cx="0.7" cy="0.62" r="0.36">
          <stop offset="0%" stopColor="#6BBF9E" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#6BBF9E" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#6BBF9E" stopOpacity="0" />
        </radialGradient>
        <filter id="silhouetteBlur" x="-12%" y="-12%" width="124%" height="124%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>

      <ellipse cx="205" cy="255" rx="92" ry="118" fill="url(#eastGlow)" />
      <g filter="url(#silhouetteBlur)" opacity="0.85">
        <path
          d={mainlandPath}
          fill="url(#silhouetteFill)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d={tasmaniaPath}
          fill="url(#silhouetteFill)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </g>
      <path
        d={mainlandPath}
        fill="url(#landTint)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d={tasmaniaPath}
        fill="url(#landTint)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {coastCurve && (
        <path
          d={coastCurve}
          stroke="rgba(107,191,158,0.22)"
          strokeWidth="1.1"
          strokeDasharray="2.5 4"
          strokeLinecap="round"
        />
      )}

      {Array.from({ length: totalRows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const key = `${r},${c}`;
          const rowOffset = r % 2 === 0 ? 0 : S * 0.5;
          const meta = dotMeta.get(key);
          const isLand = Boolean(meta?.isLand);
          const isCoast = isLand && meta.innerBlend > 0.34;
          const isFringe = !isLand && (meta?.outerBlend || 0) > 0.28;
          const cx = c * S + S / 2 + rowOffset;
          const cy = r * S + S / 2;

          let radius = R;
          let fill = "rgba(255,255,255,0.035)";

          if (isLand) {
            radius = LR + Math.min(meta.innerBlend * 0.45, 0.35);
            fill = isCoast
              ? `rgba(255,255,255,${0.18 + meta.innerBlend * 0.18})`
              : "rgba(255,255,255,0.18)";
          } else if (isFringe) {
            radius = R + meta.outerBlend * 0.7;
            fill = `rgba(255,255,255,${0.05 + meta.outerBlend * 0.08})`;
          }

          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={isCoast ? Math.max(radius, CR) : radius}
              fill={fill}
            />
          );
        })
      )}

      {clinics.map((clinic, index) => (
        <g key={`clinic-${index}`}>
          <circle
            cx={clinic.x}
            cy={clinic.y}
            r={clinic.size + 4}
            fill="none"
            stroke="#6BBF9E"
            strokeWidth="0.8"
            opacity="0.4"
          >
            <animate
              attributeName="r"
              values={`${clinic.size};${clinic.size + 10};${clinic.size}`}
              dur="3.2s"
              repeatCount="indefinite"
              begin={clinic.delay}
            />
            <animate
              attributeName="opacity"
              values="0.4;0;0.4"
              dur="3.2s"
              repeatCount="indefinite"
              begin={clinic.delay}
            />
          </circle>
          <circle cx={clinic.x} cy={clinic.y} r={clinic.size + 3} fill="#6BBF9E" opacity="0.12" />
          <circle cx={clinic.x} cy={clinic.y} r={clinic.size} fill="#6BBF9E" />
          {clinic.label && (
            <text
              x={clinic.x + (clinic.textDx || 0)}
              y={clinic.y + (clinic.textDy || 0)}
              fill="rgba(255,255,255,0.66)"
              fontSize="8"
              fontFamily="Manrope, sans-serif"
              fontWeight="600"
              letterSpacing="0.03em"
              textAnchor={clinic.textAnchor || "middle"}
            >
              {clinic.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* Shared card style */
const cardStyle = {
  borderRadius: 12,
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 100%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.22) inset, 0 24px 60px rgba(0,0,0,0.16), 0 8px 20px rgba(0,0,0,0.08)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

function CardAtmosphere({ glow = "rgba(91,123,148,0.22)", edge = "rgba(255,255,255,0.28)" }) {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 48%, rgba(255,255,255,0.02) 100%)",
        }}
      />
      <div
        className="absolute -top-14 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: glow }}
      />
      <div
        className="absolute inset-x-6 top-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${edge}, transparent)` }}
      />
    </>
  );
}

function SydneyClinicStaticMap() {
  const [mapsConfig, setMapsConfig] = useState({ apiKey: null, mapId: null });
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadMap() {
      try {
        const response = await fetch("/api/maps/config");
        if (!response.ok) return;
        const data = await response.json();
        if (!isActive) return;
        setMapsConfig({
          apiKey: data?.apiKey || null,
          mapId: data?.mapId || null,
        });
      } catch {
        // Leave fallback background in place if map config is unavailable.
      }
    }

    loadMap();
    return () => {
      isActive = false;
    };
  }, []);

  const hasValidApiKey =
    mapsConfig.apiKey &&
    mapsConfig.apiKey.length > 10 &&
    !mapsConfig.apiKey.includes("undefined") &&
    !mapsConfig.apiKey.includes("YOUR_API_KEY");
  const hasMapId = Boolean(mapsConfig.mapId);

  return (
    <div
      className="relative rounded-[18px] mb-6 overflow-hidden"
      style={{
        height: "112px",
        background: "#DDE7E2",
        border: "1px solid rgba(61,107,94,0.08)",
      }}
    >
      {hasValidApiKey && !mapError ? (
        <APIProvider
          apiKey={mapsConfig.apiKey}
          onError={() => setMapError(true)}
        >
          <GoogleMap
            defaultCenter={{ lat: -33.86882, lng: 151.2093 }}
            defaultZoom={13}
            mapId={hasMapId ? mapsConfig.mapId : undefined}
            disableDefaultUI
            clickableIcons={false}
            keyboardShortcuts={false}
            gestureHandling="none"
            colorScheme="LIGHT"
            styles={hasMapId ? undefined : CLEARO_MAP_STYLES}
            style={{ width: "100%", height: "100%" }}
          />
        </APIProvider>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(194,222,214,0.38) 0%, rgba(230,239,235,0.22) 100%)",
          }}
        />
      )}

      <div
        className="absolute left-[58%] top-[46%] w-5 h-5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background: "rgba(107,191,158,0.24)",
          boxShadow: "0 0 0 12px rgba(107,191,158,0.12)",
        }}
      />
      <div
        className="absolute left-[58%] top-[46%] w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(184,132,95,0.96) 0%, rgba(166,149,128,0.86) 100%)",
          border: "2px solid rgba(255,255,255,0.92)",
          boxShadow: "0 6px 14px rgba(166,149,128,0.2)",
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 h-12"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 100%)" }}
      />
      <div
        className="absolute right-4 bottom-4 text-[11px] font-inter font-medium px-2 py-1 rounded-full"
        style={{
          color: "rgba(26,26,26,0.6)",
          background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(255,255,255,0.86)",
        }}
      >
        Sydney CBD
      </div>
    </div>
  );
}

function HumanBackdrop() {
  return (
    <div className="absolute inset-[6%_4%_6%_8%] rounded-[38px] overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(244,237,227,0.82) 48%, rgba(235,228,216,0.94) 100%)",
          border: "1px solid rgba(255,255,255,0.56)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.76), 0 20px 48px rgba(93,75,54,0.08)",
        }}
      />
      <div
        className="absolute inset-y-0 left-0 w-[45%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 100%)",
        }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-[40%]"
        style={{
          background:
            "repeating-linear-gradient(90deg, rgba(138,127,112,0.15) 0px, rgba(138,127,112,0.15) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 30px)",
          opacity: 0.6,
        }}
      />
      <div
        className="absolute left-[10%] bottom-[10%] w-[22%] h-[24%] rounded-[28px] blur-sm"
        style={{
          background: "linear-gradient(180deg, rgba(206,229,218,0.5) 0%, rgba(240,245,240,0.12) 100%)",
        }}
      />
      <div
        className="absolute left-[14%] top-[14%] w-[26%] h-[18%] rounded-[24px] blur-2xl"
        style={{ background: "rgba(255,255,255,0.52)" }}
      />
      <div
        className="absolute right-[10%] bottom-0 w-[34%] h-[78%]"
        style={{ filter: "drop-shadow(0 22px 36px rgba(93,75,54,0.14))" }}
      >
        <div
          className="absolute left-[22%] right-[22%] top-[5%] h-[20%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 42%, rgba(250,229,214,0.98) 0%, rgba(235,196,170,0.98) 62%, rgba(214,166,135,0.96) 100%)",
          }}
        />
        <div
          className="absolute left-[10%] right-[10%] top-0 h-[25%]"
          style={{
            background:
              "radial-gradient(circle at 54% 36%, rgba(141,111,92,0.98) 0%, rgba(108,84,69,0.98) 50%, rgba(79,59,48,0.92) 100%)",
            borderRadius: "48% 48% 40% 40%",
          }}
        />
        <div
          className="absolute left-[4%] right-[4%] top-[22%] bottom-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,240,235,0.98) 46%, rgba(230,224,216,0.98) 100%)",
            borderRadius: "40% 40% 14% 14%",
          }}
        />
        <div
          className="absolute left-[26%] top-[38%] h-[22%] w-[14%] rotate-[18deg] rounded-full"
          style={{ background: "linear-gradient(180deg, rgba(238,196,165,0.98) 0%, rgba(214,164,133,0.96) 100%)" }}
        />
        <div
          className="absolute right-[22%] top-[40%] h-[24%] w-[14%] -rotate-[24deg] rounded-full"
          style={{ background: "linear-gradient(180deg, rgba(238,196,165,0.98) 0%, rgba(214,164,133,0.96) 100%)" }}
        />
      </div>
    </div>
  );
}

function HeroAppointmentCard({ todayLabel, compact = false }) {
  return (
    <div
      className={`${compact ? "p-5" : "p-7"} flex flex-col justify-between h-full`}
      style={{
        ...cardStyle,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,245,240,0.82) 100%)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <CardAtmosphere glow="rgba(184,132,95,0.18)" edge="rgba(255,255,255,0.32)" />
      <div className="relative z-10 flex h-full flex-col">
        <div className={compact ? "mb-5" : "mb-8"}>
          <div
            className="text-[10px] font-inter font-semibold uppercase tracking-[0.18em] mb-3.5"
            style={{ color: "rgba(26,26,26,0.36)" }}
          >
            Next Up
          </div>
          <h3
            className={`${compact ? "text-[1.45rem]" : "text-[1.95rem]"} font-heading font-semibold text-gray-900 leading-[0.98] tracking-[-0.03em]`}
          >
            Your Upcoming
            <br />
            Appointment
          </h3>
          <div className="flex items-center gap-2.5 mt-5">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-inter font-semibold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: "rgba(61,107,94,0.08)",
                color: SAGE,
                border: "1px solid rgba(61,107,94,0.08)",
              }}
            >
              <CheckCircle size={12} strokeWidth={2.4} />
              Confirmed
            </div>
          </div>
        </div>

        <div
          className={`relative rounded-[24px] ${compact ? "px-5 py-5" : "px-7 py-7"} flex-1 flex flex-col overflow-hidden`}
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.34) 100%)",
            border: "1px solid rgba(255,255,255,0.36)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.42) inset, 0 18px 34px rgba(184,132,95,0.08)",
          }}
        >
          <div
            className="absolute inset-x-5 top-0 h-16 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute -right-10 top-10 h-28 w-28 rounded-full blur-3xl pointer-events-none"
            style={{ background: "rgba(184,132,95,0.12)" }}
          />
          <div
            className="absolute -left-12 bottom-10 h-32 w-32 rounded-full blur-3xl pointer-events-none"
            style={{ background: "rgba(61,107,94,0.08)" }}
          />

          <div className="relative z-10 mt-1 flex-1 flex flex-col justify-between">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-inter font-semibold uppercase tracking-[0.14em] mb-4"
                style={{
                  backgroundColor: "rgba(255,255,255,0.48)",
                  color: "rgba(26,26,26,0.42)",
                  border: "1px solid rgba(255,255,255,0.38)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#6BBF9E" }}
                />
                Friday
              </div>

              <div className={`flex items-center ${compact ? "gap-3" : "gap-4"} mb-7`}>
                <div
                  className={`${compact ? "w-[42px] h-[42px]" : "w-[46px] h-[46px]"} rounded-full flex items-center justify-center text-white text-[10px] font-inter font-semibold tracking-[0.08em] flex-shrink-0`}
                  style={{ backgroundColor: SAND, boxShadow: "0 8px 20px rgba(166,149,128,0.22)" }}
                >
                  SJ
                </div>
                <div className="min-w-0 flex-1 pr-1">
                  <span className={`${compact ? "text-[0.98rem]" : "text-[1.05rem]"} font-inter font-semibold text-gray-900 block leading-[1.08]`}>
                    Dr. Sarah Johnson
                  </span>
                  <span className={`${compact ? "text-[11px]" : "text-[12px]"} font-inter text-gray-500 mt-1.5 block`}>Radiologist</span>
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(184,132,95,0.96) 0%, rgba(166,149,128,0.86) 100%)",
                    boxShadow: "0 8px 18px rgba(166,149,128,0.2)",
                  }}
                >
                  <ArrowUpRight size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>

              <div
                className={`grid grid-cols-2 ${compact ? "gap-6 mb-6 pb-5" : "gap-7 mb-7 pb-6"}`}
                style={{ borderBottom: "1px solid rgba(26,26,26,0.08)" }}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-inter font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(26,26,26,0.36)" }}>
                    Arrival
                  </div>
                  <div className="text-[1.35rem] font-heading font-semibold tracking-[-0.03em] text-gray-900 leading-none mt-2.5">
                    08:45
                  </div>
                  <div className="text-[10px] font-inter leading-[1.35] mt-2.5" style={{ color: "rgba(26,26,26,0.46)" }}>
                    Check in 15 min early
                  </div>
                </div>
                <div
                  className="min-w-0 text-right pl-5"
                  style={{ borderLeft: "1px solid rgba(26,26,26,0.08)" }}
                >
                  <div className="text-[10px] font-inter font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(26,26,26,0.36)" }}>
                    Booked
                  </div>
                  <div className="text-[1.35rem] font-heading font-semibold tracking-[-0.03em] text-gray-900 leading-none mt-2.5">
                    09:00
                  </div>
                  <div className="text-[10px] font-inter leading-[1.35] mt-2.5" style={{ color: "rgba(26,26,26,0.46)" }}>
                    Ends by 10:00
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3.5 text-[10px] font-inter tracking-[0.12em] uppercase">
                <span style={{ color: "rgba(26,26,26,0.44)" }}>09:00</span>
                <span style={{ color: "rgba(26,26,26,0.44)" }}>10:00</span>
              </div>
              <div className="flex gap-2.5 mb-7">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-1.5 rounded-full flex-1"
                    style={{
                      background:
                        item < 2
                          ? "linear-gradient(90deg, rgba(184,132,95,0.9), rgba(184,132,95,0.65))"
                          : "rgba(166,149,128,0.16)",
                    }}
                  />
                ))}
              </div>

              {!compact ? <SydneyClinicStaticMap /> : null}
            </div>

            <div
              className="flex items-center justify-between pt-6 mt-auto text-[11px] font-inter"
              style={{ borderTop: "1px solid rgba(26,26,26,0.08)" }}
            >
              <span style={{ color: "rgba(26,26,26,0.42)" }}>{todayLabel}</span>
              <span style={{ color: "rgba(26,26,26,0.42)" }}>Sydney, NSW</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ scanTypes = [] }) {
  const scrollToSection = (sectionId, viewportRatio = 0.12) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const viewportOffset = Math.min(Math.max(window.innerHeight * viewportRatio, 120), 220);
    const targetTop =
      section.getBoundingClientRect().top + window.scrollY - viewportOffset;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  };

  const scrollToHowItWorks = () => {
    scrollToSection("how-it-works-section", 0.12);
  };

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date());
  return (
    <section
      className="relative overflow-hidden pt-28 sm:pt-36 lg:pt-48 pb-18 sm:pb-20 lg:pb-28"
      style={{
        backgroundColor: CREAM,
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(251,248,243,0.98) 42%, rgba(251,248,243,1) 100%)",
      }}
    >
      {/* Animated flowing curves */}
      <FlowingCurves />

      {/* Sage radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 36%, rgba(61,107,94,0.12) 0%, rgba(61,107,94,0.04) 38%, transparent 70%)",
        }}
      />

      {/* Bottom gradient fade: cream into the next section */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "200px",
          background: `linear-gradient(to bottom, rgba(251,248,243,0) 0%, ${CREAM} 100%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12 relative z-10">
        <div className="pt-2 lg:pt-6">
          <div className="lg:grid lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:gap-16 xl:gap-20 items-start">
            <div className="max-w-[38rem] lg:pt-4">
              <h1
                className="font-heading font-semibold leading-tight mb-6"
                style={{
                  fontSize: "clamp(38px, 6vw, 62px)",
                  letterSpacing: "-0.04em",
                  lineHeight: "1.03",
                  color: INK,
                }}
              >
                Compare scan prices
                <br />
                and find clinic
                <span style={{ color: "#6BBF9E" }}> appointment options.</span>
              </h1>

              <p
                className="text-[16px] sm:text-lg lg:text-[1.12rem] font-inter leading-relaxed mb-9 max-w-[36rem]"
                style={{ color: "rgba(26,26,26,0.62)" }}
              >
                Search MRI, CT, ultrasound, and X-ray appointments near you.
                See listed pricing, clinic details, and available appointment times before you book.
              </p>
            </div>

            <div className="hidden lg:flex relative items-start justify-center gap-6 xl:gap-10">
              {/* Background glows */}
              <div
                className="absolute left-[8%] top-[34%] w-[20rem] h-[20rem] rounded-full blur-3xl pointer-events-none"
                style={{ background: "rgba(61,107,94,0.08)" }}
              />
              <div
                className="absolute right-[8%] top-[8%] w-[16rem] h-[16rem] rounded-full blur-3xl pointer-events-none"
                style={{ background: "rgba(184,132,95,0.07)" }}
              />

              {/* iPhone mockup */}
              <div className="relative flex-shrink-0 mt-4">
                <div
                  className="absolute inset-0 -m-16 rounded-full blur-3xl opacity-25 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${SAGE}22 0%, transparent 70%)` }}
                />
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: "296px",
                    height: "602px",
                    borderRadius: "3.1rem",
                    backgroundColor: "#0F0F0F",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.06) inset, 0 30px 80px -12px rgba(0,0,0,0.25), 0 12px 32px -8px rgba(0,0,0,0.15)",
                  }}
                >
                  <div
                    className="absolute top-[10px] left-1/2 -translate-x-1/2 rounded-full z-20"
                    style={{ width: "100px", height: "30px", backgroundColor: "#0F0F0F" }}
                  />
                  <div
                    className="absolute inset-[4px] flex flex-col overflow-hidden"
                    style={{
                      borderRadius: "2.9rem",
                      background: `linear-gradient(165deg, ${SAGE}cc 0%, ${SAGE} 100%)`,
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)" }}
                    />
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <DotMatrixMap />
                    </div>
                    <div
                      className="absolute bottom-0 left-0 right-0 z-20 text-center px-7 pb-12 pt-20"
                      style={{ background: `linear-gradient(to top, ${SAGE} 30%, transparent 100%)` }}
                    >
                      <h4
                        className="text-[1.5rem] font-heading font-semibold text-white mb-1.5 italic"
                        style={{ lineHeight: "1.1", letterSpacing: "-0.01em" }}
                      >
                        Find clinics near you
                      </h4>
                      <p className="text-[12px] text-white/45 font-inter leading-relaxed mb-6">
                        Sydney &middot; Melbourne &middot; Brisbane &middot; Adelaide
                      </p>
                      <a
                        href="/search"
                        className="group flex items-center gap-2.5 rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
                      >
                        <div
                          className="flex-1 py-3 rounded-xl text-[13px] font-inter font-medium text-center transition-all duration-200"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.14)",
                            color: "rgba(255,255,255,0.8)",
                            boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            <span>Explore clinics</span>
                          </span>
                        </div>
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.14)",
                            boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
                          }}
                        >
                          <ArrowUpRight size={16} className="text-white/75 transition-transform duration-200 group-hover:scale-105" />
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment card */}
              <div className="flex-shrink-0 w-[18rem] -mr-8 xl:-mr-12 mt-16">
                <HeroAppointmentCard todayLabel={todayLabel} compact />
              </div>
            </div>
          </div>

          <div id="search-section" className="w-full mt-8 lg:mt-10">
            <HomePageSearchForm
              scanTypes={scanTypes}
              buttonLabel="Compare prices"
              heroWide
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-8 mb-7">
            {["Listed Pricing", "Clinic Details", "Available Times"].map((label) => (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle size={15} style={{ color: "#6BBF9E" }} strokeWidth={2.2} />
                <span className="text-[13px] font-inter" style={{ color: "rgba(26,26,26,0.54)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={scrollToHowItWorks}
            className="inline-flex items-center gap-2 font-inter font-semibold text-[15px] transition-colors hover:opacity-75"
            style={{ color: INK }}
          >
            <span>See how it works</span>
            <ArrowRight size={16} />
          </button>

          <div className="relative mt-12 lg:mt-16">
            <div className="lg:hidden">
              <div className="relative mx-auto max-w-[26rem] pt-4">
                <div
                  className="absolute inset-x-8 top-6 bottom-8 rounded-full blur-3xl opacity-35 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${SAGE}20 0%, transparent 72%)` }}
                />
                <div className="relative flex items-center justify-center">
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: "252px",
                      height: "512px",
                      borderRadius: "2.75rem",
                      backgroundColor: "#0F0F0F",
                      boxShadow:
                        "0 0 0 1px rgba(255,255,255,0.06) inset, 0 22px 60px -10px rgba(0,0,0,0.26), 0 10px 24px -8px rgba(0,0,0,0.18)",
                    }}
                  >
                    <div
                      className="absolute top-[10px] left-1/2 -translate-x-1/2 rounded-full z-20"
                      style={{ width: "88px", height: "28px", backgroundColor: "#0F0F0F" }}
                    />
                    <div
                      className="absolute inset-[4px] flex flex-col overflow-hidden"
                      style={{
                        borderRadius: "2.45rem",
                        background: `linear-gradient(165deg, ${SAGE}cc 0%, ${SAGE} 100%)`,
                      }}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)" }}
                      />
                      <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <DotMatrixMap />
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 z-20 text-center px-6 pb-9 pt-16"
                        style={{ background: `linear-gradient(to top, ${SAGE} 34%, transparent 100%)` }}
                      >
                        <h4
                          className="text-[1.35rem] font-heading font-semibold text-white mb-1.5 italic"
                          style={{ lineHeight: "1.08", letterSpacing: "-0.01em" }}
                        >
                          Find clinics near you
                        </h4>
                        <p className="text-[11px] text-white/45 font-inter leading-relaxed mb-5">
                          Sydney &middot; Melbourne &middot; Brisbane
                        </p>
                        <a
                          href="/search"
                          className="group flex items-center gap-2 rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
                        >
                          <div
                            className="flex-1 py-3 rounded-xl text-[13px] font-inter font-medium text-center"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.14)",
                              color: "rgba(255,255,255,0.8)",
                              boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
                            }}
                          >
                            Explore clinics
                          </div>
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.14)",
                              boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
                            }}
                          >
                            <ArrowUpRight size={16} className="text-white/75" />
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-4">
                  <HeroAppointmentCard todayLabel={todayLabel} compact />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
