import { waitForStartupValidation } from "@/app/api/utils/startupValidation";

export async function GET() {
  const state = await waitForStartupValidation();
  const ok = state.status === "passed";

  return Response.json(
    {
      status: ok ? "ready" : "not_ready",
      startupValidation: state,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
