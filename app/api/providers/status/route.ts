// Reports which upstream providers have API keys configured on the server.
// Each provider reports both `configured` (whether ANY key is available) and
// `source` ("panel" if set via the in-app vault, "env" if from .env.local,
// "none" if neither). The free-fallback row is `configured: <healthy>` based
// on the latest health probe.
//
// In addition, this endpoint reports the three AI **roles** (prompt / image /
// animation) so the UI can render a topup-style status strip without having to
// know which provider powers each role.

import { getKeySource } from "@/app/lib/keys/providerKey";
import { getFallbackHealth, isAnyFallbackHealthy } from "@/app/lib/fallbackHealth";
import { ROLE_META, ROLE_DEFAULT_PROVIDER, ROLE_DEFAULT_LABEL, type RoleHealth } from "@/app/lib/aiRoles";

const PROVIDER_LABEL: Record<string, string> = {
  openai:     "OpenAI",
  replicate:  "Replicate",
  runway:     "Runway",
  imagineart: "Imagine Art",
  free:       "Free fallback",
};

const PROVIDER_BILLING: Record<string, string> = {
  openai:     "https://platform.openai.com/account/billing",
  replicate:  "https://replicate.com/account/billing",
  runway:     "https://dev.runwayml.com/",
  imagineart: "https://www.imagine.art/api",
};

export async function GET() {
  const [openai, replicate, runway, imagineart, fallbacks] = await Promise.all([
    getKeySource("openai"),
    getKeySource("replicate"),
    getKeySource("runway"),
    getKeySource("imagineart"),
    getFallbackHealth(),
  ]);

  const freeHealthy = isAnyFallbackHealthy();

  const providers = {
    openai:     { configured: openai     !== "none", source: openai },
    replicate:  { configured: replicate  !== "none", source: replicate },
    runway:     { configured: runway     !== "none", source: runway },
    imagineart: { configured: imagineart !== "none", source: imagineart },
    free:       { configured: freeHealthy,           source: freeHealthy ? "free" as const : "none" as const },
  };

  // Compute role-level health from the underlying providers.
  const roles: Record<string, RoleHealth> = {};
  for (const role of Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>) {
    const provider = ROLE_DEFAULT_PROVIDER[role];
    const p        = providers[provider as keyof typeof providers];
    roles[role] = {
      role,
      label:         ROLE_META[role].label,
      icon:          ROLE_META[role].icon,
      provider,
      providerLabel: PROVIDER_LABEL[provider] ?? provider,
      modelLabel:    ROLE_DEFAULT_LABEL[role],
      configured:    !!p?.configured,
      source:        (p?.source ?? "none") as "panel" | "env" | "none",
      billingUrl:    PROVIDER_BILLING[provider],
    };
  }

  return Response.json({
    providers,
    roles,
    fallbacks,
  });
}
