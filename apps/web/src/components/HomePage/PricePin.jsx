export function PricePin({ clinic, selectedScanType, isSelected, onClick }) {
  const SAGE = "#3D6B5E";
  const SAGE_2 = "#4A7D6D";

  const scan = selectedScanType
    ? clinic?.scans?.find(
        (s) => String(s.scan_type_id) === String(selectedScanType),
      )
    : clinic?.scans?.[0];

  const price = scan?.price ? `$${Math.round(scan.price)}` : "—";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all hover:scale-110 active:scale-95"
      style={{
        filter: isSelected
          ? "drop-shadow(0 8px 16px rgba(61,107,94,0.4))"
          : "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))",
        transform: isSelected ? "translateY(-8px)" : "translateY(0)",
      }}
    >
      <div
        className="relative px-3 py-2 rounded-2xl border-2 font-inter font-bold text-sm whitespace-nowrap"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${SAGE} 0%, ${SAGE_2} 100%)`
            : "rgba(61,107,94,0.95)",
          borderColor: isSelected ? "#FFF" : "rgba(255, 255, 255, 0.8)",
          color: "#FFFFFF",
          boxShadow: isSelected ? "0 0 0 3px rgba(61,107,94,0.3)" : "none",
        }}
      >
        {price}
        {/* Arrow pointing down */}
        <div
          className="absolute -bottom-1.5 left-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: `8px solid ${isSelected ? SAGE_2 : SAGE}`,
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
}
