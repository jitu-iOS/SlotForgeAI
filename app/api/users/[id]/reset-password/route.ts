import { NextRequest } from "next/server";
import { findById, updateUser } from "@/app/lib/auth/db";
import { generateTempPassword, hashPassword } from "@/app/lib/auth/passwords";
import { getSessionUser, hasRole, toAuthUser } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);

  const target = await findById(id);
  if (!target) return badRequest("User not found", 404);

  if (target.role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    return badRequest("Only SUPER_ADMIN can reset a SUPER_ADMIN password", 403);
  }

  const tempPassword = generateTempPassword();
  const password_hash = await hashPassword(tempPassword);
  const updated = await updateUser(id, { password_hash, must_change_password: true });

  return Response.json({ user: toAuthUser(updated), tempPassword });
}
