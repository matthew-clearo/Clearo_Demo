import { FileText, ShieldAlert } from "lucide-react";
import { MAX_UPLOAD_FILE_SIZE_LABEL } from "@/utils/uploadLimits";

export function ReferralUploadStep({
  uploadLoading,
  referralUrl,
  referralFileName,
  setReferralFileName,
  uploadReferral,
  referralMissing,
  setReferralMissing,
  setReferralUrl,
  requiresReferral,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-[#3D6B5E] mt-0.5" />
          <div>
            <div className="font-semibold text-gray-900 font-inter">
              Upload your referral
            </div>
            <div className="text-sm text-gray-600 font-inter">
              {requiresReferral
                ? `PDF or photo accepted, up to ${MAX_UPLOAD_FILE_SIZE_LABEL}. Required for this scan.`
                : `PDF or photo accepted, up to ${MAX_UPLOAD_FILE_SIZE_LABEL}. Optional for this scan.`}
            </div>
          </div>
        </div>
      </div>

      <label className="block cursor-pointer">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-[#FBF8F3] p-5 transition-colors hover:border-[#3D6B5E]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 font-inter">
                {referralUrl
                  ? "Referral ready"
                  : referralMissing
                    ? "Referral marked as pending"
                    : "Choose a referral file"}
              </div>
              <div className="mt-1 text-sm text-gray-600 font-inter">
                {uploadLoading
                  ? "Uploading your file now..."
                  : referralUrl
                  ? referralFileName || "Upload complete"
                    : `PDF or image, up to ${MAX_UPLOAD_FILE_SIZE_LABEL}, uploaded securely with your booking.`}
              </div>
            </div>
            <div className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 font-inter">
              {uploadLoading ? "Uploading..." : "Select file"}
            </div>
          </div>
        </div>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={uploadLoading || referralMissing}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setReferralFileName(f.name);
            uploadReferral(f);
          }}
          className="sr-only"
        />
      </label>

      <div className="rounded-2xl border border-gray-200/70 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-inter">
            {uploadLoading ? (
              <span className="text-gray-600">
                Uploading...
              </span>
            ) : referralUrl ? (
              <span className="font-semibold text-green-700">
                Uploaded {referralFileName ? `(${referralFileName})` : ""}
              </span>
            ) : referralMissing ? (
              <span className="font-semibold text-yellow-700">
                Marked as "don't have one yet"
              </span>
            ) : (
              <span className="text-gray-600">
                No file uploaded yet
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 font-inter">
            <input
              type="checkbox"
              checked={referralMissing}
              disabled={!requiresReferral}
              onChange={(e) => {
                const next = e.target.checked;
                setReferralMissing(next);
                if (next) {
                  setReferralUrl(null);
                  setReferralFileName("");
                }
              }}
            />
            I don't have one yet {requiresReferral ? "(required flow)" : "(optional)"}
          </label>
        </div>
      </div>

      {referralMissing ? (
        <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-yellow-600 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900 font-inter">
                Need a quick referral?
              </div>
              <div className="text-sm text-gray-600 font-inter mt-1">
                You can get an online referral fast via telehealth partners:
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href="https://instantconsult.com.au"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[#3D6B5E] hover:underline font-inter"
                >
                  Instant Consult
                </a>
                <span className="text-gray-400">·</span>
                <a
                  href="https://hellogp.com.au"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[#3D6B5E] hover:underline font-inter"
                >
                  HelloGP
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
