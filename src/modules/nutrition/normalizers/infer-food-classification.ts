import type { FoodCategory, FoodItem, MealType } from "@/modules/nutrition/domain/types";

const CATEGORY_RULES: Array<{ pattern: RegExp; category: FoodCategory }> = [
  { pattern: /(whey|protein|albumina|frango|carne|atum|salm[aã]o|ovo|ovos|til[aá]pia|iogurte proteico)/i, category: "protein" },
  { pattern: /(arroz|p[aã]o|aveia|granola|macarr[aã]o|batata|mandioca|tapioca|farinha|cereal|massa)/i, category: "carb" },
  { pattern: /(banana|ma[cç][aã]|mam[aã]o|morango|uva|abacate|fruta|laranja)/i, category: "fruit" },
  { pattern: /(alface|tomate|br[oó]colis|couve|legume|salada|cenoura|pepino)/i, category: "vegetable" },
  { pattern: /(leite|queijo|iogurte|coalhada|kefir)/i, category: "dairy" },
  { pattern: /(azeite|amendoim|castanha|nozes|pasta de amendoim|abacate)/i, category: "fat" },
  { pattern: /(suco|[áa]gua|refrigerante|bebida|caf[eé]|ch[aá])|drink/i, category: "beverage" },
];

const CATEGORY_MEALS: Record<FoodCategory, MealType[]> = {
  protein: ["breakfast", "lunch", "dinner", "snack"],
  carb: ["breakfast", "lunch", "dinner", "snack"],
  fruit: ["breakfast", "snack"],
  vegetable: ["lunch", "dinner"],
  dairy: ["breakfast", "snack"],
  fat: ["breakfast", "lunch", "dinner", "snack"],
  snack: ["breakfast", "snack"],
  beverage: ["breakfast", "snack"],
};

export function inferFoodClassification(name: string, tags: string[] = []): Pick<FoodItem, "category" | "mealCategories" | "tags"> {
  const haystack = [name, ...tags].join(" ");
  const matchedRule = CATEGORY_RULES.find((rule) => rule.pattern.test(haystack));
  const category: FoodCategory = matchedRule?.category ?? "snack";
  const normalizedTags = Array.from(new Set(tags.filter(Boolean).map((tag) => tag.toLowerCase())));

  return {
    category,
    mealCategories: CATEGORY_MEALS[category],
    tags: normalizedTags,
  };
}
