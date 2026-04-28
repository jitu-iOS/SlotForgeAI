import { NextRequest } from "next/server";
import { findByEmail } from "@/app/lib/auth/db";
import { verifyPassword } from "@/app/lib/auth/passwords";
import { setSessionCookie, toAuthUser } from "@/app/lib/auth/session";
import { ensureSuperAdminSeeded } from "@/app/lib/auth/init";
import { checkLoginRate, recordLoginAttempt } from "@/app/lib/auth/rateLimit";
import { isEmail, isString, badRequest } from "@/app/lib/auth/validators";

export async function POST(request: NextRequest) {
  await ensureSuperAdminSeeded();

  const body = await request.json().catch(() => null);
  if (!body || !isEmail(body.email) || !isString(body.password, 256)) {
    return badRequest("Email and password required");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateKey = `${ip}:${body.email.toLowerCase()}`;

  const pre = checkLoginRate(rateKey);
  if (!pre.allowed) {
    return Response.json(
      { error: "Too many attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(pre.retryAfterSeconds) } },
    );
  }

  const user = await findByEmail(body.email);
  const ok = user ? await verifyPassword(body.password, user.password_hash) : false;
  const allowed = ok && user!.status === "ACTIVE";

  recordLoginAttempt(rateKey, allowed);

  if (!allowed) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSessionCookie(user!);
  return Response.json({ user: toAuthUser(user!) });
}
