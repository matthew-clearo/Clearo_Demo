"use client";

export default function Logo({ className = "w-16 h-auto", variant = "light" }) {
  // White logo for dark backgrounds, dark logo for light backgrounds
  const logoSrc =
    variant === "dark"
      ? "https://ucarecdn.com/5a27b482-a1a2-440c-a84d-968fe235649f/-/format/auto/" // whitelogo.png
      : "https://ucarecdn.com/b8e9ac5b-4117-4fe8-81c0-aa62d39246ce/group3.png"; // group3.png

  return (
    <img
      src={logoSrc}
      alt="Clearo"
      className={className}
      onError={(e) => {
        console.error("Logo failed to load:", logoSrc);
      }}
    />
  );
}
