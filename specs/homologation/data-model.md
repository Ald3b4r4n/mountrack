# Data Model: Recentes por refeição

Nenhuma alteração de schema de banco. Apenas o contrato da query da API é
ajustado.

## RecentFoodsQuery (query string de `GET /api/nutrition/foods/recent`)

| Campo | Tipo | Obrigatório | Regras |
|-------|------|-------------|--------|
| `limit` | number | não | inteiro, `1..15`, default `8` |
| `mealType` | string | não | mesmo regex do `mealTypeSchema`: `breakfast\|lunch\|dinner\|snack\|custom:[a-z0-9-]{1,48}` |

## RecentConsumedFood (resposta)

Sem alteração. Mantém:

- `sourceItemId`, `foodId`, `foodName`, `quantity`, `unit`, `calories`,
  `lastConsumedAt`, `lastMealType`, `lastMealLabel?`.

## Regras de projeção

1. Consumir itens do diário do usuário ordenados por `consumedAt` desc.
2. Se `mealType` presente na query: descartar itens cujo `item.mealType !== query.mealType`.
3. Deduplicar por `foodId`, mantendo o mais recente.
4. Retornar até `limit` itens.
