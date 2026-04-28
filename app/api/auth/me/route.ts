import { ensureSuperAdminSeeded } from "@/app/lib/auth/init";
import { getSessionUser } from "@/app/lib/auth/session";

export async function GET() {
  await ensureSuperAdminSeeded();
  const user = await getSessionUser();
  if (!user) return Response.json({ user: null }, { status: 200 });
  return Response.json({ user });
}
