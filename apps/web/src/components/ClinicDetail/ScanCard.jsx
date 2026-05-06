import { Clock } from "lucide-react";

export function ScanCard({ scan, onBook }) {
  return (
    <div className="border border-black/[0.06] bg-white rounded-3xl p-5 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 font-inter">
            {scan.scan_name}
          </h3>
          <p className="text-sm text-gray-600 font-inter">
            {scan.scan_description}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 font-inter">
            ${parseFloat(scan.price).toFixed(0)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-200/70">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-inter">
          <Clock size={16} />
          <span>{scan.duration_minutes} minutes</span>
        </div>
        <button
          onClick={() => onBook(scan)}
          className="px-6 py-2.5 rounded-full text-white font-medium hover:opacity-90 active:scale-[0.97] transition-all font-inter"
          style={{ backgroundColor: "#1A1A1A" }}
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
