export function SectionDivider({ bg = "white" }) {
  return (
    <div
      className="flex items-center justify-center py-2"
      style={{ backgroundColor: bg === "cream" ? "#FBF8F3" : "#FFFFFF" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-px w-12" style={{ backgroundColor: "rgba(0,0,0,0.06)" }} />
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "rgba(61,107,94,0.3)" }} />
        <div className="h-px w-12" style={{ backgroundColor: "rgba(0,0,0,0.06)" }} />
      </div>
    </div>
  );
}
