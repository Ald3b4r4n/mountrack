import { Pool } from "pg";
import brandsWatchlist from "../../../../data/nutrition/catalog/brands-watchlist.json";
import { listPublicCatalogFoods } from "@/modules/nutrition/catalog/load-public-catalog";
import type { CatalogBrandWatchlistEntry } from "@/modules/nutrition/catalog/public-catalog-types";
import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import { SUPPLEMENT_FOODS } from "@/modules/nutrition/data/supplement-foods";
import { TACO_FOODS } from "@/modules/nutrition/data/taco-foods";
import type {
  DiaryItemSnapshot,
  FoodBaseUnit,
  FoodItem,
  MealDefinition,
  MealPlan,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";
import { getDefaultMealDefinitions, getMealLabel } from "@/modules/nutrition/meal-helpers";
import {
  customFoodKey,
  diaryKey,
  getNutritionMemoryStore,
  mealPlanKey,
  type DiaryRecord,
} from "@/modules/nutrition/repositories/memory-store";
import {
  buildMissingFoodLookupId,
  MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
  MISSING_FOOD_LOOKUP_PROCESSING_TIMEOUT_MS,
  type MissingFoodLookupInput,
  type MissingFoodLookupRecord,
  type MissingFoodLookupStatus,
} from "@/modules/nutrition/repositories/missing-food-lookup";

const BRAND_WATCHLIST = [
  "Growth Supplements",
  "Max Titanium",
  "Integralmedica",
  "Probiótica",
  "Dux Nutrition",
  "Black Skull",
  "Vitafor",
  "Nutrify",
  "True Source",
  "Caffeine Army",
  "ElementoPuro",
  "Essential Nutrition",
  "Puravida",
  "Adaptogen Science",
  "Iridium Labs",
  "Dark Lab",
  "New Millen",
  "Under Labz",
  "Equaliv",
  "Atlhetica Nutrition",
  "Darkness",
  "Bodyaction",
];

const RUNTIME_BRAND_WATCHLIST = ((brandsWatchlist as CatalogBrandWatchlistEntry[]).map((entry) => entry.brand).length
  ? (brandsWatchlist as CatalogBrandWatchlistEntry[]).map((entry) => entry.brand)
  : BRAND_WATCHLIST);

const globalPgState = globalThis as typeof globalThis & {
  __nutritionPool__?: Pool;
  __nutritionSchemaPromise__?: Promise<void>;
};
const SCHEMA_SQL = `
create extension if not exists pg_trgm;

create table if not exists nutrition_foods (
  id text primary key,
  source text not null,
  source_id text,
  name text not null,
  display_name text,
  brand text,
  barcode text,
  locale text,
  country_code text,
  is_branded boolean not null default false,
  completeness_score numeric not null default 0,
  external_updated_at timestamptz,
  payload jsonb not null,
  confidence_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table nutrition_foods add column if not exists display_name text;
alter table nutrition_foods add column if not exists locale text;
alter table nutrition_foods add column if not exists country_code text;
alter table nutrition_foods add column if not exists is_branded boolean not null default false;
alter table nutrition_foods add column if not exists completeness_score numeric not null default 0;
alter table nutrition_foods add column if not exists external_updated_at timestamptz;
create unique index if not exists nutrition_foods_source_idx on nutrition_foods (source, coalesce(source_id, id));
create unique index if not exists nutrition_foods_barcode_idx on nutrition_foods (barcode) where barcode is not null;
create index if not exists nutrition_foods_name_search_idx on nutrition_foods using gin (to_tsvector('simple', coalesce(display_name, name)));
create index if not exists nutrition_foods_name_trgm_idx on nutrition_foods using gin (lower(coalesce(display_name, name)) gin_trgm_ops);
create index if not exists nutrition_foods_brand_trgm_idx on nutrition_foods using gin (lower(coalesce(brand, '')) gin_trgm_ops);

create table if not exists nutrition_food_sources_raw (
  source text not null,
  source_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (source, source_id)
);

create table if not exists nutrition_brand_watchlist (
  brand text primary key,
  priority integer not null default 100,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists nutrition_missing_food_queue (
  id text primary key,
  query text,
  barcode text,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table nutrition_missing_food_queue add column if not exists attempts integer not null default 0;
alter table nutrition_missing_food_queue add column if not exists processing_started_at timestamptz;
alter table nutrition_missing_food_queue add column if not exists processed_at timestamptz;
alter table nutrition_missing_food_queue add column if not exists last_error text;
create index if not exists nutrition_missing_food_queue_status_idx on nutrition_missing_food_queue (status, created_at desc);

create table if not exists nutrition_goals (
  user_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists nutrition_diaries (
  id text primary key,
  user_id text not null,
  diary_date date not null,
  target_calories numeric not null,
  target_water_ml numeric not null default 0,
  water_intake_ml numeric not null default 0,
  meal_definitions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, diary_date)
);
alter table nutrition_diaries add column if not exists target_water_ml numeric not null default 0;
alter table nutrition_diaries add column if not exists water_intake_ml numeric not null default 0;
alter table nutrition_diaries add column if not exists meal_definitions jsonb not null default '[]'::jsonb;
create index if not exists nutrition_diaries_user_date_idx on nutrition_diaries (user_id, diary_date desc);

create table if not exists nutrition_diary_items (
  id text primary key,
  diary_id text not null references nutrition_diaries(id) on delete cascade,
  payload jsonb not null,
  meal_type text not null,
  consumed_at timestamptz not null
);
create index if not exists nutrition_diary_items_diary_meal_idx on nutrition_diary_items (diary_id, meal_type, consumed_at desc);

create table if not exists nutrition_meal_plans (
  user_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists nutrition_user_foods_custom (
  id text primary key,
  user_id text not null,
  name text not null,
  normalized_name text not null,
  brand text,
  barcode text,
  base_unit text not null default 'g',
  serving_description text,
  serving_grams numeric,
  unit_grams numeric,
  calories_per100 numeric not null default 0,
  protein_per100 numeric not null default 0,
  carbs_per100 numeric not null default 0,
  fat_per100 numeric not null default 0,
  fiber_per100 numeric not null default 0,
  sodium_per100 numeric not null default 0,
  confidence_score numeric not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nutrition_user_foods_custom_user_name_idx
  on nutrition_user_foods_custom (user_id, normalized_name);
create index if not exists nutrition_user_foods_custom_user_barcode_idx
  on nutrition_user_foods_custom (user_id, barcode);
`;

interface ListFoodsOptions {
  includeInternal?: boolean;
}

interface ListDiaryHistoryOptions {
  limit?: number;
  offset?: number;
}

interface CustomFoodRow {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  base_unit: string;
  serving_description: string | null;
  serving_grams: string | null;
  unit_grams: string | null;
  calories_per100: string;
  protein_per100: string;
  carbs_per100: string;
  fat_per100: string;
  fiber_per100: string;
  sodium_per100: string;
  confidence_score: string;
}

interface LegacyCustomFoodRow {
  id: string;
  source_id: string;
  name: string;
  display_name: string | null;
  brand: string | null;
  barcode: string | null;
  payload: FoodItem | null;
}

interface DiaryListResult {
  diaries: DiaryRecord[];
  total: number;
}

interface MissingFoodQueueRow {
  id: string;
  query: string | null;
  barcode: string | null;
  reason: string;
  status: MissingFoodLookupStatus;
  attempts: number;
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processed_at: string | null;
  last_error: string | null;
}

export type NutritionStorageResponse = "database" | "memory";
type QueryExecutor = Pick<Pool, "query">;

function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_POOLER_URL ??
    ""
  );
}

