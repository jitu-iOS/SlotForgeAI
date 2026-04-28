import { NextRequest } from "next/server";
import { createUser, findByEmail, listUsers } from "@/app/lib/auth/db";
import { hashPassword, validatePasswordStrength } from "@/app/lib/auth/passwords";
import { getSessionUser, hasRole, toAuthUser } from "@/app/lib/auth/session";
import { isEmail, isRole, isString, badRequest } from "@/app/lib/auth/validators";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);

  const users = await listUsers();
  return Response.json({ users: users.map(toAuthUser) });
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);

  const body = await request.json().catch(() => null);
  if (!body || !isString(body.name, 120) || !isEmail(body.email) || !isString(body.password, 256) || !isRole(body.role)) {
    return badRequest("name, email, password, and role required");
  }

  if (body.role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    return badRequest("Only SUPER_ADMIN can create another SUPER_ADMIN", 403);
  }

  const strengthError = validatePasswordStrength(body.password);
  if (strengthError) return badRequest(strengthError);

  const collision = await findByEmail(body.email);
  if (collision) return badRequest("Email already in use", 409);

  const password_hash = await hashPassword(body.password);
  const user = await createUser({
    name: body.name,
    email: body.email,
    password_hash,
    role: body.role,
    status: "ACTIVE",
    must_change_password: false,
  });

  return Response.json({ user: toAuthUser(user) }, { status: 201 });
}
