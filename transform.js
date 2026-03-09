const fs = require('fs');

const content = fs.readFileSync('g:/Apps/MounTrack/src/modules/nutrition/data/taco-foods.ts', 'utf-8');
const startIndex = content.indexOf('[');
const endIndex = content.lastIndexOf(']');

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find array brackets.");
  process.exit(1);
}

const arrayContent = content.substring(startIndex, endIndex + 1);

// Safely parse JSON or eval
let data;
try {
  data = eval('(' + arrayContent + ')');
} catch (e) {
  console.error("Failed to eval array:", e);
  process.exit(1);
}

const newFoods = data.map(item => {
  const cleanItem = {
    id: item.id,
    source: 'tbca',
    name: item.name,
    baseUnit: item.servingUnit === 'ml' ? 'ml' : 'g',
    caloriesPer100: item.calories,
    proteinPer100: item.protein,
    carbsPer100: item.carbs,
    fatPer100: item.fat,
    sodiumPer100: item.sodium,
    confidenceScore: 0.95,
    mealCategories: ['breakfast', 'lunch', 'dinner', 'snack']
  };
  
  if (item.brand) {
    cleanItem.brand = item.brand;
  }
  if (item.barcode) {
    cleanItem.barcode = item.barcode;
  }
  
  return cleanItem;
});

const output = `import type { FoodItem } from "@/modules/nutrition/domain/types";

export const TACO_FOODS: FoodItem[] = ${JSON.stringify(newFoods, null, 2)};
`;

fs.writeFileSync('g:/Apps/MounTrack/src/modules/nutrition/data/taco-foods.ts', output);
console.log('Successfully transformed taco-foods.ts');