function hasDatabaseUrl(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getNutritionStorageResponse(): NutritionStorageResponse {
  return hasDatabaseUrl() ? "database" : "memory";
}

export function getNutritionStorageHeaders(): HeadersInit {
  return {
    "x-nutrition-storage": getNutritionStorageResponse(),
  };
}

function normalizeFoodLookupValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[^\w\s]/g, " ")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function numberOrUndefined(value: string | null): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  return Number(value);
}

function mapMissingFoodQueueRow(row: MissingFoodQueueRow): MissingFoodLookupRecord {
  return {
    id: row.id,
    query: row.query ?? undefined,
    barcode: row.barcode ?? undefined,
    reason: row.reason,
    status: row.status,
    attempts: Number(row.attempts ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processingStartedAt: row.processing_started_at,
    processedAt: row.processed_at,
    lastError: row.last_error,
  };
}

function mapCustomFoodRow(row: CustomFoodRow): FoodItem {
  return {
    id: row.id,
    source: "custom",
    name: row.name,
    displayName: row.name,
    brand: row.brand ?? undefined,
    barcode: row.barcode ?? undefined,
    baseUnit: (row.base_unit || "g") as FoodBaseUnit,
    servingDescription: row.serving_description ?? undefined,
    servingGrams: numberOrUndefined(row.serving_grams),
    unitGrams: numberOrUndefined(row.unit_grams),
    caloriesPer100: Number(row.calories_per100),
    proteinPer100: Number(row.protein_per100),
    carbsPer100: Number(row.carbs_per100),
    fatPer100: Number(row.fat_per100),
    fiberPer100: Number(row.fiber_per100),
    sodiumPer100: Number(row.sodium_per100),
    confidenceScore: Number(row.confidence_score),
    mealCategories: [],
  };
}

function sanitizeCustomFood(food: FoodItem): FoodItem {
  return {
    ...food,
    source: "custom",
    displayName: food.displayName ?? food.name,
    baseUnit: food.baseUnit ?? "g",
    confidenceScore: food.confidenceScore ?? 3,
    mealCategories: food.mealCategories ?? [],
  };
}

function buildPersistedCustomFoodValues(userId: string, food: FoodItem): Array<string | number | null> {
  const customFood = sanitizeCustomFood(food);
  const displayName = customFood.displayName ?? customFood.name;

  return [
    customFood.id,
    userId,
    displayName,
    normalizeFoodLookupValue(displayName),
    customFood.brand ?? null,
    customFood.barcode ?? null,
    customFood.baseUnit,
    customFood.servingDescription ?? null,
    customFood.servingGrams ?? null,
    customFood.unitGrams ?? null,
    customFood.caloriesPer100 ?? 0,
    customFood.proteinPer100 ?? 0,
    customFood.carbsPer100 ?? 0,
    customFood.fatPer100 ?? 0,
    customFood.fiberPer100 ?? 0,
    customFood.sodiumPer100 ?? 0,
    customFood.confidenceScore,
  ];
}

async function persistCustomFood(
  executor: QueryExecutor,
  userId: string,
  food: FoodItem,
  preserveExisting = false,
): Promise<FoodItem> {
  const customFood = sanitizeCustomFood(food);
  await executor.query(
    `
    insert into nutrition_user_foods_custom (
      id,
      user_id,
      name,
      normalized_name,
      brand,
      barcode,
      base_unit,
      serving_description,
      serving_grams,
      unit_grams,
      calories_per100,
      protein_per100,
      carbs_per100,
      fat_per100,
      fiber_per100,
      sodium_per100,
      confidence_score
    )
    values (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    on conflict (id) do ${
      preserveExisting
        ? "nothing"
        : `update set
      name = excluded.name,
      normalized_name = excluded.normalized_name,
      brand = excluded.brand,
      barcode = excluded.barcode,
      base_unit = excluded.base_unit,
      serving_description = excluded.serving_description,
      serving_grams = excluded.serving_grams,
      unit_grams = excluded.unit_grams,
      calories_per100 = excluded.calories_per100,
      protein_per100 = excluded.protein_per100,
      carbs_per100 = excluded.carbs_per100,
      fat_per100 = excluded.fat_per100,
      fiber_per100 = excluded.fiber_per100,
      sodium_per100 = excluded.sodium_per100,
      confidence_score = excluded.confidence_score,
      updated_at = now()`
    }
    `,
    buildPersistedCustomFoodValues(userId, customFood),
  );

  return customFood;
}

function mapLegacyCustomFoodRow(row: LegacyCustomFoodRow): { userId: string; food: FoodItem } {
  const payload = row.payload ? sanitizeCustomFood(row.payload) : null;
  const fallbackName = row.display_name ?? row.name ?? payload?.displayName ?? payload?.name ?? row.id;

  return {
    userId: row.source_id,
    food: sanitizeCustomFood({
      ...(payload ?? {
        id: row.id,
        source: "custom",
        name: fallbackName,
        displayName: fallbackName,
        baseUnit: "g",
        confidenceScore: 3,
        mealCategories: [],
      }),
      id: row.id,
      source: "custom",
      sourceId: row.source_id,
      name: row.name ?? payload?.name ?? fallbackName,
      displayName: fallbackName,
      brand: row.brand ?? payload?.brand,
      barcode: row.barcode ?? payload?.barcode,
    }),
  };
}

function migrateLegacyCustomFoodsInMemory(): void {
  const store = getNutritionMemoryStore();
  for (const [key, food] of Array.from(store.cachedFoods.entries())) {
    if (food.source !== "custom" || !food.sourceId) {
      continue;
    }

    store.userCustomFoods.set(customFoodKey(food.sourceId, food.id), sanitizeCustomFood(food));
    store.cachedFoods.delete(key);
  }
}

function dedupeFoodsById(foods: FoodItem[]): FoodItem[] {
  const seen = new Set<string>();
  return foods.filter((food) => {
    if (seen.has(food.id)) {
      return false;
    }
    seen.add(food.id);
    return true;
  });
}

async function listRuntimeCatalogFoods(includeInternal: boolean): Promise<FoodItem[]> {
  const publicCatalogFoods = await listPublicCatalogFoods();
  const curatedFoods = includeInternal ? [...INTERNAL_FOODS, ...SUPPLEMENT_FOODS, ...TACO_FOODS] : [];
  return dedupeFoodsById([...publicCatalogFoods, ...curatedFoods]);
}

function cloneMealDefinitions(mealDefinitions: MealDefinition[] | undefined): MealDefinition[] {
  if (!mealDefinitions?.length) {
    return getDefaultMealDefinitions();
  }

  return mealDefinitions.map((definition) => ({ ...definition }));
}

function ensureMealDefinitions(
  mealDefinitions: MealDefinition[] | undefined,
  items: DiaryItemSnapshot[] = [],
): MealDefinition[] {
  const definitions = cloneMealDefinitions(mealDefinitions);
  const knownKeys = new Set(definitions.map((definition) => definition.key));

  for (const item of items) {
    if (knownKeys.has(item.mealType)) {
      continue;
    }

    definitions.push({
      key: item.mealType,
      label: getMealLabel(item.mealType, item.mealLabel),
    });
    knownKeys.add(item.mealType);
  }

  return definitions;
}

function getPool(): Pool {
  if (!globalPgState.__nutritionPool__) {
    globalPgState.__nutritionPool__ = new Pool({
      connectionString: getDatabaseUrl(),
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
    });
  }

  return globalPgState.__nutritionPool__;
}

function inferCompletenessScore(food: FoodItem): number {
  if (food.completenessScore != null) {
    return food.completenessScore;
  }

  return [
    food.caloriesPer100,
    food.proteinPer100,
    food.carbsPer100,
    food.fatPer100,
    food.fiberPer100,
    food.sodiumPer100,
  ].filter((value) => value !== undefined).length / 6;
}

async function seedBrandWatchlist(): Promise<void> {
  if (!hasDatabaseUrl()) return;

  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const brand of RUNTIME_BRAND_WATCHLIST) {
      await client.query(
        `
        insert into nutrition_brand_watchlist (brand)
        values ($1)
        on conflict (brand) do nothing
        `,
        [brand],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function backfillLegacyCustomFoods(): Promise<void> {
  if (!hasDatabaseUrl()) return;

  const legacyRows = await getPool().query<LegacyCustomFoodRow>(
    `
    select
      id,
      source_id,
      name,
      display_name,
      brand,
      barcode,
      payload
    from nutrition_foods
    where source = 'custom' and source_id is not null
    `,
  );

  if (!legacyRows.rows.length) {
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const row of legacyRows.rows) {
      const { userId, food } = mapLegacyCustomFoodRow(row);
      await persistCustomFood(client, userId, food, true);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSchema(): Promise<void> {
  if (!hasDatabaseUrl()) return;
  if (!globalPgState.__nutritionSchemaPromise__) {
    globalPgState.__nutritionSchemaPromise__ = getPool()
      .query(SCHEMA_SQL)
      .then(() => seedBrandWatchlist())
      .then(() => backfillLegacyCustomFoods())
      .then(() => undefined);
  }
  await globalPgState.__nutritionSchemaPromise__;
}

export async function listFoods({ includeInternal = true }: ListFoodsOptions = {}): Promise<FoodItem[]> {
  const runtimeCatalogFoods = await listRuntimeCatalogFoods(includeInternal);

  if (!hasDatabaseUrl()) {
    migrateLegacyCustomFoodsInMemory();
    const store = getNutritionMemoryStore();
    const cachedFoods = Array.from(store.cachedFoods.values()).filter((food) => food.source !== "custom");
    return dedupeFoodsById([...cachedFoods, ...runtimeCatalogFoods]);
  }

  await ensureSchema();
  return runtimeCatalogFoods;
}

export async function upsertFoods(foods: FoodItem[]): Promise<void> {
  const publicFoods = foods.filter((food) => food.source !== "custom");
  if (!publicFoods.length) return;

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    for (const food of publicFoods) {
      store.cachedFoods.set(food.id, food);
    }
    return;
  }

  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const food of publicFoods) {
      const sourceId = food.sourceId ?? food.id;
      await client.query(
        `
        insert into nutrition_foods (
          id,
          source,
          source_id,
          name,
          display_name,
          brand,
          barcode,
          locale,
          country_code,
          is_branded,
          completeness_score,
          external_updated_at,
          payload,
          confidence_score
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
        on conflict (id) do update set
          source = excluded.source,
          source_id = excluded.source_id,
          name = excluded.name,
          display_name = excluded.display_name,
          brand = excluded.brand,
          barcode = excluded.barcode,
          locale = excluded.locale,
          country_code = excluded.country_code,
          is_branded = excluded.is_branded,
          completeness_score = excluded.completeness_score,
          external_updated_at = excluded.external_updated_at,
          payload = excluded.payload,
          confidence_score = excluded.confidence_score,
          updated_at = now()
        `,
        [
          food.id,
          food.source,
          food.sourceId ?? null,
          food.name,
          food.displayName ?? food.name,
          food.brand ?? null,
          food.barcode ?? null,
          food.locale ?? null,
          food.countryCode ?? null,
          food.isBranded ?? false,
          inferCompletenessScore(food),
          food.externalUpdatedAt ?? null,
          JSON.stringify(food),
          food.confidenceScore,
        ],
      );

      await client.query(
        `
        insert into nutrition_food_sources_raw (source, source_id, payload)
        values ($1, $2, $3::jsonb)
        on conflict (source, source_id) do update set payload = excluded.payload, fetched_at = now()
        `,
        [food.source, sourceId, JSON.stringify(food)],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listUserCustomFoods(userId: string): Promise<FoodItem[]> {
  if (!hasDatabaseUrl()) {
    migrateLegacyCustomFoodsInMemory();
    const store = getNutritionMemoryStore();
    return Array.from(store.userCustomFoods.entries())
      .filter(([key]) => key.startsWith(`custom-food:${userId}:`))
      .map(([, food]) => sanitizeCustomFood(food));
  }

  await ensureSchema();
  const result = await getPool().query<CustomFoodRow>(
    `
    select
      id,
      user_id,
      name,
      brand,
      barcode,
      base_unit,
      serving_description,
      serving_grams::text,
      unit_grams::text,
      calories_per100::text,
      protein_per100::text,
      carbs_per100::text,
      fat_per100::text,
      fiber_per100::text,
      sodium_per100::text,
      confidence_score::text
    from nutrition_user_foods_custom
    where user_id = $1
    order by updated_at desc, name asc
    `,
    [userId],
  );

  return result.rows.map((row) => mapCustomFoodRow(row));
}

export async function listAccessibleFoods(
  userId: string,
  { includeInternal = true }: ListFoodsOptions = {},
): Promise<FoodItem[]> {
  const [publicFoods, customFoods] = await Promise.all([
    listFoods({ includeInternal }),
    listUserCustomFoods(userId),
  ]);

  return dedupeFoodsById([...customFoods, ...publicFoods]);
}

export async function findAccessibleFoodById(
  userId: string,
  foodId: string,
  { includeInternal = true }: ListFoodsOptions = {},
): Promise<FoodItem | null> {
  const foods = await listAccessibleFoods(userId, { includeInternal });
  return foods.find((food) => food.id === foodId) ?? null;
}

export async function saveUserCustomFood(userId: string, food: FoodItem): Promise<FoodItem> {
  const customFood = sanitizeCustomFood(food);

  if (!hasDatabaseUrl()) {
    migrateLegacyCustomFoodsInMemory();
    const store = getNutritionMemoryStore();
    store.userCustomFoods.set(customFoodKey(userId, customFood.id), customFood);
    store.cachedFoods.delete(customFood.id);
    return customFood;
  }

  await ensureSchema();
  return persistCustomFood(getPool(), userId, customFood);
}

export async function queueMissingFoodLookup({
  query,
  barcode,
  reason,
}: MissingFoodLookupInput): Promise<MissingFoodLookupRecord> {
  const id = buildMissingFoodLookupId({ query, barcode });
  const now = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const existingLookup = store.missingFoodLookups.get(id);
    const nextLookup: MissingFoodLookupRecord = {
      id,
      query: query ?? existingLookup?.query,
      barcode: barcode ?? existingLookup?.barcode,
      reason,
      status: "pending",
      attempts: existingLookup?.attempts ?? 0,
      createdAt: existingLookup?.createdAt ?? now,
      updatedAt: now,
      processingStartedAt: null,
      processedAt: null,
      lastError: null,
    };

    store.missingFoodLookups.set(id, nextLookup);
    return nextLookup;
  }

  await ensureSchema();
  const result = await getPool().query<MissingFoodQueueRow>(
    `
    insert into nutrition_missing_food_queue (
      id,
      query,
      barcode,
      reason,
      status,
      processed_at,
      last_error
    )
    values ($1, $2, $3, $4, 'pending', null, null)
    on conflict (id) do update set
      query = coalesce(excluded.query, nutrition_missing_food_queue.query),
      barcode = coalesce(excluded.barcode, nutrition_missing_food_queue.barcode),
      reason = excluded.reason,
      status = 'pending',
      processed_at = null,
      last_error = null,
      updated_at = now()
    returning
      id,
      query,
      barcode,
      reason,
      status,
      attempts,
      created_at::text,
      updated_at::text,
      processing_started_at::text,
      processed_at::text,
      last_error
    `,
    [id, query ?? null, barcode ?? null, reason],
  );

  return mapMissingFoodQueueRow(result.rows[0]);
}

export async function claimMissingFoodLookups(limit = 5): Promise<MissingFoodLookupRecord[]> {
  const normalizedLimit = Math.max(1, Math.min(25, Math.trunc(limit || 1)));

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const now = new Date().toISOString();
    const staleThreshold = Date.now() - MISSING_FOOD_LOOKUP_PROCESSING_TIMEOUT_MS;
    const pendingLookups = Array.from(store.missingFoodLookups.values())
      .filter((lookup) => {
        if (lookup.attempts >= MISSING_FOOD_LOOKUP_MAX_ATTEMPTS) {
          return false;
        }

        if (lookup.status === "pending") {
          return true;
        }

        if (lookup.status !== "processing" || !lookup.processingStartedAt) {
          return false;
        }

        return Date.parse(lookup.processingStartedAt) <= staleThreshold;
      })
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, normalizedLimit)
      .map((lookup) => ({
        ...lookup,
        status: "processing" as const,
        attempts: lookup.attempts + 1,
        updatedAt: now,
        processingStartedAt: now,
        lastError: null,
      }));

    for (const lookup of pendingLookups) {
      store.missingFoodLookups.set(lookup.id, lookup);
    }

    return pendingLookups;
  }

  await ensureSchema();
  const result = await getPool().query<MissingFoodQueueRow>(
    `
    with next_lookups as (
      select id
      from nutrition_missing_food_queue
      where
        attempts < $2
        and (
          status = 'pending'
          or (
            status = 'processing'
            and processing_started_at is not null
            and processing_started_at < now() - ($3 * interval '1 millisecond')
          )
        )
      order by created_at asc
      limit $1
      for update skip locked
    )
    update nutrition_missing_food_queue as queue
    set
      status = 'processing',
      attempts = queue.attempts + 1,
      processing_started_at = now(),
      processed_at = null,
      updated_at = now(),
      last_error = null
    from next_lookups
    where queue.id = next_lookups.id
    returning
      queue.id,
      queue.query,
      queue.barcode,
      queue.reason,
      queue.status,
      queue.attempts,
      queue.created_at::text,
      queue.updated_at::text,
      queue.processing_started_at::text,
      queue.processed_at::text,
      queue.last_error
    `,
    [normalizedLimit, MISSING_FOOD_LOOKUP_MAX_ATTEMPTS, MISSING_FOOD_LOOKUP_PROCESSING_TIMEOUT_MS],
  );

  return result.rows.map((row) => mapMissingFoodQueueRow(row));
}

export async function completeMissingFoodLookup(
  id: string,
  status: Extract<MissingFoodLookupStatus, "completed" | "failed" | "no_match">,
  lastError?: string | null,
): Promise<void> {
  const now = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const existingLookup = store.missingFoodLookups.get(id);
    if (!existingLookup) {
      return;
    }

    store.missingFoodLookups.set(id, {
      ...existingLookup,
      status,
      updatedAt: now,
      processingStartedAt: existingLookup.processingStartedAt ?? now,
      processedAt: now,
      lastError: lastError ?? null,
    });
    return;
  }

  await ensureSchema();
  await getPool().query(
    `
    update nutrition_missing_food_queue
    set
      status = $2,
      processing_started_at = null,
      updated_at = now(),
      processed_at = now(),
      last_error = $3
    where id = $1
    `,
    [id, status, lastError ?? null],
  );
}

export async function retryMissingFoodLookup(id: string, lastError?: string | null): Promise<void> {
  const now = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const existingLookup = store.missingFoodLookups.get(id);
    if (!existingLookup) {
      return;
    }

    store.missingFoodLookups.set(id, {
      ...existingLookup,
      status: "pending",
      updatedAt: now,
      processingStartedAt: null,
      processedAt: null,
      lastError: lastError ?? null,
    });
    return;
  }

  await ensureSchema();
  await getPool().query(
    `
    update nutrition_missing_food_queue
    set
      status = 'pending',
      updated_at = now(),
      processing_started_at = null,
      processed_at = null,
      last_error = $2
    where id = $1
    `,
    [id, lastError ?? null],
  );
}

export async function getGoal(userId: string, defaultGoal: NutritionGoal): Promise<NutritionGoal> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    return store.goals.get(userId) ?? defaultGoal;
  }

  await ensureSchema();
  const result = await getPool().query<{ payload: NutritionGoal }>(
    "select payload from nutrition_goals where user_id = $1 limit 1",
    [userId],
  );
  return result.rows[0]?.payload ?? defaultGoal;
}

