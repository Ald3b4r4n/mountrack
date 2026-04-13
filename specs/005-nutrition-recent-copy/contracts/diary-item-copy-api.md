# API Contract: Diary Item Copy

## POST /api/nutrition/diary-items/[id]/copy

**Auth**: Required via `requireNutritionUser`
**Purpose**: Copiar um item existente do diário para outra refeição ou data,
preservando quantidade, unidade e totais nutricionais.

### Path Parameters

| Name | Type | Required | Rules |
|------|------|----------|-------|
| `id` | string | yes | id do item de origem pertencente ao usuário autenticado |

### Request Body

```typescript
{
  targetDate: string;       // YYYY-MM-DD
  targetMealType: "breakfast" | "lunch" | "dinner" | "snack" | `custom:${string}`;
  targetMealLabel?: string; // max 40 chars
  consumedAt?: string;      // ISO datetime; backend usa agora quando omitido
}
```

### Response - 201 Created

```typescript
{
  diary: DiaryRecord;
  item: DiaryItemSnapshot;
}
```

### Behavior

- Cria novo `item.id`.
- Mantém `foodId`, `foodName`, `quantity`, `unit`, `calories`, `protein`,
  `carbs`, `fat`, `fiber` e `sodium` do item de origem.
- Atualiza `mealType`, `mealLabel`, `diaryId` e `consumedAt`.
- Não altera o item original.
- Garante que a refeição destino exista nas definições do diário.
- Retorna o diário atualizado para hidratar dashboard/histórico.

### Response - 404 Not Found

Usado quando o item não existe ou não pertence ao usuário autenticado.

```json
{ "error": "Diary item not found" }
```

### Response - 400 Bad Request

```json
{ "error": "Invalid copy request" }
```

### User-Facing Copy

Textos sugeridos para UI:

- Ação na linha: `Copiar`
- Acessibilidade: `Copiar {alimento} para outra refeição`
- Diálogo: `Escolha a refeição`
- Sucesso: `Alimento copiado para {refeição}.`
- Erro: `Não foi possível copiar esse alimento agora.`

Não exibir devnotes, TODOs, nomes de rotas, stack traces ou códigos internos para
usuários.
