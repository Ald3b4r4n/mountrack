import https from 'https';
import fs from 'fs';
import path from 'path';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(str) {
  const lines = str.split('\n').filter(l => l.trim().length > 0);
  const rows = [];
  for (const line of lines) {
    const parts = [];
    let cur = '';
    let inQ = false;
    for (let c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { parts.push(cur); cur = ''; }
      else cur += c;
    }
    parts.push(cur);
    rows.push(parts);
  }
  return rows;
}

async function run() {
  console.log('Downloading TACO food data...');
  const foodData = await fetch('https://raw.githubusercontent.com/raulfdm/taco-api/main/references/csv/food.csv');
  console.log('Downloading TACO nutrient data...');
  const nutrientData = await fetch('https://raw.githubusercontent.com/raulfdm/taco-api/main/references/csv/nutrients.csv');
  
  const foodsRows = parseCSV(foodData).slice(1);
  const nutrientRows = parseCSV(nutrientData).slice(1);
  
  const nutMap = {};
  for (const parts of nutrientRows) {
    // foodId,moisture,kcal,kJ,protein,lipids,cholesterol,carbohydrates,dietaryFiber,ash,calcium,magnesium,manganese,phosphorus,iron,sodium,potassium,copper,zinc,retinol,re,rae,thiamin,riboflavin,pyridoxine,niacin,vitaminC
    nutMap[parts[0]] = {
      kcal: parseFloat(parts[2]) || 0,
      protein: parseFloat(parts[4]) || 0,
      fat: parseFloat(parts[5]) || 0,
      carbs: parseFloat(parts[7]) || 0
    };
  }
  
  const result = [];
  for (const parts of foodsRows) {
    const id = parts[0];
    const name = parts[2] ? parts[2].trim() : "Unknown item";
    const nut = nutMap[id];
    if (!nut) continue;
    
    result.push({
      id: 'taco_' + id,
      name: name,
      brand: 'TACO (Unicamp/NEPA)',
      barcode: '', // TACO generic foods don't have barcodes
      calories: nut.kcal,
      protein: nut.protein,
      carbs: nut.carbs,
      fat: nut.fat,
      servingSize: 100, // TACO is always per 100g
      servingUnit: 'g',
      sodium: 0 // we can parse it if needed
    });
  }
  
  const targetDir = path.join(process.cwd(), 'src', 'modules', 'nutrition', 'data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const fileContent = `import { FoodReference } from "../types";\n\nexport const TACO_FOODS: FoodReference[] = ${JSON.stringify(result, null, 2)};\n`;
  fs.writeFileSync(path.join(targetDir, 'taco-foods.ts'), fileContent);
  console.log(`Saved ${result.length} TACO foods to src/modules/nutrition/data/taco-foods.ts!`);
}

run().catch(console.error);
