// Fallback: config-level redirect in next.config.ts handles / → /project.
// This component is kept as a safety net but should never render in practice.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/project");
}
