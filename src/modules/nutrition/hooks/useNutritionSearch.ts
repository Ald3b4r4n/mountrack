import { useState, useCallback } from "react";
import { authorizedNutritionFetch, getNutritionErrorMessage } from "@/modules/nutrition/client";
import { resolveUiStorageMode, type NutritionUiStorageMode } from "./useNutritionDashboard";
import type { FoodItem } from "@/modules/nutrition/domain/types";

export type NutritionSearchSource = "catalog" | "external" | "fallback" | "none" | "openfoodfacts" | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useNutritionSearch(activeUser: any, canUseBrowserPersistence: boolean) {
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [lastSearchSource, setLastSearchSource] = useState<NutritionSearchSource>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<NutritionUiStorageMode>("checking");

  const resolveRequestError = useCallback(async (response: Response, fallbackMessage: string) => {
    const nextMessage = await getNutritionErrorMessage(response, fallbackMessage);
    setMessage(nextMessage);
    return nextMessage;
  }, []);

  function clearSearchResults() {
    setSearchResults([]);
    setLastSearchSource(null);
    setResultsVisible(false);
  }

  function clearSelectedFood() {
    setSelectedFood(null);
  }

  function resetSearchComposer(clearInputs = false) {
    clearSearchResults();
    clearSelectedFood();
    if (clearInputs) {
      setSearchQuery("");
      setBarcodeQuery("");
    }
  }

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  function handleBarcodeQueryChange(value: string) {
    setBarcodeQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  async function handleSearch() {
    if (!activeUser) return;

    const query = searchQuery.trim();
    if (!query) {
      resetSearchComposer();
      return;
    }

    setIsSearching(true);
    setMessage(null);
    resetSearchComposer();

    try {
      const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/foods/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel buscar alimentos agora.");
        return;
      }
      // Re-export resolveUiStorageMode logic in Dashboard to use here or just assume base validation
      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as { results?: FoodItem[]; source?: NutritionSearchSource };
      const results = payload.results ?? [];
      const nextSource = payload.source ?? (results.length ? "catalog" : "none");

      setSearchResults(results);
      setLastSearchSource(nextSource);
      setResultsVisible(results.length > 0);

      if (results.length === 1) {
        setSelectedFood(results[0]);
        setMessage(`${results[0].displayName ?? results[0].name} pronto para lancamento.`);
      } else if (!results.length) {
        setMessage("Nenhum alimento encontrado para essa busca.");
      }
    } catch {
      setMessage((current) => current ?? "Nao foi possivel buscar alimentos agora.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleBarcodeLookup(code: string) {
    if (!activeUser || !code.trim()) return;

    setBarcodeQuery(code);
    setIsSearching(true);
    setMessage(null);
    resetSearchComposer();

    try {
      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/foods/barcode/${encodeURIComponent(code)}`,
      );
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel consultar esse codigo de barras.");
        return;
      }
      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as { item?: FoodItem | null; source?: NutritionSearchSource };
      const foundItem = payload.item ?? null;

      if (foundItem) {
        setSearchResults([foundItem]);
        setLastSearchSource(payload.source ?? "openfoodfacts");
        setSelectedFood(foundItem);
        setMessage(`Produto encontrado: ${foundItem.displayName ?? foundItem.name}`);
      } else {
        setLastSearchSource(payload.source ?? "none");
        setMessage("Nenhum item encontrado para esse codigo de barras.");
      }
    } catch {
      setMessage((current) => current ?? "Nao foi possivel consultar esse codigo de barras.");
    } finally {
      setIsSearching(false);
    }
  }

  function applyFoodSelection(food: FoodItem) {
    setSelectedFood(food);
    setResultsVisible(false);
    setMessage(`${food.displayName ?? food.name} pronto para lancamento.`);
  }

  function reopenSearchResults() {
    setResultsVisible(true);
  }

  return {
    state: {
      searchQuery,
      barcodeQuery,
      searchResults,
      lastSearchSource,
      selectedFood,
      resultsVisible,
      isSearching,
      message,
      storageMode,
    },
    setters: {
      setSearchQuery,
      setBarcodeQuery,
      setSelectedFood,
      setResultsVisible,
      setMessage,
      setSearchResults,
      setIsSearching,
      setLastSearchSource,
    },
    actions: {
      handleSearchQueryChange,
      handleBarcodeQueryChange,
      handleSearch,
      handleBarcodeLookup,
      resetSearchComposer,
      clearSearchResults,
      clearSelectedFood,
      applyFoodSelection,
      reopenSearchResults,
    },
  };
}
