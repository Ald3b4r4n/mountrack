export interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    unitName: string;
    value: number;
  }>;
}

export interface USDAFoodResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source: 'usda';
}

const mapUSDAProductToFoodResult = (item: USDAFoodItem): USDAFoodResult | null => {
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;

  item.foodNutrients.forEach(nutrient => {
    // IDs dos nutrientes no USDA
    switch (nutrient.nutrientId) {
      case 1008: // Energy (kcal)
        calories = nutrient.value;
        break;
      case 1003: // Protein (g)
        protein = nutrient.value;
        break;
      case 1005: // Carbohydrate (g)
        carbs = nutrient.value;
        break;
      case 1004: // Total lipid (fat) (g)
        fat = nutrient.value;
        break;
      case 1079: // Fiber, total dietary (g)
        fiber = nutrient.value;
        break;
    }
  });

  // Se não encontrar os macros essenciais completos (às vezes a base só tem 1 macro)
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
     return null;
  }

  return {
    id: `usda_${item.fdcId}`,
    name: item.description,
    brand: item.brandOwner,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    source: 'usda'
  };
};

export const USDAFoodDataService = {
  // Usa o process.env publicamente ou a DEMO_KEY do governo americano como fallback
  // Nota: Em ambiente frontend Next.js, se não tiver NEXT_PUBLIC_USDA_API_KEY, 
  // usaremos a DEMO_KEY, que tem limite rígido de requisições.
  getApiKey(): string {
    return process.env.NEXT_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
  },

  /**
   * Busca alimentos na base do USDA por nome
   */
  async searchByName(query: string, page: number = 1): Promise<USDAFoodResult[]> {
    try {
      const apiKey = this.getApiKey();
      
      const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          dataType: ["Foundation", "SR Legacy", "Branded"], // Evita Survey foods que costumam ser pratos complexos
          pageSize: 20,
          pageNumber: page
        })
      });

      if (!response.ok) return [];

      const data = await response.json();
      
      if (data.foods && Array.isArray(data.foods)) {
        const results = data.foods
          .map((item: USDAFoodItem) => mapUSDAProductToFoodResult(item))
          .filter((p: USDAFoodResult | null) => p !== null) as USDAFoodResult[];
          
        return results;
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar no USDA FoodData Central:', error);
      return [];
    }
  }
};
