# Data Model: Atalhos de alimentos recentes e cópia entre refeições

**Branch**: `005-nutrition-recent-copy` | **Date**: 2026-04-13

## Existing Entities

| Entity | Storage | Uso nesta feature |
|--------|---------|-------------------|
| `nutrition_diaries` | PostgreSQL | Escopo por `user_id` e data do diário |
| `nutrition_diary_items` | PostgreSQL | Fonte dos alimentos recentes e origem da cópia |
| `DiaryItemSnapshot` | JSON payload | Snapshot copiado para novo item |
| `NutritionBrowserDiary` | localStorage | Fallback local para recentes e cópia |

## New Derived Entity: RecentConsumedFood

Entidade derivada, não persistida em tabela nova.

```typescript
interface RecentConsumedFood {
  sourceItemId: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: "g" | "ml" | "serving" | "unit";
  calories: number;
  lastConsumedAt: string;
  lastMealType: MealType;
  lastMealLabel?: string;
}
```

### Validation Rules

- `sourceItemId` deve apontar para item pertencente ao usuário autenticado.
- `limit` deve aceitar intervalo seguro, por exemplo `1..12`, com padrão `8`.
- Dedupe por `foodId`, preservando item com `lastConsumedAt` mais recente.
- Itens sem `foodId` ou sem `foodName` não devem entrar na resposta.

## New Request: DiaryItemCopyRequest

```typescript
interface DiaryItemCopyRequest {
  targetDate: string;
  targetMealType: MealType;
  targetMealLabel?: string;
  consumedAt?: string;
}
```

### Validation Rules

- `targetDate` deve seguir `YYYY-MM-DD`.
- `targetMealType` deve aceitar refeições padrão e `custom:<slug>`.
- `targetMealLabel` deve ter no máximo 40 caracteres quando enviado.
- `consumedAt`, quando enviado, deve ser ISO datetime válido.
- Se `consumedAt` não for enviado, usar horário atual no backend.

## State Transitions

### Registro de alimento recente

```text
RecentConsumedFood selecionado
        |
        v
POST /api/nutrition/diary-items/[sourceItemId]/copy
        |
        v
Novo DiaryItemSnapshot no diário da data ativa
        |
        v
Dashboard, refeição e histórico recarregados
```

### Cópia entre refeições

```text
Item origem existe no diário
        |
        v
Usuário aciona Copiar na linha do item
        |
        v
Usuário escolhe refeição destino
        |
        v
Backend cria novo snapshot com novo id e destino
        |
        v
Item original permanece intacto
```

## Repository Functions

```typescript
interface ListRecentConsumedFoodsOptions {
  limit?: number;
}

async function listRecentConsumedFoods(
  userId: string,
  options?: ListRecentConsumedFoodsOptions,
): Promise<RecentConsumedFood[]>;

async function copyDiaryItem(
  userId: string,
  sourceItemId: string,
  input: DiaryItemCopyRequest,
  targetCalories: number,
  targetWaterMl: number,
): Promise<{ diary: DiaryRecord; item: DiaryItemSnapshot } | null>;
```

## No Schema Changes

Não há migration planejada. A feature usa:

- `nutrition_diary_items.payload` para snapshot;
- `nutrition_diary_items.consumed_at` para ordenação;
- `nutrition_diaries.user_id` para escopo;
- `nutrition_diaries.diary_date` para destino da cópia.

Se performance futura exigir otimização, avaliar índice adicional por
`nutrition_diary_items(consumed_at desc)`, mas não introduzir agora sem métrica.
