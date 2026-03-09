import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(import.meta.dirname, "../../..");
const WATCHLIST_PATH = path.join(ROOT_DIR, "data", "nutrition", "catalog", "brands-watchlist.json");
const MANUAL_SEEDS_PATH = path.join(ROOT_DIR, "data", "nutrition", "catalog", "manual-brand-seeds.json");
const CATALOG_PATH = path.join(ROOT_DIR, "data", "nutrition", "catalog", "foods-public.v1.json");
const MANIFEST_PATH = path.join(ROOT_DIR, "data", "nutrition", "catalog", "foods-public.manifest.json");

const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "product_name_pt",
  "generic_name",
  "generic_name_pt",
  "brands",
  "image_url",
  "image_front_url",
  "serving_size",
  "quantity",
  "countries_tags",
  "categories_tags",
  "last_modified_t",
  "nutriments",
].join(",");

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_PER_BRAND = 4;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_FETCH_TIMEOUT_MS = 9000;
const DEFAULT_RETRY_ATTEMPTS = 3;

function parseArgs(argv) {
  const options = {
    concurrency: DEFAULT_CONCURRENCY,
    pageSize: DEFAULT_PAGE_SIZE,
    perBrand: DEFAULT_PER_BRAND,
    limitBrands: undefined,
    brands: [],
    onlyMissing: false,
    fetchTimeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
    retryAttempts: DEFAULT_RETRY_ATTEMPTS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const currentArg = argv[index];
    const nextArg = argv[index + 1];

    if (currentArg === "--concurrency" && nextArg) {
      options.concurrency = Number(nextArg) || options.concurrency;
      index += 1;
      continue;
    }

    if (currentArg === "--page-size" && nextArg) {
      options.pageSize = Number(nextArg) || options.pageSize;
      index += 1;
      continue;
    }

    if (currentArg === "--per-brand" && nextArg) {
      options.perBrand = Number(nextArg) || options.perBrand;
      index += 1;
      continue;
    }

    if (currentArg === "--fetch-timeout-ms" && nextArg) {
      options.fetchTimeoutMs = Number(nextArg) || options.fetchTimeoutMs;
      index += 1;
      continue;
    }

    if (currentArg === "--retry-attempts" && nextArg) {
      options.retryAttempts = Number(nextArg) || options.retryAttempts;
      index += 1;
      continue;
    }

    if (currentArg === "--limit-brands" && nextArg) {
      options.limitBrands = Number(nextArg) || undefined;
      index += 1;
      continue;
    }

    if (currentArg === "--brands" && nextArg) {
      options.brands = uniqueValues(
        nextArg
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (currentArg === "--only-missing") {
      options.onlyMissing = true;
    }
  }

  return options;
}

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

function hasAliasMatch(text, alias) {
  if (!alias) {
    return false;
  }

  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) {
    return false;
  }

  if (normalizedAlias.length <= 3) {
    return tokenize(text).includes(normalizedAlias);
  }

  return normalizeText(text).includes(normalizedAlias);
}

function buildAliases(entry) {
  const normalizedBrand = normalizeText(entry.brand);
  const compactBrand = normalizedBrand.replace(/\s+/g, "");

  return uniqueValues([
    entry.brand,
    ...(entry.aliases ?? []),
    normalizedBrand,
    compactBrand,
  ]);
}

function buildPreferredQueries(entry) {
  if (Array.isArray(entry.preferredQueries) && entry.preferredQueries.length) {
    return uniqueValues(entry.preferredQueries);
  }

  const normalizedBrand = normalizeText(entry.brand);
  const normalizedNotes = normalizeText(entry.notes ?? "");

  if (
    normalizedNotes.includes("pasta de amendoim") ||
    normalizedNotes.includes("pastas") ||
    normalizedBrand.includes("peanut") ||
    normalizedBrand.includes("nuts")
  ) {
    return ["pasta de amendoim", "peanut butter", "creme proteico"];
  }

  if (normalizedNotes.includes("barra")) {
    return ["barra proteica", "protein bar", "snack proteico"];
  }

  if (normalizedNotes.includes("snacks e shakes") || normalizedNotes.includes("snacks") || normalizedNotes.includes("shakes")) {
    return ["shake proteico", "whey pronto", "snack proteico"];
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

  return ["whey protein", "creatina", "barra proteica"];
}

function buildBrandQueries(entry) {
  const aliases = buildAliases(entry)
    .filter((alias) => normalizeText(alias) !== normalizeText(entry.brand))
    .filter((alias) => normalizeText(alias).length >= 2);
  const preferredQueries = buildPreferredQueries(entry);
  return uniqueValues([
    entry.brand,
    ...aliases.slice(0, 2),
    `${entry.brand} ${preferredQueries[0]}`,
    `${aliases[0] ?? entry.brand} ${preferredQueries[0]}`,
    `${entry.brand} ${preferredQueries[1]}`,
  ]).slice(0, 5);
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseServingSize(servingSize) {
  if (!servingSize) {
    return { baseUnit: "g", servingGrams: undefined };
  }

  const parsedMatch = String(servingSize).replace(",", ".").match(/(\d+(?:\.\d+)?)\s?(g|ml)/i);
  if (!parsedMatch) {
    return { baseUnit: "g", servingGrams: undefined };
  }

  return {
    baseUnit: parsedMatch[2].toLowerCase() === "ml" ? "ml" : "g",
    servingGrams: Number(parsedMatch[1]),
  };
}

function inferCategory(name, brandEntry) {
  const normalizedText = normalizeText(`${brandEntry.brand} ${brandEntry.notes ?? ""} ${name}`);

  if (/(pasta|peanut butter|castanha|amendoim|nuts)/.test(normalizedText)) {
    return { category: "fat", mealCategories: ["breakfast", "snack"] };
  }

  if (/(barra|bar|cookie|wafer|brownie|snack)/.test(normalizedText)) {
    return { category: "snack", mealCategories: ["snack"] };
  }

  if (/(creatina|pre treino|pre treino|pre-treino|bcaa|glutamina|cafeina|drink|shot|energy)/.test(normalizedText)) {
    return { category: "beverage", mealCategories: ["breakfast", "snack"] };
  }

  if (/(whey|protein|albumina|caseina|blend|mass|hipercalorico|shake)/.test(normalizedText)) {
    return { category: "protein", mealCategories: ["breakfast", "snack"] };
  }

  return { category: "snack", mealCategories: ["snack"] };
}

function buildDisplayName(name, brand) {
  if (!brand) {
    return name;
  }

  return hasAliasMatch(name, brand) ? name : `${name} ${brand}`.trim();
}

function isBrandOnlyCatalogEntry(name, brand, brandEntry) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    return true;
  }

  const aliases = uniqueValues([
    ...buildAliases(brandEntry),
    brand,
  ]).map((alias) => normalizeText(alias)).filter(Boolean);

  if (aliases.some((alias) => alias === normalizedName)) {
    return true;
  }

  const nameTokens = tokenize(name);
  const aliasTokens = new Set(aliases.flatMap((alias) => tokenize(alias)));
  return nameTokens.length <= 2 && nameTokens.every((token) => aliasTokens.has(token));
}

function computeCompletenessScore(food) {
  const scoredFields = [
    food.caloriesPer100,
    food.proteinPer100,
    food.carbsPer100,
    food.fatPer100,
    food.fiberPer100,
    food.sodiumPer100,
  ];

  return Number((scoredFields.filter((value) => value !== undefined).length / scoredFields.length).toFixed(2));
}

function productMatchesBrand(product, brandEntry) {
  const haystack = normalizeText(
    [
      product.brands,
      product.product_name_pt,
      product.product_name,
      product.generic_name_pt,
      product.generic_name,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return buildAliases(brandEntry).some((alias) => hasAliasMatch(haystack, alias));
}

function buildTags(brandEntry, product, preferredQueries) {
  const queryTags = preferredQueries.flatMap((query) => tokenize(query).slice(0, 2));
  const categoryTags = Array.isArray(product.categories_tags)
    ? product.categories_tags.slice(0, 4).map((tag) => normalizeText(String(tag)).replace(/^en:/, ""))
    : [];

  return uniqueValues([
    normalizeText(brandEntry.brand),
    ...buildAliases(brandEntry).map((alias) => normalizeText(alias)),
    ...queryTags,
    ...categoryTags,
    "catalog-public",
  ]).slice(0, 10);
}

function foodMatchesBrandEntry(food, brandEntry) {
  const haystack = [
    food.brand,
    food.name,
    food.displayName,
    ...(food.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  return buildAliases(brandEntry).some((alias) => hasAliasMatch(haystack, alias));
}

function computeCatalogScore(food, preferredQueries) {
  const normalizedDisplayName = normalizeText(food.displayName ?? food.name);
  let score = food.confidenceScore * 100 + (food.completenessScore ?? 0) * 60;

  if (food.countryCode === "BR") {
    score += 45;
  }

  if (food.barcode) {
    score += 20;
  }

  if (food.imageUrl) {
    score += 10;
  }

  for (const query of preferredQueries) {
    if (hasAliasMatch(normalizedDisplayName, query)) {
      score += 18;
    }
  }

  return score;
}

function normalizeProduct(product, brandEntry) {
  if (!productMatchesBrand(product, brandEntry)) {
    return null;
  }

  const rawName =
    product.product_name_pt ??
    product.product_name ??
    product.generic_name_pt ??
    product.generic_name;

  const name = String(rawName ?? "").trim();
  if (!name) {
    return null;
  }

  const brand = String(product.brands ?? "")
    .split(",")[0]
    .trim() || brandEntry.brand;

  if (isBrandOnlyCatalogEntry(name, brand, brandEntry)) {
    return null;
  }

  const { baseUnit, servingGrams } = parseServingSize(product.serving_size);
  const nutriments = product.nutriments ?? {};
  const caloriesPer100 = toNumber(nutriments["energy-kcal_100g"]);
  const proteinPer100 = toNumber(nutriments.proteins_100g);
  const carbsPer100 = toNumber(nutriments.carbohydrates_100g);
  const fatPer100 = toNumber(nutriments.fat_100g);
  const fiberPer100 = toNumber(nutriments.fiber_100g);
  const sodiumPer100 = toNumber(nutriments.sodium_100g);

  if ([caloriesPer100, proteinPer100, carbsPer100, fatPer100].every((value) => value === undefined)) {
    return null;
  }

  const classification = inferCategory(name, brandEntry);
  const countryCode = Array.isArray(product.countries_tags) &&
    product.countries_tags.some((countryTag) => /brazil|brasil/i.test(String(countryTag)))
    ? "BR"
    : undefined;
  const preferredQueries = buildPreferredQueries(brandEntry);
  const food = {
    id: `pub-${product.code || slugify(`${brand}-${name}`).slice(0, 80)}`,
    source: "internal",
    sourceId: product.code ? `openfoodfacts:${product.code}` : undefined,
    name,
    displayName: buildDisplayName(name, brand),
    brand,
    barcode: product.code ? String(product.code) : undefined,
    baseUnit,
    servingDescription: product.serving_size ? String(product.serving_size) : undefined,
    servingGrams,
    caloriesPer100,
    proteinPer100,
    carbsPer100,
    fatPer100,
    fiberPer100,
    sodiumPer100,
    imageUrl: product.image_front_url ?? product.image_url,
    confidenceScore: countryCode === "BR" ? 0.93 : 0.84,
    locale: product.product_name_pt || product.generic_name_pt ? "pt-BR" : undefined,
    countryCode,
    isBranded: true,
    externalUpdatedAt: product.last_modified_t
      ? new Date(Number(product.last_modified_t) * 1000).toISOString()
      : undefined,
    mealCategories: classification.mealCategories,
    category: classification.category,
    tags: buildTags(brandEntry, product, preferredQueries),
  };

  return {
    ...food,
    completenessScore: computeCompletenessScore(food),
  };
}

function dedupeFoods(foods) {
  const seenKeys = new Set();

  return foods.filter((food) => {
    const key = food.barcode || `${normalizeText(food.displayName ?? food.name)}:${normalizeText(food.brand ?? "")}`;
    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MounTrack/1.0 (public-catalog-build)",
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchOpenFoodFacts(query, pageSize, options) {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
    encodeURIComponent(query) +
    `&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=${OPEN_FOOD_FACTS_FIELDS}&lc=pt&cc=br`;

  for (let attempt = 0; attempt < options.retryAttempts; attempt += 1) {
    const payload = await fetchJsonWithTimeout(url, options.fetchTimeoutMs);
    if (Array.isArray(payload?.products)) {
      return payload.products;
    }

    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }

  return [];
}

async function buildBrandCatalog(entry, options) {
  const preferredQueries = buildPreferredQueries(entry);
  const queries = buildBrandQueries(entry);
  const collectedFoods = [];

  for (const query of queries) {
    const products = await searchOpenFoodFacts(query, options.pageSize, options);
    const normalizedFoods = products
      .map((product) => normalizeProduct(product, entry))
      .filter(Boolean);

    collectedFoods.push(...normalizedFoods);

    if (dedupeFoods(collectedFoods).length >= options.perBrand) {
      break;
    }
  }

  const uniqueFoods = dedupeFoods(collectedFoods)
    .map((food) => ({ food, score: computeCatalogScore(food, preferredQueries) }))
    .sort((left, right) => right.score - left.score)
    .map((entryScore) => entryScore.food)
    .slice(0, options.perBrand);

  return {
    brand: entry.brand,
    foods: uniqueFoods,
  };
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const taskIndex = currentIndex;
      currentIndex += 1;
      results[taskIndex] = await task(items[taskIndex], taskIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

async function readOptionalJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readOptionalJsonDocument(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function normalizeManualFood(food) {
  return {
    ...food,
    completenessScore: food.completenessScore ?? computeCompletenessScore(food),
  };
}

function selectBrands(watchlist, options, manifest) {
  let selectedBrands = Array.isArray(watchlist) ? [...watchlist] : [];

  if (options.onlyMissing && Array.isArray(manifest?.missingBrands) && manifest.missingBrands.length) {
    const missingBrandSet = new Set(manifest.missingBrands.map((brand) => normalizeText(brand)));
    selectedBrands = selectedBrands.filter((entry) => missingBrandSet.has(normalizeText(entry.brand)));
  }

  if (options.brands.length) {
    const requestedBrandSet = new Set(options.brands.map((brand) => normalizeText(brand)));
    selectedBrands = selectedBrands.filter((entry) => {
      const aliases = buildAliases(entry).map((alias) => normalizeText(alias));
      return aliases.some((alias) => requestedBrandSet.has(alias));
    });
  }

  if (options.limitBrands) {
    selectedBrands = selectedBrands.slice(0, options.limitBrands);
  }

  return selectedBrands;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const watchlistRaw = await fs.readFile(WATCHLIST_PATH, "utf8");
  const watchlist = JSON.parse(watchlistRaw);
  const existingCatalog = await readOptionalJsonDocument(CATALOG_PATH);
  const existingManifest = await readOptionalJsonDocument(MANIFEST_PATH);
  const selectedBrands = selectBrands(watchlist, options, existingManifest);

  if (!selectedBrands.length) {
    throw new Error("Nenhuma marca selecionada para gerar o catalogo publico.");
  }

  const incrementalMode = Array.isArray(watchlist) && selectedBrands.length < watchlist.length;
  console.log(
    incrementalMode
      ? `Modo incremental ativo para ${selectedBrands.length} marcas.`
      : `Modo completo ativo para ${selectedBrands.length} marcas.`,
  );

  const brandCatalogs = await mapWithConcurrency(selectedBrands, options.concurrency, async (entry) => {
    const result = await buildBrandCatalog(entry, options);
    console.log(`${result.brand}: ${result.foods.length} produtos`);
    return result;
  });

  const manualSeedFoods = (await readOptionalJsonArray(MANUAL_SEEDS_PATH))
    .map((food) => normalizeManualFood(food))
    .filter((food) => selectedBrands.some((entry) => foodMatchesBrandEntry(food, entry)));

  const preservedFoods = incrementalMode && Array.isArray(existingCatalog?.foods)
    ? existingCatalog.foods.filter(
      (food) => !selectedBrands.some((entry) => foodMatchesBrandEntry(food, entry)),
    )
    : [];

  const foods = dedupeFoods([
    ...preservedFoods,
    ...brandCatalogs.flatMap((entry) => entry.foods),
    ...manualSeedFoods,
  ])
    .sort((left, right) => {
      const brandComparison = String(left.brand ?? "").localeCompare(String(right.brand ?? ""), "pt-BR");
      if (brandComparison !== 0) {
        return brandComparison;
      }

      return String(left.displayName ?? left.name).localeCompare(String(right.displayName ?? right.name), "pt-BR");
    });

  const generatedAt = new Date().toISOString();
  const catalogVersion = generatedAt.slice(0, 10);
  const usesManualBrandSeeds = foods.some((food) => String(food.sourceId ?? "").startsWith("manual:"));
  const missingBrands = watchlist
    .filter((entry) => !foods.some((food) => foodMatchesBrandEntry(food, entry)))
    .map((entry) => entry.brand);

  await fs.mkdir(path.dirname(CATALOG_PATH), { recursive: true });
  await fs.writeFile(
    CATALOG_PATH,
    JSON.stringify(
      {
        version: catalogVersion,
        generatedAt,
        foods,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      {
        catalogVersion,
        foodCount: foods.length,
        generatedAt,
        brandsRequested: watchlist.length,
        brandsWithResults: watchlist.length - missingBrands.length,
        missingBrands,
        inputSources: usesManualBrandSeeds
          ? ["openfoodfacts", "manual-watchlist", "manual-brand-seeds"]
          : ["openfoodfacts", "manual-watchlist"],
        dedupeRulesVersion: "v1",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Catalogo gerado com ${foods.length} produtos.`);
  if (missingBrands.length) {
    console.log(`Marcas sem cobertura atual: ${missingBrands.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
