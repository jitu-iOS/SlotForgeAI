import { notFound, redirect } from "next/navigation";
import { getCategory } from "@/app/lib/qa/registry";
import { getSessionUser } from "@/app/lib/auth/session";
import Results from "./components/Results";

export default async function BuildResultsPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?from=${encodeURIComponent(`/build/${category}/results`)}`);

  const def = getCategory(category);
  if (!def) notFound();

  return <Results categoryDef={def} />;
}
