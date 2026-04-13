import type { User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildNutritionBarcodeCandidates,
  normalizeNutritionBarcode,
} from "@/modules/nutrition/barcode";
import {
  authorizedNutritionFetch,
  getNutritionErrorMessage,
} from "@/modules/nutrition/client";
import { listRecentNutritionFoodsFromBrowser } from "@/modules/nutrition/client-storage";
import type {
  FoodItem,
  FoodSource,
  MealType,
  RecentConsumedFood,
} from "@/modules/nutrition/domain/types";
import { getFoodLabel } from "@/modules/nutrition/ui-helpers";
import {
  resolveUiStorageMode,
  type NutritionUiStorageMode,
} from "./useNutritionDashboard";

export type NutritionSearchSource =
  | "catalog"
  | "custom"
  | "external"
  | "fallback"
  | "fatsecret"
  | "none"
  | "openfoodfacts"
  | null;

type NutritionSearchPayload = {
  results?: FoodItem[];
  source?: NutritionSearchSource;
  externalPending?: boolean;
  didYouMean?: string[];
};

type RecentFoodsPayload = {
  foods?: RecentConsumedFood[];
};

export type NutritionSearchFilter = "all" | FoodSource;

type SearchCacheEntry = {
  results: FoodItem[];
  source: NutritionSearchSource;
  didYouMean: string[];
  cachedAt: number;
};

const SEARCH_CACHE_TTL_MS = 60_000;
const REMOTE_SOURCE_FILTERS = new Set<NutritionSearchFilter>([
  "all",
  "fatsecret",
  "openfoodfacts",
  "usda",
]);

type HandleSearchOptions = {
  preferCache?: boolean;
  keepCurrentResults?: boolean;
};

type NutritionSearchUser =
  | User
  | { uid: string; getIdToken?: () => Promise<string>; devBypass?: boolean }
  | null;
type FoodSelectionOptions = {
  openComposer?: boolean;
  hideResults?: boolean;
};

function buildBarcodeDebugMessage(
  rawCode: string,
  normalizedCode: string | null,
  candidates: string[],
  source?: NutritionSearchSource | "invalid",
): string {
  const segments = [
    `lido=${rawCode || "(vazio)"}`,
    `normalizado=${normalizedCode ?? "invalido"}`,
    `candidatos=${candidates.length ? candidates.join(",") : "nenhum"}`,
  ];

  if (source) {
    segments.push(`fonte=${source}`);
  }

  return ` [diag: ${segments.join(" | ")}]`;
}

