# API Contract: Recent Foods per Meal

## GET /api/nutrition/foods/recent

**Auth**: Required via `requireNutritionUser`
**Purpose**: Retornar alimentos consumidos recentemente, opcionalmente filtrados
pela refeição em foco.

### Query Parameters

| Name | Type | Required | Default | Rules |
|------|------|----------|---------|-------|
| `limit` | number | no | `8` | integer, min `1`, max `15` |
| `mealType` | string | no | — | `breakfast\|lunch\|dinner\|snack\|custom:[a-z0-9-]{1,48}` |

### Response - 200 OK

```typescript
{
  foods: Array<{
    sourceItemId: string;
    foodId: string;
    foodName: string;
    quantity: number;
    unit: "g" | "ml" | "serving" | "unit";
    calories: number;
    lastConsumedAt: string;
    lastMealType: "breakfast" | "lunch" | "dinner" | "snack" | `custom:${string}`;
    lastMealLabel?: string;
  }>;
}
```

### Behavior

- Retorna somente itens do usuário autenticado.
- Quando `mealType` presente: retorna apenas itens cujo `lastMealType` seja
  exatamente igual.
- Dedup por `foodId`, mantendo ocorrência mais recente (após o filtro por
  `mealType`, quando aplicável).
- Ordena por `lastConsumedAt` desc.
- Máximo de 15 itens.
- Sem provedor externo, sem stack trace, sem detalhes SQL.

### Response - 400 Bad Request

```json
{ "error": "Invalid recent foods query" }
```

### Response - 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### Compatibilidade

- Clientes que não enviam `mealType` mantêm o comportamento atual (lista global
  do usuário).
- O contrato anterior em `specs/005-nutrition-recent-copy/contracts/recent-foods-api.md`
  é substituído por este no que diz respeito a `mealType` e ao novo teto de
  `limit=15`.
