"use client";

import useAuth from "@/utils/useAuth";
import Logo from "@/components/Logo";
import FrostedCard from "@/components/ui/FrostedCard";
import SoftHeroBackground from "@/components/ui/SoftHeroBackground";

export default function LogoutPage() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true,
    });
  };

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#FBF8F3" }}>
      <SoftHeroBackground />

      <div className="relative w-full max-w-md text-center">
        <Logo className="w-16 h-auto mx-auto mb-6" />
        <h1
          className="text-3xl font-heading text-gray-900 mb-6"
          style={{ letterSpacing: "-0.02em" }}
        >
          Sign out
        </h1>

        <FrostedCard className="p-8">
          <p className="text-gray-700 mb-6 font-inter">
            Are you sure you want to sign out?
          </p>

          <button
            onClick={handleSignOut}
            className="w-full px-6 py-3 rounded-full text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all font-inter"
            style={{ backgroundColor: "#1A1A1A" }}
          >
            Sign Out
          </button>
        </FrostedCard>
      </div>
    </div>
  );
}
