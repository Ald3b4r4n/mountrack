"use client";

import type {
  DailySummary,
  DiaryHistoryEntry,
  DiaryItemSnapshot,
  MealPlan,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";
import { buildDailySummary } from "@/modules/nutrition/services/daily-calories.service";

interface NutritionBrowserDiary {
  id: string;
  userId: string;
  date: string;
  targetCalories: number;
  targetWaterMl: number;
  waterIntakeMl: number;
  items: DiaryItemSnapshot[];
}

interface NutritionBrowserState {
  goal?: NutritionGoal;
  mealPlan?: MealPlan | null;
  diaries?: Record<string, NutritionBrowserDiary>;
}

export interface NutritionDashboardSnapshot {
  diary: { items: DiaryItemSnapshot[] };
  summary: DailySummary;
  goal: NutritionGoal;
  mealPlan: MealPlan | null;
}

export interface NutritionHistorySnapshot {
  entries: DiaryHistoryEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STORAGE_PREFIX = "mountrack:nutrition:";

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isBrowserReady(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cloneGoal(userId: string, goal: NutritionGoal): NutritionGoal {
  return {
    ...goal,
    userId,
    targetWaterMl: goal.targetWaterMl ?? 2200,
  };
}

function createDiaryRecord(userId: string, date: string, goal: NutritionGoal): NutritionBrowserDiary {
  return {
    id: `${userId}:${date}`,
    userId,
    date,
    targetCalories: goal.targetCalories,
    targetWaterMl: goal.targetWaterMl ?? 2200,
    waterIntakeMl: 0,
    items: [],
  };
}

function resolveGoal(userId: string, state: NutritionBrowserState, defaultGoal: NutritionGoal): NutritionGoal {
  return cloneGoal(userId, state.goal ?? defaultGoal);
}

function ensureDiaries(state: NutritionBrowserState): Record<string, NutritionBrowserDiary> {
  if (!state.diaries) {
    state.diaries = {};
  }

  return state.diaries;
}

function getOrCreateDiary(
  state: NutritionBrowserState,
  userId: string,
  date: string,
  goal: NutritionGoal,
): NutritionBrowserDiary {
  const diaries = ensureDiaries(state);
  const existingDiary = diaries[date];

  if (existingDiary) {
    existingDiary.targetCalories = goal.targetCalories;
    existingDiary.targetWaterMl = goal.targetWaterMl ?? 2200;
    return existingDiary;
  }

  const diary = createDiaryRecord(userId, date, goal);
  diaries[date] = diary;
  return diary;
}

function hasMeaningfulState(state: NutritionBrowserState): boolean {
  if (state.goal || state.mealPlan) {
    return true;
  }

  return Object.values(state.diaries ?? {}).some((diary) => diary.items.length > 0 || diary.waterIntakeMl > 0);
}

function readRawState(userId: string): NutritionBrowserState {
  if (!isBrowserReady()) {
    return {};
  }

  try {
    const rawState = window.localStorage.getItem(getStorageKey(userId));
    if (!rawState) {
      return {};
    }

    const parsedState = JSON.parse(rawState) as NutritionBrowserState;
    return typeof parsedState === "object" && parsedState ? parsedState : {};
  } catch {
    return {};
  }
}

function writeRawState(userId: string, state: NutritionBrowserState): void {
  if (!isBrowserReady()) {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
}

function sortDiaryItems(items: DiaryItemSnapshot[]): DiaryItemSnapshot[] {
  return [...items].sort((left, right) => right.consumedAt.localeCompare(left.consumedAt));
}

export function hasNutritionBrowserSnapshot(userId: string): boolean {
  return hasMeaningfulState(readRawState(userId));
}

export function loadNutritionDashboardFromBrowser(
  userId: string,
  date: string,
  defaultGoal: NutritionGoal,
): NutritionDashboardSnapshot {
  const state = readRawState(userId);
  const goal = resolveGoal(userId, state, defaultGoal);
  const diary = getOrCreateDiary(state, userId, date, goal);

  const summary = buildDailySummary({
    date,
    targetCalories: diary.targetCalories,
    targetWaterMl: diary.targetWaterMl,
    waterIntakeMl: diary.waterIntakeMl,
    items: diary.items,
  });

  return {
    diary: { items: sortDiaryItems(diary.items) },
    summary,
    goal,
    mealPlan: state.mealPlan ?? null,
  };
}

export function loadNutritionHistoryFromBrowser(
  userId: string,
  defaultGoal: NutritionGoal,
  page: number,
  pageSize: number,
): NutritionHistorySnapshot {
  const state = readRawState(userId);
  const goal = resolveGoal(userId, state, defaultGoal);
  const diaries = Object.values(state.diaries ?? {}).sort((left, right) => right.date.localeCompare(left.date));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * pageSize;
  const slice = diaries.slice(offset, offset + pageSize);

  const entries = slice.map((diary) => ({
    date: diary.date,
    itemCount: diary.items.length,
    summary: buildDailySummary({
      date: diary.date,
      targetCalories: diary.targetCalories,
      targetWaterMl: diary.targetWaterMl || goal.targetWaterMl || defaultGoal.targetWaterMl || 2200,
      waterIntakeMl: diary.waterIntakeMl,
      items: diary.items,
    }),
  }));

  return {
    entries,
    page: safePage,
    pageSize,
    total: diaries.length,
    totalPages: Math.max(1, Math.ceil(diaries.length / pageSize)),
  };
}

export function seedNutritionBrowserFromDashboard(
  userId: string,
  date: string,
  payload: Partial<NutritionDashboardSnapshot>,
  defaultGoal: NutritionGoal,
): void {
  const state = readRawState(userId);
  if (hasMeaningfulState(state)) {
    return;
  }

  const goal = resolveGoal(userId, { ...state, goal: payload.goal ?? state.goal }, defaultGoal);
  state.goal = goal;

  if (payload.mealPlan !== undefined) {
    state.mealPlan = payload.mealPlan ?? null;
  }

  if (payload.diary || payload.summary) {
    const diary = getOrCreateDiary(state, userId, date, goal);
    diary.items = sortDiaryItems(payload.diary?.items ?? []);
    diary.targetCalories = payload.summary?.targetCalories ?? goal.targetCalories;
    diary.targetWaterMl = payload.summary?.targetWaterMl ?? goal.targetWaterMl ?? 2200;
    diary.waterIntakeMl = payload.summary?.waterIntakeMl ?? 0;
  }

  writeRawState(userId, state);
}

export function saveNutritionGoalToBrowser(userId: string, goal: NutritionGoal): void {
  const state = readRawState(userId);
  const nextGoal = cloneGoal(userId, goal);
  state.goal = nextGoal;

  for (const diary of Object.values(ensureDiaries(state))) {
    diary.targetCalories = nextGoal.targetCalories;
    diary.targetWaterMl = nextGoal.targetWaterMl ?? 2200;
  }

  writeRawState(userId, state);
}

export function saveNutritionWaterToBrowser(
  userId: string,
  date: string,
  goal: NutritionGoal,
  waterIntakeMl: number,
): void {
  const state = readRawState(userId);
  const diary = getOrCreateDiary(state, userId, date, resolveGoal(userId, state, goal));
  diary.waterIntakeMl = waterIntakeMl;
  writeRawState(userId, state);
}

export function saveNutritionDiaryItemToBrowser(
  userId: string,
  date: string,
  goal: NutritionGoal,
  item: DiaryItemSnapshot,
): void {
  const state = readRawState(userId);
  const diary = getOrCreateDiary(state, userId, date, resolveGoal(userId, state, goal));
  diary.items = sortDiaryItems([...diary.items, item]);
  writeRawState(userId, state);
}

export function removeNutritionDiaryItemFromBrowser(userId: string, itemId: string): void {
  const state = readRawState(userId);

  for (const diary of Object.values(ensureDiaries(state))) {
    const nextItems = diary.items.filter((item) => item.id !== itemId);
    if (nextItems.length !== diary.items.length) {
      diary.items = nextItems;
      break;
    }
  }

  writeRawState(userId, state);
}

export function saveNutritionMealPlanToBrowser(userId: string, mealPlan: MealPlan): void {
  const state = readRawState(userId);
  state.mealPlan = mealPlan;
  writeRawState(userId, state);
}

export function clearNutritionMealPlanFromBrowser(userId: string): void {
  const state = readRawState(userId);
  state.mealPlan = null;
  writeRawState(userId, state);
}
