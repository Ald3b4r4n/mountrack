import { z } from "zod";
import type { MealDefinition, MealType } from "@/modules/nutrition/domain/types";

const mealTypeSchema = z
  .string()
  .regex(/^(breakfast|lunch|dinner|snack|custom:[a-z0-9-]{1,48})$/)
  .transform((value) => value as MealType);

const mealDefinitionSchema: z.ZodType<MealDefinition> = z.object({
  key: mealTypeSchema,
  label: z.string().trim().min(1).max(40),
  isDefault: z.boolean().optional(),
});

export const nutritionGoalSchema = z.object({
  targetCalories: z.number().min(1200).max(6000),
  targetWaterMl: z.number().min(500).max(8000).optional(),
  targetProtein: z.number().min(0).max(500).optional(),
  targetCarbs: z.number().min(0).max(800).optional(),
  targetFat: z.number().min(0).max(300).optional(),
  objective: z.enum(["lose", "maintain", "gain"]),
});

export const diaryItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  foodId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(["g", "ml", "serving", "unit"]),
  mealType: mealTypeSchema,
  mealLabel: z.string().trim().min(1).max(40).optional(),
  consumedAt: z.string().datetime().optional(),
});

export const updateDiaryItemSchema = diaryItemSchema.extend({
  id: z.string().min(1),
});

export const waterIntakeSchema = z.object({
  waterIntakeMl: z.number().min(0).max(12000),
});

export const diaryPatchSchema = z
  .object({
    waterIntakeMl: z.number().min(0).max(12000).optional(),
    mealDefinitions: z.array(mealDefinitionSchema).min(4).optional(),
  })
  .refine((payload) => payload.waterIntakeMl !== undefined || payload.mealDefinitions !== undefined, {
    message: "At least one diary field must be provided",
  });

export const mealPlanRequestSchema = z.object({
  targetCalories: z.number().min(600).max(8000),
  mealsPerDay: z.number().int().min(3).max(5),
  objective: z.enum(["lose", "maintain", "gain"]),
  restrictions: z.array(z.string()).optional(),
  preferredFoods: z.array(z.string()).optional(),
  excludedFoods: z.array(z.string()).optional(),
});

export const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().min(1).max(120).optional(),
  barcode: z
    .string()
    .trim()
    .regex(/^\d{8,14}$/)
    .optional(),
  caloriesPer100: z.number().min(0).max(1200).optional(),
  proteinPer100: z.number().min(0).max(100).optional(),
  carbsPer100: z.number().min(0).max(100).optional(),
  fatPer100: z.number().min(0).max(100).optional(),
  fiberPer100: z.number().min(0).max(100).optional(),
  sodiumPer100: z.number().min(0).max(100000).optional(),
  servingGrams: z.number().positive().max(5000).optional(),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(3).max(12).catch(6),
});

export const barcodeLookupParamsSchema = z.object({
  code: z.string().trim().regex(/^\d{8,14}$/),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().catch(""),
});

export const diaryDateParamsSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const entityIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const enrichmentPayloadSchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).optional(),
});
