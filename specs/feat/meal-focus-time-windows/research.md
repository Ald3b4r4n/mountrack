# Research: Refeição em foco por faixa de horário

## Decisão 1: Janelas canônicas em minutos do dia

- **Decisão**: Representar cada janela como `[startMinutes, endMinutes]` em
  `[0, 1440)`. Janelas:
  - breakfast: 360–660 (06:00–11:00) **e** 0–360 (00:00–06:00) por rotação.
  - lunch: 661–840 (11:01–14:00).
  - snack: 841–1080 (14:01–18:00).
  - dinner: 1081–1439 (18:01–23:59).
- **Rationale**: Minutos evitam erros de ponto flutuante e facilitam igualdade
  exata nas fronteiras (11:00 vs 11:01). A rotação pós-meia-noite é absorvida
  em breakfast, evitando regra especial no caller.
- **Alternativas**: guardar como "hora de início" apenas. Rejeitada — exigiria
  regra extra para 11:01 vs 11:00.

## Decisão 2: Pureza da função de mapeamento

- **Decisão**: `getMealFocusForHour(hour, minute) → DefaultMealType`, 100%
  pura; `getDefaultFocusedMeal(now = new Date())` permanece como wrapper que
  lê o relógio.
- **Rationale**: Testes determinísticos sem `jest.useFakeTimers` só para
  mapear. `useFakeTimers` fica reservado para teste de rotação automática.

## Decisão 3: Override manual escopado à janela atual

- **Decisão**: Ao trocar manualmente o foco, registrar
  `manualOverrideWindow = currentWindow`. No tick de 60s: se `nowWindow !==
  manualOverrideWindow`, descartar override e aplicar foco default da
  `nowWindow`. Se `nowWindow === manualOverrideWindow`, respeitar override.
- **Rationale**: Atende o bug do usuário (foco trava em refeição anterior
  após cruzar fronteira). Alternativa de "override eterno até manual" causa
  exatamente o problema relatado.
- **Alternativas consideradas**:
  - TTL em minutos: complexo, pouco previsível.
  - Override só "por sessão" (até recarga): mantém trava intra-sessão.

## Decisão 4: Custom fora do foco rotativo

- **Decisão**: `getDefaultFocusedMeal` retorna apenas `DefaultMealType`. Na
  carga, se valor persistido é `custom:...`, descartar e recomputar.
- **Rationale**: Usuário pediu explicitamente; elimina o caso onde custom
  persistido bloqueia a rotação.

## Decisão 5: Persistência

- **Decisão**: `saveNutritionFocusedMealToBrowser` continua gravando o valor
  atual (útil para retomar imediatamente após reload quando dentro da mesma
  janela). Na carga, se o valor for custom OU se a janela atual difere da
  janela em que o valor era default, recomputar.
- **Rationale**: equilibra continuidade com correção da rotação.

## Decisão 6: Timer

- **Decisão**: Manter `setInterval(60_000)`. Drift de até 60s é aceitável.
- **Alternativas**: alinhar `setTimeout` ao próximo minuto exato. Rejeitado
  por complexidade e ganho marginal.

## Riscos

- Fronteira exata 11:00 vs 11:01: testar ambas para evitar off-by-one.
- Concorrência entre hook de auto-sync e persistência: registrar `mealType`
  no mesmo estado que a UI lê; evitar set duplo.
- Mocks de `Date` em testes de UI: usar `jest.useFakeTimers({ now: ... })`.
