# Implementation Plan: Refeição em foco por faixa de horário

**Branch**: `feat/meal-focus-time-windows` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: `specs/feat/meal-focus-time-windows/spec.md`

## Summary

Corrigir o cálculo da refeição em foco para usar as faixas definidas pelo
produto (breakfast 00–11:00, lunch 11:01–14:00, snack 14:01–18:00, dinner
18:01–23:59; após 00:00 rotaciona para breakfast). Garantir rotação automática
ao cruzar fronteira mesmo após override manual (override expira ao fim da
janela). Excluir refeições custom do foco rotativo — elas seguem disponíveis
como destino manual no fluxo de adicionar alimento.

## Technical Context

**Language/Version**: TypeScript 5 (strict).
**Primary Dependencies**: Next.js, React, Jest/RTL (sem nova dep).
**Storage**: localStorage via `client-storage.ts`; sem alteração no banco.
**Testing**: `src/components/nutrition/nutrition-screen-helpers.test.ts` (puro)
e `src/components/nutrition/NutritionScreen.test.tsx` (integração com
`jest.useFakeTimers`).
**Target Platform**: Web Next.js (mobile-first).
**Project Type**: web-app.
**Performance Goals**: overhead imperceptível; função pura O(1) com 4
entradas; `setInterval(60s)` já existente.
**Constraints**: horário local do dispositivo; granularidade de 1 min.
**Scale/Scope**: 1 arquivo novo (helper puro), ~3 arquivos alterados, 2 suites
de teste.

## Constitution Check

Avaliação contra `.specify/memory/constitution.md` v1.1.0:

1. **TDD obrigatório** — Respeitado. Testes puros e de integração escritos e
   validados como RED antes da implementação (ordem em
   [quickstart.md](./quickstart.md)).
2. **Clean Code e simplicidade** — Respeitado. Função pura em 1 helper novo;
   override com uma única ref; nenhuma abstração prematura.
3. **Documentação técnica viva** — Respeitado. Artefatos criados em
   `specs/feat/meal-focus-time-windows/`.
4. **README** — Sem impacto. Declarar "README sem alteração necessária".
5. **Boas práticas** — Respeitado. Sem segredo, sem mudança de auth/billing,
   sem nova dep.

Gates: **PASS**.

## Phase 0 — Research

Consolidado em [research.md](./research.md). Decisões-chave: minutos do dia
como unidade canônica; função pura; override escopado à janela; custom fora
do foco rotativo; persistência mantém, descarte aplicado na carga.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — estado de UI e helpers.
- [contracts/meal-focus-ui-contract.md](./contracts/meal-focus-ui-contract.md) — contrato da função pura + comportamento da UI.
- [quickstart.md](./quickstart.md) — ordem TDD e verificação manual.

### Arquivos a criar / alterar (para guiar a fase de tarefas)

- **Criar**: `src/modules/nutrition/meal-focus-windows.ts`
  - Exporta `MEAL_FOCUS_WINDOWS`, `getMealFocusForHour`, `getMealFocusWindow`.
- **Alterar**: `src/components/nutrition/nutrition-screen-helpers.ts`
  - `getDefaultFocusedMeal` delega ao helper puro.
  - Remover `getMealFocusForHour` antigo.
- **Alterar**: `src/components/nutrition/NutritionScreen.tsx`
  - Substituir guard `lastAutoSyncedMealRef` por `manualOverrideMinuteRef`
    (minuto-do-dia em que o override foi aplicado) + comparação de janela.
  - Na carga: descartar custom persistido; validar janela do default.
- **Alterar**: `src/components/nutrition/nutrition-screen-helpers.test.ts`
  - Novos casos de borda (ver quickstart).
- **Alterar**: `src/components/nutrition/NutritionScreen.test.tsx`
  - Teste de rotação automática com relógio fake.
  - Teste de descarte de custom persistido.

### Agent context

Executar ao final da fase de tarefas:
`.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`.

### Reavaliação de Constituição (pós-design)

Sem mudança: nenhum novo acoplamento, nenhuma dep, nenhum segredo; fluxo
de telemetria/logs inalterado. Gates continuam **PASS**.

## Phase 2 — Planning complete

Próximo: `/speckit.tasks` para gerar `tasks.md` a partir deste plano.

## Artefatos gerados

- `specs/feat/meal-focus-time-windows/spec.md`
- `specs/feat/meal-focus-time-windows/plan.md`
- `specs/feat/meal-focus-time-windows/research.md`
- `specs/feat/meal-focus-time-windows/data-model.md`
- `specs/feat/meal-focus-time-windows/contracts/meal-focus-ui-contract.md`
- `specs/feat/meal-focus-time-windows/quickstart.md`
