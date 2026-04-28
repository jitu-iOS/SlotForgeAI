// Reports which upstream providers have API keys configured on the server.
// Each provider reports both `configured` (whether ANY key is available) and
// `source` ("panel" if set via the in-app vault, "env" if from .env.local,
// "none" if neither). The free-fallback row is `configured: <healthy>` based
// on the latest health probe.

import { getKeySource } from "@/app/lib/keys/providerKey";
import { getFallbackHealth, isAnyFallbackHealthy } from "@/app/lib/fallbackHealth";

export async function GET() {
  const [openai, replicate, runway, imagineart, fallbacks] = await Promise.all([
    getKeySource("openai"),
    getKeySource("replicate"),
    getKeySource("runway"),
    getKeySource("imagineart"),
    getFallbackHealth(),
  ]);

  const freeHealthy = isAnyFallbackHealthy();

  return Response.json({
    providers: {
      openai:     { configured: openai     !== "none", source: openai },
      replicate:  { configured: replicate  !== "none", source: replicate },
      runway:     { configured: runway     !== "none", source: runway },
      imagineart: { configured: imagineart !== "none", source: imagineart },
      free:       { configured: freeHealthy,           source: freeHealthy ? "free" : "none" },
    },
    fallbacks,
  });
}
