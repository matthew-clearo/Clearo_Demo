import { withFullProtection } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";

const ALLOWED_EVENTS = new Set([
  "render_requested",
  "render_succeeded",
  "render_failed",
  "challenge_opened",
  "challenge_closed",
  "token_received",
  "token_expired",
  "widget_error",
  "widget_reset",
  "duplicate_submit_blocked",
]);

export async function POST(request) {
  return withFullProtection(request, "read", async () => {
    const body = await request.json().catch(() => ({}));
    const event = typeof body.event === "string" ? body.event.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const route = typeof body.route === "string" ? body.route.trim() : "";
    const details =
      body && typeof body.details === "object" && !Array.isArray(body.details)
        ? body.details
        : {};

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return Response.json({ error: "Invalid CAPTCHA telemetry event" }, { status: 400 });
    }

    logger.info(
      {
        event,
        action: action || null,
        route: route || null,
        details,
      },
      "CAPTCHA client telemetry",
    );

    return Response.json({ success: true });
  });
}
