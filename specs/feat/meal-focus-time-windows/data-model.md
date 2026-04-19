# Data Model: Refeição em foco por faixa de horário

Sem mudança em banco. Mudanças em tipos/constantes no módulo de nutrição.

## Novas constantes (puras)

```ts
// src/modules/nutrition/meal-focus-windows.ts (novo arquivo, ou dentro de constants)
export const MEAL_FOCUS_WINDOWS: ReadonlyArray<{
  mealType: DefaultMealType;
  startMinutes: number; // inclusive
  endMinutes: number;   // inclusive
}> = [
  { mealType: "breakfast", startMinutes: 0,    endMinutes: 660  }, // 00:00–11:00
  { mealType: "lunch",     startMinutes: 661,  endMinutes: 840  }, // 11:01–14:00
  { mealType: "snack",     startMinutes: 841,  endMinutes: 1080 }, // 14:01–18:00
  { mealType: "dinner",    startMinutes: 1081, endMinutes: 1439 }, // 18:01–23:59
];
```

## Funções

- `getMealFocusForHour(hour: number, minute: number): DefaultMealType`
  - Pura. Recebe `hour: 0..23`, `minute: 0..59`.
  - Calcula `minutes = hour * 60 + minute` e retorna a `mealType` da janela
    contendo o minuto.
- `getMealFocusWindow(mealType: DefaultMealType): { start: number; end: number }`
  - Usada para comparar "janela atual" vs "janela do override".
- `getDefaultFocusedMeal(now: Date = new Date()): DefaultMealType`
  - Wrapper: `getMealFocusForHour(now.getHours(), now.getMinutes())`.

## Estado de UI

Em `NutritionScreen` (ou hook dedicado):

- `activeDiaryMeal: MealType` (como já existe).
- `manualOverrideMinuteRef: React.MutableRefObject<number | null>` — guarda o
  minuto-do-dia em que o override foi aplicado; null quando sem override.
- No tick de 60s:
  1. `next = getDefaultFocusedMeal(new Date())`.
  2. Se override é null ou a janela do override != janela atual: `setActiveDiaryMeal(next)` (se diferir) e limpar override.
  3. Caso contrário: manter.

## Regras de carga (na montagem)

1. Ler `loadNutritionFocusedMealFromBrowser(userId)`.
2. Se valor é `custom:...`, ignorar.
3. Se valor é default, comparar com `getDefaultFocusedMeal(new Date())`.
   - Se pertencer à mesma janela atual, manter (continuidade).
   - Caso contrário, usar o default da janela atual.

## Persistência

- `saveNutritionFocusedMealToBrowser` continua aceitando `MealType`. Quando o
  valor é `custom:...`, persiste normalmente — a regra de descarte está na
  carga, não na gravação.

## Impacto em dedup/foco rotativo

Nenhum. A lista de refeições disponíveis no "adicionar alimento" continua
incluindo defaults + customs. Apenas a rotação automática ignora customs.
