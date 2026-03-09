import brandsWatchlist from "../../../../data/nutrition/catalog/brands-watchlist.json";
import type { CatalogBrandWatchlistEntry } from "@/modules/nutrition/catalog/public-catalog-types";

export interface SupplementBrandProfile {
  brand: string;
  aliases: string[];
  preferredQueries: string[];
}

const DEFAULT_SUPPLEMENT_QUERIES = ["whey protein", "creatina", "barra proteica"];
const PEANUT_SPREAD_QUERIES = ["pasta de amendoim", "peanut butter", "creme proteico"];
const BAR_QUERIES = ["barra proteica", "protein bar", "snack proteico"];
const SNACK_SHAKE_QUERIES = ["shake proteico", "whey pronto", "snack proteico"];

export function normalizeSupplementSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .trim();
}

function tokenizeSupplementSearchText(value: string): string[] {
  return normalizeSupplementSearchText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildDerivedAliases(entry: CatalogBrandWatchlistEntry): string[] {
  const normalizedBrand = normalizeSupplementSearchText(entry.brand);
  const compactBrand = normalizedBrand.replace(/\s+/g, "");

  return uniqueValues([
    entry.brand,
    ...(entry.aliases ?? []),
    normalizedBrand,
    compactBrand,
  ]);
}

function buildPreferredQueries(entry: CatalogBrandWatchlistEntry): string[] {
  if (entry.preferredQueries?.length) {
    return uniqueValues(entry.preferredQueries);
  }

  const normalizedBrand = normalizeSupplementSearchText(entry.brand);
  const normalizedNotes = normalizeSupplementSearchText(entry.notes ?? "");

  if (
    normalizedNotes.includes("pasta de amendoim") ||
    normalizedNotes.includes("pastas") ||
    normalizedBrand.includes("peanut") ||
    normalizedBrand.includes("nuts")
  ) {
    return PEANUT_SPREAD_QUERIES;
  }

  if (normalizedNotes.includes("barra")) {
    return BAR_QUERIES;
  }

  if (
    normalizedNotes.includes("snacks e shakes") ||
    normalizedNotes.includes("snacks") ||
    normalizedNotes.includes("shakes")
  ) {
    return SNACK_SHAKE_QUERIES;
  }

  if (normalizedBrand.includes("caffeine")) {
    return ["cafeina", "pre treino", "energy drink"];
  }

  if (normalizedBrand.includes("brain power")) {
    return ["nootropico", "cafeina", "brain booster"];
  }

  if (normalizedBrand.includes("darkness")) {
    return ["pre treino", "creatina", "whey protein"];
  }

  return DEFAULT_SUPPLEMENT_QUERIES;
}

export const SUPPLEMENT_BRAND_PROFILES: SupplementBrandProfile[] = (brandsWatchlist as CatalogBrandWatchlistEntry[]).map(
  (entry) => ({
    brand: entry.brand,
    aliases: buildDerivedAliases(entry),
    preferredQueries: buildPreferredQueries(entry),
  }),
);

function getProfileAliases(profile: SupplementBrandProfile): string[] {
  return Array.from(
    new Set([profile.brand, ...profile.aliases].map(normalizeSupplementSearchText).filter(Boolean)),
  );
}

function hasNormalizedAlias(text: string, alias: string): boolean {
  if (!alias) return false;

  if (alias.length <= 3) {
    return tokenizeSupplementSearchText(text).includes(alias);
  }

  return text.includes(alias);
}

export function matchesSupplementBrandText(value: string, profile: SupplementBrandProfile): boolean {
  const normalizedValue = normalizeSupplementSearchText(value);
  return getProfileAliases(profile).some((alias) => hasNormalizedAlias(normalizedValue, alias));
}

export function findSupplementBrandProfile(query: string): SupplementBrandProfile | null {
  const normalizedQuery = normalizeSupplementSearchText(query);
  if (!normalizedQuery) return null;
  const queryTokens = tokenizeSupplementSearchText(normalizedQuery);

  const rankedProfiles = SUPPLEMENT_BRAND_PROFILES
    .map((profile) => {
      const matchingAlias = getProfileAliases(profile)
        .filter((alias) => {
          const aliasTokens = tokenizeSupplementSearchText(alias);

          if (queryTokens.length === 1) {
            if (aliasTokens.length === 1) {
              const lengthDelta = Math.abs(aliasTokens[0].length - queryTokens[0].length);
              return (
                aliasTokens[0] === queryTokens[0] ||
                ((aliasTokens[0].startsWith(queryTokens[0]) || queryTokens[0].startsWith(aliasTokens[0])) &&
                  lengthDelta <= 2)
              );
            }

            return alias === normalizedQuery;
          }

          return hasNormalizedAlias(normalizedQuery, alias) || hasNormalizedAlias(alias, normalizedQuery);
        })
        .sort((left, right) => right.length - left.length)[0];

      return {
        profile,
        aliasLength: matchingAlias?.length ?? 0,
      };
    })
    .filter((entry) => entry.aliasLength > 0)
    .sort((left, right) => right.aliasLength - left.aliasLength);

  return rankedProfiles[0]?.profile ?? null;
}

export function buildSupplementBrandSearchTerms(query: string): string[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const profile = findSupplementBrandProfile(trimmedQuery);
  if (!profile) {
    return [];
  }

  const variants = new Set<string>([trimmedQuery, profile.brand]);
  const normalizedQuery = normalizeSupplementSearchText(trimmedQuery);
  const normalizedBrand = normalizeSupplementSearchText(profile.brand);

  if (!normalizedQuery.includes(normalizedBrand)) {
    variants.add(`${profile.brand} ${trimmedQuery}`);
  }

  for (const preferredQuery of profile.preferredQueries) {
    variants.add(
      normalizeSupplementSearchText(preferredQuery).includes(normalizedBrand)
        ? preferredQuery
        : `${profile.brand} ${preferredQuery}`,
    );
  }

  return Array.from(variants).slice(0, 4);
}
