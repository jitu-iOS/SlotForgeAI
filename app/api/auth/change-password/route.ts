import { NextRequest } from "next/server";
import { findById, updateUser } from "@/app/lib/auth/db";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/app/lib/auth/passwords";
import { getSessionUser } from "@/app/lib/auth/session";
import { isString, badRequest } from "@/app/lib/auth/validators";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body || !isString(body.oldPassword, 256) || !isString(body.newPassword, 256)) {
    return badRequest("oldPassword and newPassword required");
  }

  const strengthError = validatePasswordStrength(body.newPassword);
  if (strengthError) return badRequest(strengthError);

  const user = await findById(session.id);
  if (!user) return badRequest("Account no longer exists", 401);

  const ok = await verifyPassword(body.oldPassword, user.password_hash);
  if (!ok) return badRequest("Current password is incorrect", 401);

  if (body.oldPassword === body.newPassword) {
    return badRequest("New password must differ from current password");
  }

  const password_hash = await hashPassword(body.newPassword);
  await updateUser(user.id, { password_hash, must_change_password: false });
  return Response.json({ ok: true });
}