export async function saveGoal(goal: NutritionGoal): Promise<NutritionGoal> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    store.goals.set(goal.userId, goal);
    return goal;
  }

  await ensureSchema();
  await getPool().query(
    `
    insert into nutrition_goals (user_id, payload)
    values ($1, $2::jsonb)
    on conflict (user_id) do update set payload = excluded.payload, updated_at = now()
    `,
    [goal.userId, JSON.stringify(goal)],
  );
  return goal;
}

export async function getOrCreateDiary(
  userId: string,
  date: string,
  targetCalories: number,
  targetWaterMl: number,
): Promise<DiaryRecord> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const key = diaryKey(userId, date);
    const existing = store.diaries.get(key);
    if (existing) {
      if (existing.targetCalories !== targetCalories || existing.targetWaterMl !== targetWaterMl) {
        const refreshedDiary: DiaryRecord = {
          ...existing,
          targetCalories,
          targetWaterMl,
          mealDefinitions: ensureMealDefinitions(existing.mealDefinitions, existing.items),
        };
        store.diaries.set(key, refreshedDiary);
        return refreshedDiary;
      }

      return {
        ...existing,
        mealDefinitions: ensureMealDefinitions(existing.mealDefinitions, existing.items),
      };
    }

    const diary = {
      id: crypto.randomUUID(),
      userId,
      date,
      targetCalories,
      targetWaterMl,
      waterIntakeMl: 0,
      mealDefinitions: getDefaultMealDefinitions(),
      items: [],
    } satisfies DiaryRecord;
    store.diaries.set(key, diary);
    return diary;
  }

  await ensureSchema();
  const existing = await getPool().query<{
    id: string;
    user_id: string;
    diary_date: string;
    target_calories: string;
    target_water_ml: string;
    water_intake_ml: string;
    meal_definitions: MealDefinition[];
  }>(
    `
    insert into nutrition_diaries (id, user_id, diary_date, target_calories, target_water_ml)
    values ($1, $2, $3, $4, $5)
    on conflict (user_id, diary_date) do update set
      target_calories = excluded.target_calories,
      target_water_ml = excluded.target_water_ml
    returning id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml, meal_definitions
    `,
    [crypto.randomUUID(), userId, date, targetCalories, targetWaterMl],
  );

  const diaryRow = existing.rows[0];
  const itemsResult = await getPool().query<{ payload: DiaryItemSnapshot }>(
    "select payload from nutrition_diary_items where diary_id = $1 order by consumed_at asc",
    [diaryRow.id],
  );
  const items = itemsResult.rows.map((row: { payload: DiaryItemSnapshot }) => row.payload);

  return {
    id: diaryRow.id,
    userId: diaryRow.user_id,
    date: diaryRow.diary_date,
    targetCalories: Number(diaryRow.target_calories),
    targetWaterMl: Number(diaryRow.target_water_ml),
    waterIntakeMl: Number(diaryRow.water_intake_ml),
    mealDefinitions: ensureMealDefinitions(diaryRow.meal_definitions as MealDefinition[] | undefined, items),
    items,
  };
}

