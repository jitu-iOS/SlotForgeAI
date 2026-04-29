import type { BuildCategory, BuildCategoryDef } from "@/app/types/build";
import { UTILITY_APP } from "./utilityApp";
import { BOARD_GAME } from "./boardGame";

export const CATEGORIES: BuildCategoryDef[] = [UTILITY_APP, BOARD_GAME];

export function getCategory(slug: BuildCategory | string): BuildCategoryDef | null {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}
