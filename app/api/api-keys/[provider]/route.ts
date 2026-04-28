import { NextRequest } from "next/server";
import { getSessionUser, hasRole } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";
import { isVaultEnabled, removeKey, setKey, type ProviderName } from "@/app/lib/keys/vault";
import { testProviderKey } from "@/app/lib/keys/testProvider";

const PROVIDERS: ProviderName[] = ["openai", "replicate", "runway", "imagineart"];

function isProvider(v: string): v is ProviderName {
  return (PROVIDERS as string[]).includes(v);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return badRequest("Unknown provider", 404);

  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);
  if (!isVaultEnabled()) return badRequest("KEY_VAULT_SECRET is not configured on the server.", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body.key !== "string" || body.key.length < 8) {
    return badRequest("`key` is required and must be at least 8 characters");
  }

  const test = await testProviderKey(provider, body.key);
  if (!test.ok && body.skipTest !== true) {
    return Response.json({ error: test.message, testFailed: true }, { status: 400 });
  }

  const entry = await setKey(provider, body.key, session.email);
  return Response.json({ entry, test });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return badRequest("Unknown provider", 404);

  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);
  if (!isVaultEnabled()) return badRequest("KEY_VAULT_SECRET is not configured on the server.", 503);

  await removeKey(provider);
  return Response.json({ ok: true });
}