export async function saveDiaryItem(
  userId: string,
  date: string,
  targetCalories: number,
  targetWaterMl: number,
  item: DiaryItemSnapshot,
): Promise<DiaryRecord> {
  const diary = await getOrCreateDiary(userId, date, targetCalories, targetWaterMl);

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const key = diaryKey(userId, date);
    const mealDefinitions = ensureMealDefinitions(diary.mealDefinitions, [item]);
    const nextDiary: DiaryRecord = {
      ...diary,
      mealDefinitions,
      items: [...diary.items, item].sort((left, right) => left.consumedAt.localeCompare(right.consumedAt)),
    };
    store.diaries.set(key, nextDiary);
    return nextDiary;
  }

  if (!diary.mealDefinitions.some((definition) => definition.key === item.mealType)) {
    await updateDiaryMealDefinitions(
      userId,
      date,
      targetCalories,
      targetWaterMl,
      ensureMealDefinitions(diary.mealDefinitions, [item]),
    );
  }

  await getPool().query(
    `
    insert into nutrition_diary_items (id, diary_id, payload, meal_type, consumed_at)
    values ($1, $2, $3::jsonb, $4, $5)
    `,
    [item.id, diary.id, JSON.stringify(item), item.mealType, item.consumedAt],
  );

  return getOrCreateDiary(userId, date, targetCalories, targetWaterMl);
}

