# Quickstart: Recentes por refeição

## Verificação manual (após implementação)

1. `npm test -- recent` — suite de recentes deve ficar verde.
2. `npm run lint`.
3. `npm run build` se dependências ou rotas mudarem.
4. Em modo dev, autenticado, abrir Nutrição:
   - Selecionar Café da manhã; abrir busca; conferir se recentes mostram apenas
     itens de Café da manhã.
   - Trocar para Jantar; conferir que a lista recarrega e muda.
   - Em refeição sem histórico, conferir que a seção não aparece.

## Chamada de API

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/nutrition/foods/recent?mealType=breakfast&limit=15"
```

## TDD — ordem de RED-GREEN

Escrever primeiro (e deixar falhando):

1. `src/modules/nutrition/validators.test.ts` — novo caso: aceitar `mealType`
   válido, rejeitar `mealType` inválido, aceitar `limit=15`, rejeitar `limit=16`.
2. `src/modules/nutrition/repositories/nutrition-store.test.ts` — novo caso:
   `listRecentConsumedFoods` filtra por `mealType` tanto em memória quanto em
   DB (adaptar mock pool ou seed).
3. `src/modules/nutrition/client-storage.test.ts` (criar se não existir) —
   `listRecentNutritionFoodsFromBrowser` filtra por `mealType`.
4. `src/app/api/nutrition/foods/recent/route.test.ts` — rota repassa `mealType`
   e retorna 400 para valor inválido.
5. `src/modules/nutrition/hooks/useNutritionSearch.test.ts` (ou equivalente) —
   `loadRecentFoods` inclui `mealType` na URL e recarrega ao trocar foco.

Depois implementar nos arquivos:

- `src/modules/nutrition/validators.ts`
- `src/modules/nutrition/repositories/nutrition-store.ts`
- `src/modules/nutrition/client-storage.ts`
- `src/app/api/nutrition/foods/recent/route.ts`
- `src/modules/nutrition/hooks/useNutritionSearch.ts`
