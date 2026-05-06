import Logo from "@/components/Logo";

export default function AuthGateModal({ open, onClose, continueUrl }) {
  if (!open) return null;

  const SAGE = "#3D6B5E";
  const signinHref = `/account/signin?callbackUrl=${encodeURIComponent(continueUrl || "/")}`;
  const signupHref = `/account/signup?callbackUrl=${encodeURIComponent(continueUrl || "/")}`;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to continue"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white border border-gray-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <div>
              <div className="text-sm font-semibold text-gray-900 font-inter">
                Sign in to confirm your booking
              </div>
              <div className="text-xs text-gray-600 font-inter">
                We’ll save your details so next time is faster.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-gray-200/70 bg-white/50 p-4">
            <div className="text-sm text-gray-700 font-inter">
              To protect your info and make rescheduling easy, we ask you to
              sign in (or create an account) before you finish booking.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={signinHref}
              className="px-5 py-3 rounded-full text-center font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-inter"
            >
              Sign in
            </a>
            <a
              href={signupHref}
              className="px-5 py-3 rounded-full text-center font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all font-inter"
              style={{ backgroundColor: "#1A1A1A" }}
            >
              Create account
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-gray-600 hover:underline font-inter"
          >
            Not right now
          </button>
        </div>
      </div>
    </div>
  );
}
