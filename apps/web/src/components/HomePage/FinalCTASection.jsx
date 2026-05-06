import WarpCTA from "@/components/ui/WarpCTA";

export function FinalCTASection() {
  return (
    <WarpCTA
      badge="Start today"
      heading={
        <>
          Your journey to better<br className="hidden sm:block" /> care starts here.
        </>
      }
      description="Search clinics, compare listed prices, and choose an appointment time that works for you."
      primaryLabel="Find your scan"
      primaryScrollId="search-section"
      secondaryLabel="How it works"
      secondaryHref="/how-it-works"
    />
  );
}
