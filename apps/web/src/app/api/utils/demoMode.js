export function isDemoMode() {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.APP_ENV === "demo" ||
    process.env.NEXT_PUBLIC_APP_ENV === "demo"
  );
}

export function isDemoEmail(value) {
  return typeof value === "string" && value.trim().toLowerCase().endsWith("@clearo.test");
}
