import type { DefaultMealType, FoodCategory, FoodItem } from "@/modules/nutrition/domain/types";

function normalizeClassificationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const CATEGORY_RULES: Array<{ pattern: RegExp; category: FoodCategory }> = [
  { pattern: /(whey|protein|albumina|frango|carne|atum|salmao|ovo|ovos|tilapia|iogurte proteico)/i, category: "protein" },
  { pattern: /(arroz|pao|aveia|granola|macarrao|batata|mandioca|tapioca|farinha|cereal|massa)/i, category: "carb" },
  { pattern: /(banana|maca|mamao|morango|uva|abacate|fruta|laranja)/i, category: "fruit" },
  { pattern: /(alface|tomate|brocolis|couve|legume|salada|cenoura|pepino)/i, category: "vegetable" },
  { pattern: /(leite|queijo|iogurte|coalhada|kefir)/i, category: "dairy" },
  { pattern: /(azeite|amendoim|castanha|nozes|pasta de amendoim|abacate)/i, category: "fat" },
  { pattern: /(suco|agua|refrigerante|bebida|cafe|cha|drink)/i, category: "beverage" },
];

const CATEGORY_MEALS: Record<FoodCategory, DefaultMealType[]> = {
  protein: ["breakfast", "lunch", "dinner", "snack"],
  carb: ["breakfast", "lunch", "dinner", "snack"],
  fruit: ["breakfast", "snack"],
  vegetable: ["lunch", "dinner"],
  dairy: ["breakfast", "snack"],
  fat: ["breakfast", "lunch", "dinner", "snack"],
  snack: ["breakfast", "snack"],
  beverage: ["breakfast", "snack"],
};

export function inferFoodClassification(
  name: string,
  tags: string[] = [],
): Pick<FoodItem, "category" | "mealCategories" | "tags"> {
  const haystack = normalizeClassificationText([name, ...tags].join(" "));
  const matchedRule = CATEGORY_RULES.find((rule) => rule.pattern.test(haystack));
  const category: FoodCategory = matchedRule?.category ?? "snack";
  const normalizedTags = Array.from(new Set(tags.filter(Boolean).map((tag) => normalizeClassificationText(tag))));

  return {
    category,
    mealCategories: CATEGORY_MEALS[category],
    tags: normalizedTags,
  };
}
