import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { isDemo, isDevelopment, isStaging } from "@/utils/env";

export default function EnvironmentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isDemo || isStaging || isDevelopment) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg print:hidden">
      <span>{isDemo ? "DEMO" : isStaging ? "STAGING" : "DEV"}</span>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="ml-2 rounded-full p-1 hover:bg-white/20"
        aria-label="Dismiss environment banner"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