export function useNutritionSearch(
  activeUser: NutritionSearchUser,
  canUseBrowserPersistence: boolean,
  dashboardStorageMode?: NutritionUiStorageMode,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [sourceFilter, setSourceFilter] =
    useState<NutritionSearchFilter>("all");
  const [lastSearchSource, setLastSearchSource] =
    useState<NutritionSearchSource>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnrichingExternal, setIsEnrichingExternal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [barcodeMissCode, setBarcodeMissCode] = useState<string | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentConsumedFood[]>([]);
  const [isLoadingRecentFoods, setIsLoadingRecentFoods] = useState(false);
  const [storageMode, setStorageMode] =
    useState<NutritionUiStorageMode>("checking");
  const searchRequestIdRef = useRef(0);
  const searchMealContextRef = useRef<MealType | null>(null);
  const selectedFoodRef = useRef<FoodItem | null>(null);
  const searchCacheRef = useRef<Map<string, SearchCacheEntry>>(new Map());

  useEffect(() => {
    selectedFoodRef.current = selectedFood;
  }, [selectedFood]);

  const resolveRequestError = useCallback(
    async (response: Response, fallbackMessage: string) => {
      const nextMessage = await getNutritionErrorMessage(
        response,
        fallbackMessage,
      );
      setMessage(nextMessage);
      return nextMessage;
    },
    [],
  );

  const loadRecentFoods = useCallback(async () => {
    if (!activeUser) {
      setRecentFoods([]);
      return;
    }

    if (dashboardStorageMode === "volatile" && canUseBrowserPersistence) {
      setRecentFoods(listRecentNutritionFoodsFromBrowser(activeUser.uid, { limit: 8 }));
      return;
    }

    setIsLoadingRecentFoods(true);
    try {
      const response = await authorizedNutritionFetch(
        activeUser as Exclude<NutritionSearchUser, null>,
        "/api/nutrition/foods/recent?limit=8",
      );

      if (!response.ok) {
        setRecentFoods([]);
        return;
      }

      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as RecentFoodsPayload;
      setRecentFoods(payload.foods ?? []);
    } catch {
      setRecentFoods([]);
    } finally {
      setIsLoadingRecentFoods(false);
    }
  }, [activeUser, canUseBrowserPersistence, dashboardStorageMode]);

  function clearSearchResults() {
    setSearchResults([]);
    setLastSearchSource(null);
    setResultsVisible(false);
    setSearchSuggestions([]);
  }

  function clearSelectedFood() {
    setSelectedFood(null);
    setIsComposerOpen(false);
  }

  function resetSearchComposer(clearInputs = false) {
    clearSearchResults();
    clearSelectedFood();
    setIsEnrichingExternal(false);
    setBarcodeMissCode(null);
    setMessage(null);
    if (clearInputs) {
      setSearchQuery("");
      setBarcodeQuery("");
    }
  }

  function handleSearchQueryChange(value: string) {
    searchRequestIdRef.current += 1;
    setIsEnrichingExternal(false);
    setBarcodeMissCode(null);
    setSearchSuggestions([]);
    setSearchQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  function handleBarcodeQueryChange(value: string) {
    searchRequestIdRef.current += 1;
    setIsEnrichingExternal(false);
    setSearchSuggestions([]);
    setBarcodeQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  function buildSearchCacheKey(
    query: string,
    source: NutritionSearchFilter,
  ): string {
    return `${source}::${query}`;
  }

  function getFreshCacheEntry(
    cacheKey: string,
    preferCache: boolean,
  ): SearchCacheEntry | null {
    const cachedEntry = searchCacheRef.current.get(cacheKey);
    if (!cachedEntry) {
      return null;
    }

    const shouldUseCache = preferCache || process.env.NODE_ENV === "production";
    if (!shouldUseCache) {
      return null;
    }

    const isFresh = Date.now() - cachedEntry.cachedAt <= SEARCH_CACHE_TTL_MS;
    return isFresh ? cachedEntry : null;
  }

  async function requestSearch(
    query: string,
    source: NutritionSearchFilter,
    mealType: MealType | null,
  ): Promise<Response> {
    const sourceParam =
      source === "all" ? "" : `&source=${encodeURIComponent(source)}`;
    const mealTypeParam = mealType
      ? `&mealType=${encodeURIComponent(mealType)}`
      : "";

    return authorizedNutritionFetch(
      activeUser as Exclude<NutritionSearchUser, null>,
      `/api/nutrition/foods/search?q=${encodeURIComponent(query)}${sourceParam}${mealTypeParam}`,
    );
  }

  function applySearchPayload(payload: NutritionSearchPayload) {
    const results = payload.results ?? [];
    const nextSource = payload.source ?? (results.length ? "catalog" : "none");

    setSearchResults(results);
    setLastSearchSource(nextSource);

    if (!selectedFoodRef.current) {
      setResultsVisible(results.length > 0);
    }

    return { results, nextSource };
  }

  async function handleSearch(
    nextSource: NutritionSearchFilter = sourceFilter,
    options: HandleSearchOptions = {},
    mealTypeContext?: MealType | null,
    queryOverride?: string,
  ) {
    if (!activeUser) return;

    if (mealTypeContext !== undefined) {
      searchMealContextRef.current = mealTypeContext;
    }

    const query = (queryOverride ?? searchQuery).trim();
    if (!query) {
      resetSearchComposer();
      return;
    }

    const cacheKey = buildSearchCacheKey(query, nextSource);

    const cachedEntry = getFreshCacheEntry(
      cacheKey,
      Boolean(options.preferCache),
    );
    if (cachedEntry) {
      applySearchPayload({
        results: cachedEntry.results,
        source: cachedEntry.source,
      });
      setSearchSuggestions(cachedEntry.didYouMean);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setIsSearching(true);
    setIsEnrichingExternal(false);
    setMessage(null);
    setSearchSuggestions([]);

    if (!options.keepCurrentResults) {
      resetSearchComposer();
    }

    try {
      const response = await requestSearch(
        query,
        nextSource,
        searchMealContextRef.current,
      );
      if (searchRequestIdRef.current !== requestId) {
        return;
      }

      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não consegui buscar alimentos agora. Tente novamente em instantes.",
        );
        return;
      }

      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as NutritionSearchPayload;
      const didYouMeanSuggestions =
        payload.didYouMean
          ?.map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 3) ?? [];
      const { results } = applySearchPayload(payload);
      setSearchSuggestions(results.length ? [] : didYouMeanSuggestions);

      searchCacheRef.current.set(cacheKey, {
        results,
        source: payload.source ?? (results.length ? "catalog" : "none"),
        didYouMean: didYouMeanSuggestions,
        cachedAt: Date.now(),
      });

      if (results.length === 1) {
        setSelectedFood(results[0]);
        setIsComposerOpen(false);
        setMessage(`${getFoodLabel(results[0])} pronto para registro.`);
      } else if (payload.externalPending) {
        setIsEnrichingExternal(true);
        if (!results.length) {
          if (didYouMeanSuggestions.length > 0) {
            setMessage(
              `Ainda não achei esse item no catálogo. Você quis dizer: ${didYouMeanSuggestions.join(" | ")}?`,
            );
          } else {
            setMessage(
              "Ainda não achei esse item no catálogo. Vou complementar as referências em segundo plano.",
            );
          }
        } else {
          setMessage(
            "Resultados prontos. Se faltar algo, novas referências entram em segundo plano.",
          );
        }
      } else if (!results.length) {
        if (didYouMeanSuggestions.length > 0) {
          setMessage(
            `Não encontrei esse alimento por enquanto. Você quis dizer: ${didYouMeanSuggestions.join(" | ")}?`,
          );
        } else {
          setMessage("Não encontrei esse alimento por enquanto.");
        }
      }
    } catch {
      setMessage(
        (current) =>
          current ??
          "Não consegui buscar alimentos agora. Tente novamente em instantes.",
      );
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }

  function handleSourceFilterChange(nextSource: NutritionSearchFilter) {
    if (nextSource === sourceFilter) {
      return;
    }

    setSourceFilter(nextSource);
    setMessage(null);

    if (!activeUser || !searchQuery.trim()) {
      return;
    }

    if (REMOTE_SOURCE_FILTERS.has(nextSource)) {
      void handleSearch(nextSource, {
        preferCache: true,
        keepCurrentResults: true,
      });
      return;
    }

    if (sourceFilter === "all") {
      return;
    }

    const allCacheKey = buildSearchCacheKey(searchQuery.trim(), "all");
    const allCachedEntry = getFreshCacheEntry(allCacheKey, true);
    if (allCachedEntry) {
      applySearchPayload({
        results: allCachedEntry.results,
        source: allCachedEntry.source,
      });
      setSearchSuggestions(allCachedEntry.didYouMean);
      return;
    }

    void handleSearch("all", {
      preferCache: true,
      keepCurrentResults: true,
    });
  }

  function setSearchMealContext(mealType: MealType | null) {
    searchMealContextRef.current = mealType;
  }

  async function handleSearchSuggestion(suggestion: string) {
    const nextQuery = suggestion.trim();
    if (!nextQuery) {
      return;
    }

    setSearchQuery(nextQuery);
    setMessage(null);
    if (sourceFilter !== "all") {
      setSourceFilter("all");
    }

    await handleSearch(
      "all",
      { keepCurrentResults: false },
      searchMealContextRef.current,
      nextQuery,
    );
  }

  async function handleBarcodeLookup(code: string) {
    if (!activeUser) return;

    const rawCode = code.trim();
    const normalizedCode = normalizeNutritionBarcode(rawCode);
    const candidates = normalizedCode
      ? buildNutritionBarcodeCandidates(normalizedCode)
      : [];

    setBarcodeQuery(normalizedCode ?? rawCode);

    if (!normalizedCode) {
      resetSearchComposer();
      setMessage(
        `Leia ou digite um código de barras numérico válido.${buildBarcodeDebugMessage(rawCode, normalizedCode, candidates, "invalid")}`,
      );
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setIsSearching(true);
    setIsEnrichingExternal(false);
    setSearchSuggestions([]);
    setMessage(null);
    resetSearchComposer();

    try {
      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/foods/barcode/${encodeURIComponent(normalizedCode)}`,
      );

      if (response.status === 404) {
        setStorageMode(
          resolveUiStorageMode(response, canUseBrowserPersistence),
        );
        const payload = (await response.json()) as {
          item?: FoodItem | null;
          source?: NutritionSearchSource;
        };
        setSearchResults([]);
        setSelectedFood(null);
        setResultsVisible(false);
        setIsComposerOpen(false);
        setLastSearchSource(payload.source ?? "none");
        setBarcodeMissCode(normalizedCode);
        setMessage(
          `Não encontrei esse código de barras no catálogo.${buildBarcodeDebugMessage(rawCode, normalizedCode, candidates, payload.source ?? "none")}`,
        );
        return;
      }

      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não consegui consultar esse código de barras agora.",
        );
        return;
      }

      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as {
        item?: FoodItem | null;
        source?: NutritionSearchSource;
      };
      const foundItem = payload.item ?? null;

      if (foundItem) {
        setSearchResults([foundItem]);
        setLastSearchSource(payload.source ?? "fatsecret");
        setSelectedFood(foundItem);
        setResultsVisible(false);
        setIsComposerOpen(true);
        setMessage(
          `${getFoodLabel(foundItem)} encontrado pelo código de barras.${buildBarcodeDebugMessage(rawCode, normalizedCode, candidates, payload.source ?? "fatsecret")}`,
        );
      } else {
        setLastSearchSource(payload.source ?? "none");
        setMessage(
          `Não encontrei esse código de barras no catálogo.${buildBarcodeDebugMessage(rawCode, normalizedCode, candidates, payload.source ?? "none")}`,
        );
      }
    } catch {
      setMessage(
        (current) =>
          current ?? "Não consegui consultar esse código de barras agora.",
      );
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }

  function applyFoodSelection(
    food: FoodItem,
    options: FoodSelectionOptions = {},
  ) {
    const { openComposer = true, hideResults = true } = options;
    setSelectedFood(food);
    setResultsVisible(!hideResults);
    setIsComposerOpen(openComposer);
    setMessage(`${getFoodLabel(food)} pronto para registro.`);
  }

  function openSelectedFoodComposer() {
    if (!selectedFoodRef.current) return;
    setResultsVisible(false);
    setIsComposerOpen(true);
  }

  function closeSelectedFoodComposer() {
    setIsComposerOpen(false);
  }

  function reopenSearchResults() {
    setResultsVisible(true);
    setIsComposerOpen(false);
  }

  function swapSelectedFood() {
    setSelectedFood(null);
    setResultsVisible(true);
    setIsComposerOpen(false);
    setMessage(null);
  }

  return {
    state: {
      searchQuery,
      barcodeQuery,
      searchResults,
      sourceFilter,
      lastSearchSource,
      selectedFood,
      isComposerOpen,
      resultsVisible,
      isSearching,
      isEnrichingExternal,
      message,
      searchSuggestions,
      barcodeMissCode,
      recentFoods,
      isLoadingRecentFoods,
      storageMode,
    },
    setters: {
      setSearchQuery,
      setBarcodeQuery,
      setSourceFilter,
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
      handleSearchSuggestion,
      handleSourceFilterChange,
      setSearchMealContext,
      handleBarcodeLookup,
      resetSearchComposer,
      clearSearchResults,
      clearSelectedFood,
      applyFoodSelection,
      openSelectedFoodComposer,
      closeSelectedFoodComposer,
      reopenSearchResults,
      swapSelectedFood,
      loadRecentFoods,
    },
  };
}
