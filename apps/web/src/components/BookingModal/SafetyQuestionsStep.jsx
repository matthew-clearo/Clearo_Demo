import { ShieldAlert } from "lucide-react";
import { getSafetyQuestionsForScan } from "@/utils/bookingSafety";

export function SafetyQuestionsStep({ safety, setSafety, selectedScan }) {
  const questions = getSafetyQuestionsForScan(
    selectedScan?.scan_name,
    selectedScan?.safety_question_set,
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#3D6B5E] mt-0.5" />
          <div>
            <div className="font-semibold text-gray-900 font-inter">
              Safety questions
            </div>
            <div className="text-sm text-gray-600 font-inter">
              Helps the clinic prep safely for your scan.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {questions.map((q) => {
          const value = safety[q.key];
          const showWarning = q.onYes === "block" || q.onYes === "require_approval";
          const warningLabel =
            q.onYes === "block"
              ? "Yes answer blocks online booking."
              : q.onYes === "require_approval"
                ? "Yes answer requires clinic review before confirmation."
                : null;
          return (
            <div
              key={q.key}
              className="rounded-xl border border-gray-200/70 bg-white/60 p-3"
            >
              <div className="text-sm text-gray-800 font-inter">
                {q.label}
              </div>
              <div className="mt-2 flex items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 font-inter">
                  <input
                    type="radio"
                    name={`safety-${q.key}`}
                    checked={value === "yes"}
                    onChange={() =>
                      setSafety((prev) => ({
                        ...prev,
                        [q.key]: "yes",
                      }))
                    }
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 font-inter">
                  <input
                    type="radio"
                    name={`safety-${q.key}`}
                    checked={value === "no"}
                    onChange={() =>
                      setSafety((prev) => ({
                        ...prev,
                        [q.key]: "no",
                      }))
                    }
                  />
                  No
                </label>
              </div>
              {showWarning && (
                <div className="mt-2 text-xs text-yellow-700 font-inter">
                  {warningLabel}
                </div>
              )}
            </div>
          );
        })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
            Anything else we should know? (optional)
          </label>
          <textarea
            rows={3}
            value={safety.other_notes}
            onChange={(e) =>
              setSafety((prev) => ({
                ...prev,
                other_notes: e.target.value,
              }))
            }
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
            placeholder="e.g. recent surgery, anxiety, mobility needs"
          />
        </div>
      </div>
    </div>
  );
}
