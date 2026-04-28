import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth/session";
import DashboardShell from "./components/DashboardShell";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <DashboardShell initialUser={user} />;
}