export async function updateDiaryWater(
  userId: string,
  date: string,
  targetCalories: number,
  targetWaterMl: number,
  waterIntakeMl: number,
): Promise<DiaryRecord> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const currentDiary = await getOrCreateDiary(userId, date, targetCalories, targetWaterMl);
    const nextDiary: DiaryRecord = {
      ...currentDiary,
      waterIntakeMl,
      mealDefinitions: ensureMealDefinitions(currentDiary.mealDefinitions, currentDiary.items),
    };
    store.diaries.set(diaryKey(userId, date), nextDiary);
    return nextDiary;
  }

  await ensureSchema();
  const result = await getPool().query<{
    id: string;
    user_id: string;
    diary_date: string;
    target_calories: string;
    target_water_ml: string;
    water_intake_ml: string;
    meal_definitions: MealDefinition[];
  }>(
    `
    insert into nutrition_diaries (id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (user_id, diary_date) do update set
      target_calories = excluded.target_calories,
      target_water_ml = excluded.target_water_ml,
      water_intake_ml = excluded.water_intake_ml
    returning id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml, meal_definitions
    `,
    [crypto.randomUUID(), userId, date, targetCalories, targetWaterMl, waterIntakeMl],
  );

  const diaryRow = result.rows[0];
  const itemsResult = await getPool().query<{ payload: DiaryItemSnapshot }>(
    "select payload from nutrition_diary_items where diary_id = $1 order by consumed_at asc",
    [diaryRow.id],
  );
  const items = itemsResult.rows.map((row: { payload: DiaryItemSnapshot }) => row.payload);

  return {
    id: diaryRow.id,
    userId: diaryRow.user_id,
    date: diaryRow.diary_date,
    targetCalories: Number(diaryRow.target_calories),
    targetWaterMl: Number(diaryRow.target_water_ml),
    waterIntakeMl: Number(diaryRow.water_intake_ml),
    mealDefinitions: ensureMealDefinitions(diaryRow.meal_definitions as MealDefinition[] | undefined, items),
    items,
  };
}

