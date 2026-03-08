export interface OFFProduct {
  code: string;
  product_name: string;
  product_name_pt?: string;
  brands: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sodium_100g?: number;
  };
  image_front_url?: string;
  ingredients_text_pt?: string;
}

export interface OFFFoodResult {
  id: string; // barcode ou id gerado
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  source: 'open_food_facts';
  imageUrl?: string;
}

// Mapeia do formato OFF para o formato interno do nosso app
const mapProductToFoodResult = (product: OFFProduct): OFFFoodResult | null => {
  // Ignora produtos sem os macros principais
  if (
    typeof product.nutriments?.['energy-kcal_100g'] !== 'number' ||
    typeof product.nutriments?.proteins_100g !== 'number' ||
    typeof product.nutriments?.carbohydrates_100g !== 'number' ||
    typeof product.nutriments?.fat_100g !== 'number'
  ) {
    return null;
  }

  const name = product.product_name_pt || product.product_name || 'Produto Desconhecido';

  return {
    id: `off_${product.code}`,
    name: name,
    brand: product.brands,
    calories: product.nutriments['energy-kcal_100g'],
    protein: product.nutriments.proteins_100g,
    carbs: product.nutriments.carbohydrates_100g,
    fat: product.nutriments.fat_100g,
    fiber: product.nutriments.fiber_100g || 0,
    sodium: product.nutriments.sodium_100g ? product.nutriments.sodium_100g * 1000 : 0, // Convert to mg
    source: 'open_food_facts',
    imageUrl: product.image_front_url,
  };
};

export const OpenFoodFactsService = {
  /**
   * Busca um produto pelo código de barras (EAN/GTIN)
   */
  async getByBarcode(barcode: string): Promise<OFFFoodResult | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.status === 1 && data.product) {
        return mapProductToFoodResult(data.product as OFFProduct);
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar no Open Food Facts por barcode:', error);
      return null;
    }
  },

  /**
   * Busca produtos por nome/termo de pesquisa
   */
  async searchByName(query: string, page: number = 1): Promise<OFFFoodResult[]> {
    try {
      // Usamos o endpoint de busca em português prioritariamente
      const response = await fetch(
        `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20`
      );
      
      if (!response.ok) return [];

      const data = await response.json();
      if (data.products && Array.isArray(data.products)) {
        const results = data.products
          .map((p: any) => mapProductToFoodResult(p as OFFProduct))
          .filter((p: OFFFoodResult | null) => p !== null) as OFFFoodResult[];
          
        return results;
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar no Open Food Facts por nome:', error);
      return [];
    }
  }
};
