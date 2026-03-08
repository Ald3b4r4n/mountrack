export interface SupplementBrandProfile {
  brand: string;
  aliases: string[];
  preferredQueries: string[];
}

export const SUPPLEMENT_BRAND_PROFILES: SupplementBrandProfile[] = [
  {
    brand: "Integralmedica",
    aliases: ["integralmedica", "integral medica", "integralmedica suplementos"],
    preferredQueries: ["100% pure whey", "nutri whey", "creatina"],
  },
  {
    brand: "Growth",
    aliases: ["growth", "growth supplements"],
    preferredQueries: ["whey protein", "creatina", "barra proteica"],
  },
  {
    brand: "DUX",
    aliases: ["dux", "dux nutrition lab"],
    preferredQueries: ["whey protein", "fresh whey", "protein"],
  },
  {
    brand: "Max Titanium",
    aliases: ["max titanium"],
    preferredQueries: ["100% whey protein", "creatina"],
  },
  {
    brand: "Probiotica",
    aliases: ["probiotica", "probiotica suplementos"],
    preferredQueries: ["100% pure whey", "creatina"],
  },
  {
    brand: "Vitafor",
    aliases: ["vitafor"],
    preferredQueries: ["isofort", "whey fort 3w", "creatina"],
  },
  {
    brand: "Essential Nutrition",
    aliases: ["essential nutrition", "essential"],
    preferredQueries: ["whey protein", "clean whey", "proteina"],
  },
  {
    brand: "Nutrify",
    aliases: ["nutrify"],
    preferredQueries: ["whey protein", "vegan protein", "proteina"],
  },
  {
    brand: "Dark Lab",
    aliases: ["dark lab", "darklab", "darkness", "dark lab suplementos"],
    preferredQueries: ["whey protein", "creatina", "pre treino"],
  },
  {
    brand: "Adaptogen Science",
    aliases: ["adaptogen science", "adaptogen"],
    preferredQueries: ["creatina", "whey protein"],
  },
  {
    brand: "True Source",
    aliases: ["true source", "true whey"],
    preferredQueries: ["true whey", "whey isolado"],
  },
  {
    brand: "Soldiers Nutrition",
    aliases: ["soldiers nutrition", "soldiers"],
    preferredQueries: ["creatina", "whey protein"],
  },
  {
    brand: "Under Labz",
    aliases: ["under labz", "underlabz"],
    preferredQueries: ["pre treino", "creatina"],
  },
  {
    brand: "+Mu",
    aliases: ["+mu", "+mu.", "mu"],
    preferredQueries: ["whey pronto", "protein", "snack"],
  },
  {
    brand: "Black Skull",
    aliases: ["black skull"],
    preferredQueries: ["100% whey", "creatina"],
  },
  {
    brand: "Nutri Whey",
    aliases: ["nutri whey"],
    preferredQueries: ["integralmedica", "hipercalorico", "protein"],
  },
  {
    brand: "Optimum Nutrition",
    aliases: ["optimum nutrition", "on", "gold standard"],
    preferredQueries: ["gold standard 100% whey", "whey protein"],
  },
  {
    brand: "Dymatize",
    aliases: ["dymatize", "dymatize nutrition", "iso100"],
    preferredQueries: ["iso100", "whey isolate"],
  },
  {
    brand: "Dr. Peanut",
    aliases: ["dr peanut", "dr. peanut"],
    preferredQueries: ["pasta de amendoim", "peanut butter"],
  },
  {
    brand: "Protin",
    aliases: ["protin"],
    preferredQueries: ["whey 3w", "whey isolate"],
  },
];

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

  const rankedProfiles = SUPPLEMENT_BRAND_PROFILES
    .map((profile) => {
      const matchingAlias = getProfileAliases(profile)
        .filter((alias) => hasNormalizedAlias(normalizedQuery, alias) || hasNormalizedAlias(alias, normalizedQuery))
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
