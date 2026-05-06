import { withFullProtection } from "@/app/api/utils/ddosProtection";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    // Support both old (NEXT_PUBLIC_) and new (server-only) variable names
    // This provides backward compatibility during migration
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapId = process.env.GOOGLE_MAPS_MAP_ID || process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

    if (!apiKey) {
      return Response.json(
        { error: "Maps configuration not available" },
        { status: 503 }
      );
    }

    return Response.json({
      apiKey,
      mapId: mapId || null,
    });
  });
}