export async function updateDiaryMealDefinitions(
  userId: string,
  date: string,
  targetCalories: number,
  targetWaterMl: number,
  mealDefinitions: MealDefinition[],
): Promise<DiaryRecord> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const currentDiary = await getOrCreateDiary(userId, date, targetCalories, targetWaterMl);
    const nextDiary: DiaryRecord = {
      ...currentDiary,
      mealDefinitions: ensureMealDefinitions(mealDefinitions, currentDiary.items),
    };
    store.diaries.set(diaryKey(userId, date), nextDiary);
    return nextDiary;
  }

  await ensureSchema();
  await getPool().query(
    `
    insert into nutrition_diaries (id, user_id, diary_date, target_calories, target_water_ml, meal_definitions)
    values ($1, $2, $3, $4, $5, $6::jsonb)
    on conflict (user_id, diary_date) do update set
      target_calories = excluded.target_calories,
      target_water_ml = excluded.target_water_ml,
      meal_definitions = excluded.meal_definitions
    `,
    [crypto.randomUUID(), userId, date, targetCalories, targetWaterMl, JSON.stringify(mealDefinitions)],
  );

  return getOrCreateDiary(userId, date, targetCalories, targetWaterMl);
}

export async function listDiaryHistory(
  userId: string,
  { limit = 7, offset = 0 }: ListDiaryHistoryOptions = {},
): Promise<DiaryListResult> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const diaries = Array.from(store.diaries.values())
      .filter((diary) => diary.userId === userId)
      .sort((left, right) => right.date.localeCompare(left.date));

    return {
      diaries: diaries.slice(offset, offset + limit),
      total: diaries.length,
    };
  }

  await ensureSchema();
  const totalResult = await getPool().query<{ count: string }>(
    "select count(*)::text as count from nutrition_diaries where user_id = $1",
    [userId],
  );
  const diaryResult = await getPool().query<{
    id: string;
    user_id: string;
    diary_date: string;
    target_calories: string;
    target_water_ml: string;
    water_intake_ml: string;
    meal_definitions: MealDefinition[];
  }>(
    `
    select id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml, meal_definitions
    from nutrition_diaries
    where user_id = $1
    order by diary_date desc
    limit $2 offset $3
    `,
    [userId, limit, offset],
  );

  const diaryIds = diaryResult.rows.map((row) => row.id);
  const itemsByDiary = new Map<string, DiaryItemSnapshot[]>();

  if (diaryIds.length) {
    const itemsResult = await getPool().query<{ diary_id: string; payload: DiaryItemSnapshot }>(
      `
      select diary_id, payload
      from nutrition_diary_items
      where diary_id = any($1::text[])
      order by consumed_at desc
      `,
      [diaryIds],
    );

    for (const row of itemsResult.rows) {
      const items = itemsByDiary.get(row.diary_id) ?? [];
      items.push(row.payload);
      itemsByDiary.set(row.diary_id, items);
    }
  }

  return {
    diaries: diaryResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      date: row.diary_date,
      targetCalories: Number(row.target_calories),
      targetWaterMl: Number(row.target_water_ml),
      waterIntakeMl: Number(row.water_intake_ml),
      mealDefinitions: ensureMealDefinitions(row.meal_definitions as MealDefinition[] | undefined, itemsByDiary.get(row.id) ?? []),
      items: itemsByDiary.get(row.id) ?? [],
    })),
    total: Number(totalResult.rows[0]?.count ?? 0),
  };
}

