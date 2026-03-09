import type { FoodItem } from "@/modules/nutrition/domain/types";

export interface CatalogBrandWatchlistEntry {
  brand: string;
  aliases?: string[];
  notes?: string;
  preferredQueries?: string[];
}

export interface PublicCatalogDocument {
  version: string;
  generatedAt: string;
  foods: FoodItem[];
}

export interface PublicCatalogManifest {
  catalogVersion: string;
  foodCount: number;
  generatedAt: string;
  brandsRequested: number;
  brandsWithResults: number;
  missingBrands: string[];
  inputSources: string[];
  dedupeRulesVersion: string;
}
