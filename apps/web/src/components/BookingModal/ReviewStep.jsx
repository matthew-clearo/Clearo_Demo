export function ReviewStep({
  selectedDate,
  selectedSlotId,
  slots,
  clinic,
  selectedScan,
  patientName,
  patientDob,
  patientEmail,
  patientPhone,
  symptomsReason,
  referralUrl,
  referralMissing,
  notes,
  setNotes,
  consent,
  setConsent,
}) {
  const safeSlots = Array.isArray(slots) ? slots : [];
  const consentItems = [
    {
      key: "infoAccurate",
      label: "I confirm all information provided is accurate.",
    },
    {
      key: "riskUnderstood",
      label:
        "I understand this is a medical imaging procedure with potential risks.",
    },
    {
      key: "authorizeClinic",
      label: "I authorize the clinic to perform the selected scan.",
    },
    {
      key: "cancellationPolicy",
      label: "I agree to the cancellation policy (48-hour notice required).",
    },
    {
      key: "termsPrivacy",
      label: "I have read and agree to the Terms of Service and Privacy Policy.",
    },
  ];
  const selectedTime =
    safeSlots.find((slot) => slot.id === selectedSlotId)?.slot_time?.slice(0, 5) ||
    "";
  const formattedPrice = Number.isFinite(Number(selectedScan?.price))
    ? `$${Math.round(Number(selectedScan.price))}`
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
        <div className="text-sm font-semibold text-gray-900 font-inter">
          Booking summary
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Appointment
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900 font-inter">
              {clinic?.name || "Clinic"}
            </div>
            <div className="mt-1 text-sm text-gray-600 font-inter">
              {selectedScan?.scan_name || "Scan"}
            </div>
            <div className="mt-3 text-sm text-gray-900 font-inter">
              {selectedDate || "Date pending"} {selectedTime ? `at ${selectedTime}` : ""}
            </div>
            {formattedPrice ? (
              <div className="mt-1 text-sm font-semibold text-gray-900 font-inter">
                Estimated total: {formattedPrice}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-white bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
              Patient
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900 font-inter">
              {patientName || "Patient details pending"}
            </div>
            <div className="mt-1 text-sm text-gray-600 font-inter">
              {patientDob || "DOB pending"}
            </div>
            <div className="mt-3 text-sm text-gray-600 font-inter">
              {patientEmail || "Email pending"}
            </div>
            <div className="text-sm text-gray-600 font-inter">
              {patientPhone || "Phone pending"}
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-white bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
            Clinical notes
          </div>
          <div className="mt-2 text-sm text-gray-700 font-inter">
            {symptomsReason || "No symptoms or reason added."}
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 font-inter">
            Referral status
          </div>
          <div className="mt-2 text-sm text-gray-700 font-inter">
            {referralUrl
              ? "Referral uploaded"
              : referralMissing
                ? "Referral pending, telehealth options provided"
                : "Referral not uploaded yet"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
          Notes (Optional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
          placeholder="Anything the clinic should know before your appointment"
        />
      </div>

      <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
        <div className="text-sm font-semibold text-gray-900 font-inter">
          Consent & attestation (required)
        </div>
        <div className="mt-3 space-y-2">
          {consentItems.map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-2 text-sm text-gray-700 font-inter"
            >
              <input
                type="checkbox"
                checked={Boolean(consent?.[item.key])}
                onChange={(e) =>
                  setConsent((prev) => ({
                    ...prev,
                    [item.key]: e.target.checked,
                  }))
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
