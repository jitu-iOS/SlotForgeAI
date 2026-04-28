import { NextRequest } from "next/server";
import { getSessionUser, hasRole } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";
import { type ProviderName, readKey } from "@/app/lib/keys/vault";
import { testProviderKey } from "@/app/lib/keys/testProvider";
import { getProviderKey } from "@/app/lib/keys/providerKey";

const PROVIDERS: ProviderName[] = ["openai", "replicate", "runway", "imagineart"];

function isProvider(v: string): v is ProviderName {
  return (PROVIDERS as string[]).includes(v);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return badRequest("Unknown provider", 404);

  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key : await getProviderKey(provider);
  if (!key) return badRequest("No key provided and no stored key to test", 404);
  void readKey;

  const result = await testProviderKey(provider, key);
  return Response.json(result);
}
