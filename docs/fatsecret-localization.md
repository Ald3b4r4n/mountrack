# FatSecret Localization

## Objetivo

Manter a busca nutricional coerente para usuarios no Brasil sem esconder o
fallback internacional do FatSecret quando ele for a unica fonte externa
disponivel.

## Premissas

- A busca FatSecret localizada deve enviar `region=BR` e `language=pt`.
- `language` depende de `region`; sem `region`, a busca tende ao padrao
  internacional do provedor.
- A passagem default pode retornar alimentos uteis, mas esses itens nao devem
  receber automaticamente `locale=pt-BR` ou `countryCode=BR`.
- Resultados TBCA, catalogo local, `locale=pt-*` e `countryCode=BR` devem vencer
  fallback internacional quando a relevancia da busca for comparavel.

Referencias oficiais:

- https://platform.fatsecret.com/docs/guides/localization
- https://platform.fatsecret.com/docs/v3/foods.search

## Fluxo implementado

1. `searchFatSecretFoods` executa primeiro uma passagem localizada com
   `region=BR` e `language=pt`.
2. A normalizacao recebe contexto de origem da passagem. Somente a passagem
   localizada marca `locale` e `countryCode`.
3. A passagem default roda sem `region` e sem `language`.
4. Quando a passagem localizada nao traz itens e a default traz, o provider
   registra diagnostico tecnico no log.
5. `searchNutritionCatalog` ranqueia catalogo/TBCA e FatSecret juntos para que
   resultado brasileiro relevante nao fique abaixo de fallback internacional
   apenas por ser FatSecret.

## Verificacao

```powershell
npm test -- --runInBand src/modules/nutrition/providers/fatsecret.test.ts src/modules/nutrition/services/catalog-search.service.test.ts src/app/api/nutrition/foods/search/route.test.ts
```

```powershell
npm test -- --runInBand src/components/nutrition/FoodSearchPanel.test.tsx src/components/nutrition/FoodSearchResultsSection.test.tsx src/components/nutrition/SourceFilterChips.test.tsx src/modules/nutrition/hooks/useNutritionSearch.test.tsx
```
