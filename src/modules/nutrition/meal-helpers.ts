import {
  DEFAULT_MEAL_DEFINITIONS,
  MEAL_LABELS,
  MEAL_ORDER,
} from "@/modules/nutrition/constants";
import type {
  DefaultMealType,
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";

function slugifyMealLabel(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return normalized || "refeição-extra";
}

export function isDefaultMealType(
  mealType: string,
): mealType is DefaultMealType {
  return MEAL_ORDER.includes(mealType as DefaultMealType);
}

export function getMealLabel(mealType: MealType, mealLabel?: string): string {
  if (isDefaultMealType(mealType)) {
    return MEAL_LABELS[mealType];
  }

  if (mealLabel?.trim()) {
    return mealLabel.trim();
  }

  return mealType
    .replace(/^custom:/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getDefaultMealDefinitions(): MealDefinition[] {
  return DEFAULT_MEAL_DEFINITIONS.map((definition) => ({ ...definition }));
}

export function createCustomMealDefinition(
  label: string,
  existingDefinitions: MealDefinition[],
): MealDefinition {
  const trimmedLabel = label.trim().replace(/\s+/g, " ");
  const baseSlug = slugifyMealLabel(trimmedLabel);
  const existingKeys = new Set(
    existingDefinitions.map((definition) => definition.key),
  );

  let suffix = 0;
  let key = `custom:${baseSlug}` as MealType;
  while (existingKeys.has(key)) {
    suffix += 1;
    key = `custom:${baseSlug}-${suffix}` as MealType;
  }

  return {
    key,
    label: trimmedLabel,
  };
}

export function buildMealDefinitions(
  items: DiaryItemSnapshot[],
  extraDefinitions: MealDefinition[] = [],
): MealDefinition[] {
  const definitions = new Map<MealType, MealDefinition>();

  for (const definition of getDefaultMealDefinitions()) {
    definitions.set(definition.key, definition);
  }

  for (const definition of extraDefinitions) {
    definitions.set(definition.key, {
      ...definition,
      label: getMealLabel(definition.key, definition.label),
      isDefault: definition.isDefault ?? isDefaultMealType(definition.key),
    });
  }

  for (const item of items) {
    if (!definitions.has(item.mealType)) {
      definitions.set(item.mealType, {
        key: item.mealType,
        label: getMealLabel(item.mealType, item.mealLabel),
        isDefault: isDefaultMealType(item.mealType),
      });
    }
  }

  const defaultDefinitions = MEAL_ORDER.map(
    (mealKey) => definitions.get(mealKey)!,
  ).filter(Boolean);
  const customDefinitions = Array.from(definitions.values()).filter(
    (definition) => !isDefaultMealType(definition.key),
  );

  return [...defaultDefinitions, ...customDefinitions];
}
