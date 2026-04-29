import { notFound, redirect } from "next/navigation";
import { getCategory } from "@/app/lib/qa/registry";
import { getSessionUser } from "@/app/lib/auth/session";
import Wizard from "./components/Wizard";

export default async function BuildWizardPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login?from=" + encodeURIComponent(`/build/${category}`));

  const def = getCategory(category);
  if (!def) notFound();

  return <Wizard categoryDef={def} />;
}
