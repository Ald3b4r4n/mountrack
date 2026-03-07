import { Pool } from "pg";
import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import type {
  DiaryItemSnapshot,
  FoodItem,
  MealPlan,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";
import {
  diaryKey,
  getNutritionMemoryStore,
  mealPlanKey,
  type DiaryRecord,
} from "@/modules/nutrition/repositories/memory-store";

const BRAND_WATCHLIST = [
  "Growth",
  "Max Titanium",
  "Integralmédica",
  "Probiótica",
  "DUX",
  "Black Skull",
  "Darkness",
  "Atlhetica",
  "Bodyaction",
  "New Millen",
  "Essential",
];

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
  created_at timestamptz not null default now(),
  unique(user_id, diary_date)
);
alter table nutrition_diaries add column if not exists target_water_ml numeric not null default 0;
alter table nutrition_diaries add column if not exists water_intake_ml numeric not null default 0;
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
`;

interface ListFoodsOptions {
  includeInternal?: boolean;
}

interface ListDiaryHistoryOptions {
  limit?: number;
  offset?: number;
}

interface DiaryListResult {
  diaries: DiaryRecord[];
  total: number;
}

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";
}

function hasDatabaseUrl(): boolean {
  return Boolean(getDatabaseUrl());
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
    for (const brand of BRAND_WATCHLIST) {
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

async function ensureSchema(): Promise<void> {
  if (!hasDatabaseUrl()) return;
  if (!globalPgState.__nutritionSchemaPromise__) {
    globalPgState.__nutritionSchemaPromise__ = getPool()
      .query(SCHEMA_SQL)
      .then(() => seedBrandWatchlist())
      .then(() => undefined);
  }
  await globalPgState.__nutritionSchemaPromise__;
}

export async function listFoods({ includeInternal = true }: ListFoodsOptions = {}): Promise<FoodItem[]> {
  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    const cachedFoods = Array.from(store.cachedFoods.values());
    return includeInternal ? [...cachedFoods, ...INTERNAL_FOODS] : cachedFoods;
  }

  await ensureSchema();
  const result = await getPool().query<{ payload: FoodItem }>("select payload from nutrition_foods");
  const storedFoods = result.rows.map((row: { payload: FoodItem }) => row.payload);
  return includeInternal ? [...storedFoods, ...INTERNAL_FOODS] : storedFoods;
}

export async function upsertFoods(foods: FoodItem[]): Promise<void> {
  if (!foods.length) return;

  if (!hasDatabaseUrl()) {
    const store = getNutritionMemoryStore();
    for (const food of foods) {
      store.cachedFoods.set(food.id, food);
    }
    return;
  }

  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const food of foods) {
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

export async function queueMissingFoodLookup({ query, barcode, reason }: { query?: string; barcode?: string; reason: string }): Promise<void> {
  if (!hasDatabaseUrl()) {
    return;
  }

  await ensureSchema();
  await getPool().query(
    `
    insert into nutrition_missing_food_queue (id, query, barcode, reason)
    values ($1, $2, $3, $4)
    on conflict (id) do update set updated_at = now(), reason = excluded.reason, status = 'pending'
    `,
    [crypto.randomUUID(), query ?? null, barcode ?? null, reason],
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
        };
        store.diaries.set(key, refreshedDiary);
        return refreshedDiary;
      }

      return existing;
    }

    const diary = {
      id: crypto.randomUUID(),
      userId,
      date,
      targetCalories,
      targetWaterMl,
      waterIntakeMl: 0,
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
  }>(
    `
    insert into nutrition_diaries (id, user_id, diary_date, target_calories, target_water_ml)
    values ($1, $2, $3, $4, $5)
    on conflict (user_id, diary_date) do update set
      target_calories = excluded.target_calories,
      target_water_ml = excluded.target_water_ml
    returning id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml
    `,
    [crypto.randomUUID(), userId, date, targetCalories, targetWaterMl],
  );

  const diaryRow = existing.rows[0];
  const itemsResult = await getPool().query<{ payload: DiaryItemSnapshot }>(
    "select payload from nutrition_diary_items where diary_id = $1 order by consumed_at asc",
    [diaryRow.id],
  );

  return {
    id: diaryRow.id,
    userId: diaryRow.user_id,
    date: diaryRow.diary_date,
    targetCalories: Number(diaryRow.target_calories),
    targetWaterMl: Number(diaryRow.target_water_ml),
    waterIntakeMl: Number(diaryRow.water_intake_ml),
    items: itemsResult.rows.map((row: { payload: DiaryItemSnapshot }) => row.payload),
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
    const nextDiary: DiaryRecord = {
      ...diary,
      items: [...diary.items, item].sort((left, right) => left.consumedAt.localeCompare(right.consumedAt)),
    };
    store.diaries.set(key, nextDiary);
    return nextDiary;
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
  }>(
    `
    insert into nutrition_diaries (id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (user_id, diary_date) do update set
      target_calories = excluded.target_calories,
      target_water_ml = excluded.target_water_ml,
      water_intake_ml = excluded.water_intake_ml
    returning id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml
    `,
    [crypto.randomUUID(), userId, date, targetCalories, targetWaterMl, waterIntakeMl],
  );

  const diaryRow = result.rows[0];
  const itemsResult = await getPool().query<{ payload: DiaryItemSnapshot }>(
    "select payload from nutrition_diary_items where diary_id = $1 order by consumed_at asc",
    [diaryRow.id],
  );

  return {
    id: diaryRow.id,
    userId: diaryRow.user_id,
    date: diaryRow.diary_date,
    targetCalories: Number(diaryRow.target_calories),
    targetWaterMl: Number(diaryRow.target_water_ml),
    waterIntakeMl: Number(diaryRow.water_intake_ml),
    items: itemsResult.rows.map((row: { payload: DiaryItemSnapshot }) => row.payload),
  };
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
  }>(
    `
    select id, user_id, diary_date, target_calories, target_water_ml, water_intake_ml
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
        const nextDiary = { ...diary, items };
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
