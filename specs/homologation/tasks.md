# Tasks: Recentes por refeição em Nutrição

Branch: `homologation` | Plan: [plan.md](./plan.md)

## Phase 1 — Tests first (RED)

- [X] T001 Validator: estender `recentFoodsQuerySchema` tests em
  `src/modules/nutrition/validators.test.ts` — aceita `mealType` válido,
  rejeita inválido, aceita `limit=15`, rejeita `limit=16`.
- [X] T002 [P] Store: `listRecentConsumedFoods` filtra por `mealType` em
  modo memória (tests em `src/modules/nutrition/repositories/nutrition-store.test.ts`).
- [X] T003 [P] Client-storage: `listRecentNutritionFoodsFromBrowser` filtra por
  `mealType` (tests em `src/modules/nutrition/client-storage.test.ts`).
- [X] T004 Rota: `GET /api/nutrition/foods/recent` repassa `mealType` e retorna
  400 para valor inválido (tests em `src/app/api/nutrition/foods/recent/route.test.ts`).

## Phase 2 — Implementation (GREEN)

- [X] T005 Atualizar `src/modules/nutrition/validators.ts`:
  - `recentFoodsQuerySchema.limit` sobe max para 15.
  - Adicionar `mealType: mealTypeSchema.optional()`.
- [X] T006 Atualizar `src/modules/nutrition/repositories/nutrition-store.ts`:
  - `ListRecentConsumedFoodsOptions` ganha `mealType?: MealType`.
  - `buildRecentConsumedFoods` aceita e aplica filtro antes da dedup.
  - `listRecentConsumedFoods` repassa o filtro nos dois caminhos (memória e DB).
- [X] T007 Atualizar `src/modules/nutrition/client-storage.ts`:
  - `listRecentNutritionFoodsFromBrowser` aceita `mealType?: MealType` e
    propaga ao `buildRecentConsumedFoods`.
- [X] T008 Atualizar `src/app/api/nutrition/foods/recent/route.ts`:
  - Ler `mealType` da URL; passar a `listRecentConsumedFoods`.
- [X] T009 Atualizar `src/modules/nutrition/hooks/useNutritionSearch.ts`:
  - `loadRecentFoods` usa `searchMealContextRef.current` na URL e no
    fallback browser.
  - `setSearchMealContext` aciona reload.
  - Guard: ignorar respostas cujo `mealType` não bate com o foco atual.

## Phase 3 — Polish

- [X] T010 Rodar `npm test` e `npm run lint`; corrigir o que quebrar.
- [X] T011 Atualizar `specs/005-nutrition-recent-copy/contracts/recent-foods-api.md`
  com nota sobre o novo `mealType` e o novo teto de `limit`.