export async function replaceDiaryItem(userId: string, itemId: string, nextItem: DiaryItemSnapshot): Promise<DiaryRecord | null> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    for (const [key, diary] of store.diaries.entries()) {
      if (diary.userId !== userId) {
        continue;
      }

      const index = diary.items.findIndex((item) => item.id === itemId);
      if (index >= 0) {
        const items = [...diary.items];
        items[index] = {
          ...nextItem,
          id: itemId,
          diaryId: diary.id,
        };
        const nextDiary = {
          ...diary,
          mealDefinitions: ensureMealDefinitions(diary.mealDefinitions, items),
          items,
        };
        store.diaries.set(key, nextDiary);
        return nextDiary;
      }
    }
    return null;
  }

  await ensureSchema();
  const diaryResult = await getPool().query<{
    diary_id: string;
    user_id: string;
    diary_date: string;
    target_calories: string;
    target_water_ml: string;
  }>(
    `
    select diary.id as diary_id, diary.user_id, diary.diary_date, diary.target_calories, diary.target_water_ml
    from nutrition_diary_items item
    inner join nutrition_diaries diary on diary.id = item.diary_id
    where item.id = $1 and diary.user_id = $2
    limit 1
    `,
    [itemId, userId],
  );
  const diaryRow = diaryResult.rows[0];
  if (!diaryRow) return null;

  const nextPayload = {
    ...nextItem,
    id: itemId,
    diaryId: diaryRow.diary_id,
  } satisfies DiaryItemSnapshot;

  const currentDiary = await getOrCreateDiary(
    diaryRow.user_id,
    diaryRow.diary_date,
    Number(diaryRow.target_calories),
    Number(diaryRow.target_water_ml),
  );

  if (!currentDiary.mealDefinitions.some((definition) => definition.key === nextPayload.mealType)) {
    await updateDiaryMealDefinitions(
      diaryRow.user_id,
      diaryRow.diary_date,
      Number(diaryRow.target_calories),
      Number(diaryRow.target_water_ml),
      ensureMealDefinitions(currentDiary.mealDefinitions, [nextPayload]),
    );
  }

  await getPool().query(
    `
    update nutrition_diary_items
    set payload = $3::jsonb, meal_type = $4, consumed_at = $5
    where id = $1 and diary_id = $2
    `,
    [itemId, diaryRow.diary_id, JSON.stringify(nextPayload), nextPayload.mealType, nextPayload.consumedAt],
  );

  return getOrCreateDiary(
    diaryRow.user_id,
    diaryRow.diary_date,
    Number(diaryRow.target_calories),
    Number(diaryRow.target_water_ml),
  );
}

