import { getSessionUser, hasRole } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";
import { perProviderSummary } from "@/app/lib/usage/aggregate";

export const runtime = "nodejs";

const PROVIDER_DASHBOARDS: Record<string, string> = {
  openai:     "https://platform.openai.com/usage",
  replicate:  "https://replicate.com/account/billing",
  runway:     "https://dev.runwayml.com/",
  imagineart: "https://platform.imagine.art/",
  free:       "https://pollinations.ai",
};

export async function GET() {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  // ADMIN-and-above only — usage data is sensitive operational telemetry.
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);

  const summaries = await perProviderSummary();
  const enriched = Object.fromEntries(
    Object.entries(summaries).map(([provider, s]) => [provider, {
      ...s,
      dashboardUrl: PROVIDER_DASHBOARDS[provider],
    }]),
  );
  return Response.json({ providers: enriched, generatedAt: new Date().toISOString() });
}
