import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { getCaptchaSiteKey } from "@/app/api/utils/captcha";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    let action = null;
    try {
      action = new URL(request.url).searchParams.get("action");
    } catch {
      action = null;
    }
    const siteKey = getCaptchaSiteKey(action);

    if (!siteKey) {
      return Response.json(
        { error: "CAPTCHA configuration not available" },
        { status: 503 },
      );
    }

    return Response.json({
      siteKey,
      provider: "hcaptcha",
      action,
    });
  });
}
