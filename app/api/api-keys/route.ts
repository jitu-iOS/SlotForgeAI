import { getSessionUser, hasRole } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";
import { isVaultEnabled, listEntries, type ProviderName } from "@/app/lib/keys/vault";
import { getKeySource } from "@/app/lib/keys/providerKey";

const PROVIDERS: ProviderName[] = ["openai", "replicate", "runway", "imagineart"];

export async function GET() {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);

  const entries = await listEntries();
  const byName = new Map(entries.map((e) => [e.provider, e]));

  const merged = await Promise.all(
    PROVIDERS.map(async (p) => {
      const e = byName.get(p);
      const source = await getKeySource(p);
      return {
        provider: p,
        source,
        lastFour: e?.lastFour ?? null,
        updatedAt: e?.updatedAt ?? null,
        updatedBy: e?.updatedBy ?? null,
      };
    }),
  );

  return Response.json({ vaultEnabled: isVaultEnabled(), providers: merged });
}

export const _PROVIDERS = PROVIDERS;
