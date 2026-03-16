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
import type { FoodItem } from "@/modules/nutrition/domain/types";
import {
  resolveUiStorageMode,
  type NutritionUiStorageMode,
} from "./useNutritionDashboard";

export type NutritionSearchSource =
  | "catalog"
  | "custom"
  | "external"
  | "fallback"
  | "none"
  | "openfoodfacts"
  | null;

type NutritionSearchPayload = {
  results?: FoodItem[];
  source?: NutritionSearchSource;
  externalPending?: boolean;
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
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [lastSearchSource, setLastSearchSource] =
    useState<NutritionSearchSource>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnrichingExternal, setIsEnrichingExternal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageMode, setStorageMode] =
    useState<NutritionUiStorageMode>("checking");
  const searchRequestIdRef = useRef(0);
  const selectedFoodRef = useRef<FoodItem | null>(null);

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

  function clearSearchResults() {
    setSearchResults([]);
    setLastSearchSource(null);
    setResultsVisible(false);
  }

  function clearSelectedFood() {
    setSelectedFood(null);
    setIsComposerOpen(false);
  }

  function resetSearchComposer(clearInputs = false) {
    clearSearchResults();
    clearSelectedFood();
    setIsEnrichingExternal(false);
    if (clearInputs) {
      setSearchQuery("");
      setBarcodeQuery("");
    }
  }

  function handleSearchQueryChange(value: string) {
    searchRequestIdRef.current += 1;
    setIsEnrichingExternal(false);
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
    setBarcodeQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  async function requestSearch(query: string): Promise<Response> {
    return authorizedNutritionFetch(
      activeUser as Exclude<NutritionSearchUser, null>,
      `/api/nutrition/foods/search?q=${encodeURIComponent(query)}`,
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

  async function handleSearch() {
    if (!activeUser) return;

    const query = searchQuery.trim();
    if (!query) {
      resetSearchComposer();
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setIsSearching(true);
    setIsEnrichingExternal(false);
    setMessage(null);
    resetSearchComposer();

    try {
      const response = await requestSearch(query);
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
      const { results } = applySearchPayload(payload);

      if (results.length === 1) {
        setSelectedFood(results[0]);
        setIsComposerOpen(false);
        setMessage(
          `${results[0].displayName ?? results[0].name} pronto para registro.`,
        );
      } else if (payload.externalPending) {
        setIsEnrichingExternal(true);
        if (!results.length) {
          setMessage(
            "Ainda não achei esse item no catálogo. Vou complementar as referências em segundo plano.",
          );
        } else {
          setMessage(
            "Resultados prontos. Se faltar algo, novas referÃªncias entram em segundo plano.",
          );
        }
      } else if (!results.length) {
        setMessage("Não encontrei esse alimento por enquanto.");
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

  async function handleBarcodeLookup(code: string) {
    if (!activeUser) return;

    const rawCode = code.trim();
    const normalizedCode = normalizeNutritionBarcode(rawCode);
    const candidates = normalizedCode
      ? buildNutritionBarcodeCandidates(normalizedCode)
      : [];

    setBarcodeQuery(normalizedCode ?? rawCode);

    if (!normalizedCode) {
      setMessage(
        `Leia ou digite um código de barras numérico válido.${buildBarcodeDebugMessage(rawCode, normalizedCode, candidates, "invalid")}`,
      );
      resetSearchComposer();
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setIsSearching(true);
    setIsEnrichingExternal(false);
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
        setLastSearchSource(payload.source ?? "openfoodfacts");
        setSelectedFood(foundItem);
        setResultsVisible(false);
        setIsComposerOpen(true);
        setMessage(
          `${foundItem.displayName ?? foundItem.name} encontrado pelo código de barras.${buildBarcodeDebugMessage(rawCode, normalizedCode, candidates, payload.source ?? "openfoodfacts")}`,
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
    setMessage(`${food.displayName ?? food.name} pronto para registro.`);
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
      lastSearchSource,
      selectedFood,
      isComposerOpen,
      resultsVisible,
      isSearching,
      isEnrichingExternal,
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
      openSelectedFoodComposer,
      closeSelectedFoodComposer,
      reopenSearchResults,
      swapSelectedFood,
    },
  };
}
