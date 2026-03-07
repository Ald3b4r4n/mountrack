import { z } from "zod";

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
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  consumedAt: z.string().datetime().optional(),
});

export const updateDiaryItemSchema = diaryItemSchema.extend({
  id: z.string().min(1),
});

export const waterIntakeSchema = z.object({
  waterIntakeMl: z.number().min(0).max(12000),
});

export const mealPlanRequestSchema = z.object({
  targetCalories: z.number().min(600).max(8000),
  mealsPerDay: z.number().int().min(3).max(5),
  objective: z.enum(["lose", "maintain", "gain"]),
  restrictions: z.array(z.string()).optional(),
  preferredFoods: z.array(z.string()).optional(),
  excludedFoods: z.array(z.string()).optional(),
});
