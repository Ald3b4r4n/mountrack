# API Contract: Recent Consumed Foods

## GET /api/nutrition/foods/recent

**Auth**: Required via `requireNutritionUser`
**Purpose**: Retornar alimentos consumidos recentemente pelo usuário autenticado
para registro rápido.

### Query Parameters

| Name | Type | Required | Default | Rules |
|------|------|----------|---------|-------|
| `limit` | number | no | `8` | integer, min `1`, max `15` |
| `mealType` | string | no | — | `breakfast\|lunch\|dinner\|snack\|custom:[a-z0-9-]{1,48}` (filtra recentes pela refeição em foco) |

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
- Ordena por consumo mais recente.
- Deduplica por `foodId`, mantendo a ocorrência mais recente.
- Não consulta provedores externos.
- Não retorna stack trace, detalhes SQL ou mensagens internas.

### Response - 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### Response - 400 Bad Request

```json
{ "error": "Invalid recent foods query" }
```

### User-Facing Copy

Textos sugeridos para UI:

- Título: `Consumidos recentemente`
- Botão: `Registrar`
- Estado sem recentes: não exibir seção ou usar `Seus alimentos recentes vão aparecer aqui.`

Não exibir devnotes, TODOs ou mensagens técnicas para usuários.
