import { DatePicker } from "@/components/ui/DatePicker";

export function PatientDetailsStep({
  currentUser,
  userLoading,
  params,
  patientName,
  setPatientName,
  patientDob,
  setPatientDob,
  patientEmail,
  setPatientEmail,
  patientPhone,
  setPatientPhone,
  symptomsReason,
  setSymptomsReason,
}) {
  const clinicId = params?.id;
  const callbackUrl = clinicId ? `/clinic/${clinicId}` : "/search";

  return (
    <div className="space-y-3">
      {!currentUser && !userLoading ? (
        <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
          <div className="text-sm text-gray-700 font-inter">
            Want this to be faster next time?{" "}
            <a
              href={`/account/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-[#3D6B5E] font-semibold hover:underline"
            >
              Create an account
            </a>{" "}
            and we'll remember these details.
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
            Date of birth *
          </label>
          <DatePicker
            required
            value={patientDob}
            onChange={(e) => setPatientDob(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter flex items-center justify-between text-left"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
            Phone *
          </label>
          <input
            type="tel"
            required
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
            Email *
          </label>
          <input
            type="email"
            required
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
            Symptoms / reason for scan *
          </label>
          <textarea
            rows={3}
            required
            value={symptomsReason}
            onChange={(e) => setSymptomsReason(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E] font-inter"
            placeholder="e.g. knee pain after injury"
          />
        </div>
      </div>
    </div>
  );
}