export async function removeDiaryItem(userId: string, itemId: string): Promise<DiaryRecord | null> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    for (const [key, diary] of store.diaries.entries()) {
      if (diary.userId !== userId) {
        continue;
      }

      const nextItems = diary.items.filter((item) => item.id !== itemId);
      if (nextItems.length !== diary.items.length) {
        const nextDiary = { ...diary, items: nextItems };
        store.diaries.set(key, nextDiary);
        return nextDiary;
      }
    }
    return null;
  }

  await ensureSchema();
  const diaryResult = await getPool().query<{
    diary_id: string;
    user_id: string;
    diary_date: string;
    target_calories: string;
    target_water_ml: string;
  }>(
    `
    select diary.id as diary_id, diary.user_id, diary.diary_date, diary.target_calories, diary.target_water_ml
    from nutrition_diary_items item
    inner join nutrition_diaries diary on diary.id = item.diary_id
    where item.id = $1 and diary.user_id = $2
    limit 1
    `,
    [itemId, userId],
  );
  const diaryRow = diaryResult.rows[0];
  if (!diaryRow) return null;

  await getPool().query(
    "delete from nutrition_diary_items where id = $1 and diary_id = $2",
    [itemId, diaryRow.diary_id],
  );

  return getOrCreateDiary(
    diaryRow.user_id,
    diaryRow.diary_date,
    Number(diaryRow.target_calories),
    Number(diaryRow.target_water_ml),
  );
}

export async function saveMealPlan(userId: string, plan: MealPlan): Promise<MealPlan> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    store.mealPlans.set(mealPlanKey(userId), plan);
    return plan;
  }

  await ensureSchema();
  await getPool().query(
    `
    insert into nutrition_meal_plans (user_id, payload)
    values ($1, $2::jsonb)
    on conflict (user_id) do update set payload = excluded.payload, updated_at = now()
    `,
    [userId, JSON.stringify(plan)],
  );
  return plan;
}

export async function deleteMealPlan(userId: string): Promise<void> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    store.mealPlans.delete(mealPlanKey(userId));
    return;
  }

  await ensureSchema();
  await getPool().query("delete from nutrition_meal_plans where user_id = $1", [userId]);
}

export async function getMealPlan(userId: string): Promise<MealPlan | null> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    return store.mealPlans.get(mealPlanKey(userId)) ?? null;
  }

  await ensureSchema();
  const result = await getPool().query<{ payload: MealPlan }>(
    "select payload from nutrition_meal_plans where user_id = $1 limit 1",
    [userId],
  );
  return result.rows[0]?.payload ?? null;
}
