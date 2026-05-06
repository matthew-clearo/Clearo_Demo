"use client";

import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import useUser from "@/utils/useUser";
import useAuth from "@/utils/useAuth";
import { LogOut, Menu, X, ChevronDown } from "lucide-react";
import { isClinicHost, isAdminHost } from "@/utils/siteSurface";

export default function Header() {
  const { pathname } = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const { signOut } = useAuth();
  const { data: currentUser } = useUser();

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
  }, [pathname]);

  // Portal subdomains get their own chrome — no consumer header
  if (isClinicHost() || isAdminHost()) return null;

  const headerlessRoutePrefixes = [
    "/account/signin",
    "/account/signup",
    "/onboarding",
    "/clinic-onboarding",
  ];
  const shouldHideHeader = headerlessRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isHomePage = pathname === "/";

  // Track scroll position
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Two states: at top (solid white) or scrolled (frosted glass)
  const isAtTop = scrollY === 0;

  const outerMarginClass = isAtTop ? "mt-4 sm:mt-6" : "mt-2 sm:mt-4";
  const innerPaddingClass = isAtTop ? "py-3 sm:py-5" : "py-2 sm:py-4";
  const radiusClass = "rounded-[12px]";

  // Background: solid white at top, frosted glass when scrolled
  const headerBg = isAtTop ? "bg-white" : "bg-white/80 backdrop-blur-xl";

  // Always dark text — no more light/dark switching
  const textColor = "text-gray-900";

  // Subtle warm border instead of sage
  const borderColor = isAtTop ? "rgba(0, 0, 0, 0.06)" : "rgba(0, 0, 0, 0.04)";

  const elevatedShadow = isAtTop
    ? "0 4px 20px rgba(0,0,0,0.06)"
    : "0 8px 32px rgba(0,0,0,0.08)";

  const SAGE = "#3D6B5E";

  // NEW: choose the best dashboard link based on role
  const dashboardHref = "/dashboard";
  const dashboardTitle = "My dashboard";

  // NEW: profile page (patient details)
  const profileHref = "/account/profile";

  // Determine positioning class based on page
  const positionClass = isHomePage ? "fixed top-0 left-0 right-0" : "relative";
  const pointerEventsClass = isHomePage ? "pointer-events-none" : "";
  const spacingClass = isHomePage ? "" : "mb-8";

  if (shouldHideHeader) {
    return null;
  }

  return (
    <header
      className={`${positionClass} ${spacingClass} z-50 flex justify-center ${pointerEventsClass} bg-transparent`}
    >
      <div
        className={`w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${outerMarginClass} pointer-events-auto`}
      >
        <div
          className={`${radiusClass} ${headerBg} transition-all duration-300 border-2`}
          style={{
            boxShadow: elevatedShadow,
            borderColor: borderColor,
          }}
        >
          <div
            className={`px-4 sm:px-6 lg:px-8 ${innerPaddingClass} flex items-center justify-between lg:grid lg:grid-cols-3`}
          >
            {/* Left: Logo + Hamburger (mobile) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex lg:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className={`p-2 rounded-full hover:bg-black/5 transition-colors ${textColor}`}
                  aria-label="Toggle menu"
                >
                  {showMobileMenu ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </div>

              <a href="/" className="flex items-center gap-2">
                <Logo
                  className="w-12 sm:w-16 h-auto font-semibold"
                  variant="light"
                />
              </a>
            </div>

            {/* Center: Nav (desktop only) */}
            <nav className="hidden lg:flex items-center justify-center gap-8 whitespace-nowrap">
              <a
                href="/for-patients"
                className={`${textColor} hover:text-[#3D6B5E] transition-colors duration-300 font-inter whitespace-nowrap`}
              >
                For Patients
              </a>
              <a
                href="/for-providers"
                className={`${textColor} hover:text-[#3D6B5E] transition-colors duration-300 font-inter whitespace-nowrap`}
              >
                For Providers
              </a>
              <a
                href="/how-it-works"
                className={`${textColor} hover:text-[#3D6B5E] transition-colors duration-300 font-inter whitespace-nowrap`}
              >
                How it Works
              </a>
              <a
                href="/about"
                className={`${textColor} hover:text-[#3D6B5E] transition-colors duration-300 font-inter whitespace-nowrap`}
              >
                About
              </a>
            </nav>

            {/* Right: Auth or User Info */}
            <div className="flex items-center justify-end gap-2 sm:gap-4">
              {currentUser ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 pr-2 sm:pr-3 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold font-inter"
                      style={{ backgroundColor: "#3D6B5E" }}
                    >
                      {(currentUser?.name || currentUser?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown size={14} className="text-gray-500 hidden sm:block" />
                  </button>

                  {/* Dropdown */}
                  {showUserMenu && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl py-2 z-50"
                      style={{ border: "1px solid rgba(0, 0, 0, 0.08)" }}
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 font-inter truncate">
                          {currentUser?.name || "Account"}
                        </p>
                        <p className="text-xs text-gray-500 font-inter truncate">
                          {currentUser?.email}
                        </p>
                      </div>
                      <a
                        href={dashboardHref}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-inter transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        {dashboardTitle}
                      </a>
                      <a
                        href={profileHref}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-inter transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Profile
                      </a>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            signOut({ callbackUrl: "/", redirect: true });
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-inter transition-colors w-full text-left"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <a
                    href="/account/signin"
                    className={`${textColor} hover:text-[#3D6B5E] transition-colors duration-300 font-inter font-medium text-sm sm:text-base`}
                  >
                    <span className="hidden sm:inline">Sign In</span>
                    <span className="sm:hidden">Sign In</span>
                  </a>
                  <a
                    href="/account/signup"
                    className="px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg font-semibold transition-all font-inter text-sm sm:text-base hover:opacity-90 active:scale-[0.97]"
                    style={{
                      backgroundColor: "#3D6B5E",
                      color: "#FFFFFF",
                    }}
                  >
                    <span className="sm:hidden">Join</span>
                    <span className="hidden sm:inline">Get Started</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="lg:hidden mt-2 p-4 rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl shadow-xl">
            <nav className="flex flex-col gap-3">
              <a
                href="/for-patients"
                className="px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-inter"
                onClick={() => setShowMobileMenu(false)}
              >
                For Patients
              </a>
              <a
                href="/for-providers"
                className="px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-inter"
                onClick={() => setShowMobileMenu(false)}
              >
                For Providers
              </a>
              <a
                href="/how-it-works"
                className="px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-inter"
                onClick={() => setShowMobileMenu(false)}
              >
                How it Works
              </a>
              <a
                href="/about"
                className="px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-inter"
                onClick={() => setShowMobileMenu(false)}
              >
                About
              </a>
              {currentUser ? (
                <a
                  href={profileHref}
                  className="px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-inter"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Profile
                </a>
              ) : null}
            </nav>
          </div>
        )}
      </div>

    </header>
  );
}
