# Quickstart: Refeição em foco por faixa de horário

## TDD — ordem de escrita (RED primeiro)

1. `src/components/nutrition/nutrition-screen-helpers.test.ts`: novos casos para
   `getMealFocusForHour`:
   - 00:00 → breakfast
   - 05:59 → breakfast
   - 06:00 → breakfast
   - 11:00 → breakfast
   - 11:01 → lunch
   - 14:00 → lunch
   - 14:01 → snack
   - 18:00 → snack
   - 18:01 → dinner
   - 23:59 → dinner

2. Teste para `getDefaultFocusedMeal(now)`:
   - `new Date("2026-04-18T07:30:00")` → `breakfast`
   - `new Date("2026-04-18T11:01:00")` → `lunch`
   - `new Date("2026-04-18T00:10:00")` → `breakfast`

3. `NutritionScreen.test.tsx`: teste de integração com `jest.useFakeTimers`:
   - Montar a 13:00, override manual para `breakfast`, avançar relógio para
     14:01: esperar `snack` como foco atual.
   - Montar com valor persistido `custom:pre-treino` no localStorage, carregar:
     esperar default da janela atual, não `custom`.

## GREEN — ordem de implementação

1. Criar `src/modules/nutrition/meal-focus-windows.ts` com
   `MEAL_FOCUS_WINDOWS`, `getMealFocusForHour`, `getMealFocusWindow`.
2. Atualizar `src/components/nutrition/nutrition-screen-helpers.ts`:
   - `getDefaultFocusedMeal(now)` passa a delegar ao helper novo.
   - Remover a tabela de horas antiga de lá.
3. Atualizar `src/components/nutrition/NutritionScreen.tsx`:
   - Carga inicial: descartar custom persistido; validar janela do default.
   - Auto-sync: usar `getMealFocusWindow` para comparar janela do override vs
     janela atual. Descartar override quando diferir.
4. Garantir que `loadNutritionFocusedMealFromBrowser` continua retornando
   `MealType | null`; a regra de descartar custom é aplicada no consumidor.

## Verificação manual

- Rodar `npm test -- nutrition-screen-helpers NutritionScreen`.
- Abrir a UI em 11:00, depois em 11:01 (ajustar relógio do sistema) e confirmar
  transição.
- Criar refeição extra (`custom:pre-treino`) e validar que ela aparece no
  seletor de "adicionar alimento", mas não é escolhida como foco automático.
