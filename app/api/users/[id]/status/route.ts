import { NextRequest } from "next/server";
import { countByRole, findById, updateUser } from "@/app/lib/auth/db";
import { getSessionUser, hasRole, toAuthUser } from "@/app/lib/auth/session";
import { isStatus, badRequest } from "@/app/lib/auth/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);
  if (!hasRole(session, ["ADMIN", "SUPER_ADMIN"])) return badRequest("Forbidden", 403);
  if (id === session.id) return badRequest("You cannot change your own status", 403);

  const body = await request.json().catch(() => null);
  if (!body || !isStatus(body.status)) return badRequest("status is required");

  const target = await findById(id);
  if (!target) return badRequest("User not found", 404);

  if (target.role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    return badRequest("Only SUPER_ADMIN can disable a SUPER_ADMIN", 403);
  }
  if (target.role === "SUPER_ADMIN" && body.status === "DISABLED") {
    const activeSupers = await countByRole("SUPER_ADMIN");
    if (activeSupers <= 1) return badRequest("Cannot disable the last SUPER_ADMIN", 409);
  }

  const updated = await updateUser(id, { status: body.status });
  return Response.json({ user: toAuthUser(updated) });
}
