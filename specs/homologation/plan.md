# Implementation Plan: Recentes por refeição em Nutrição

**Branch**: `homologation` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: `specs/homologation/spec.md`

## Summary

Ajustar a lista "Consumidos recentemente" para refletir apenas a refeição em
foco (Café da manhã, Almoço, Jantar, Lanche ou refeição customizada) e elevar o
teto de itens para 15. A API ganha parâmetro opcional `mealType`; a projeção
aplica o filtro antes da deduplicação por `foodId`; o hook de busca repassa a
refeição em foco e recarrega quando o foco muda. Modo browser-volátil mantém
paridade. Testes são escritos primeiro, em todos os pontos de mudança (validator,
store DB, store memória, rota, client-storage, hook), seguindo TDD.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: Next.js (app router), Zod 4, Postgres `pg`, React,
TailwindCSS/DaisyUI (sem mudança).
**Storage**: PostgreSQL via `nutrition_diary_items`; fallback volátil em memória
/ localStorage. Nenhuma migração.
**Testing**: Jest (`npm test`), mesmos padrões dos arquivos `*.test.ts(x)`
existentes em `src/modules/nutrition/` e `src/app/api/nutrition/`.
**Target Platform**: Web Next.js (mobile-first).
**Project Type**: web-app.
**Performance Goals**: payload de recentes <5 KB com `limit=15`; nenhuma nova
consulta externa.
**Constraints**: manter back-compat — requisições sem `mealType` continuam
funcionando; TypeScript strict; português-BR limpo.
**Scale/Scope**: 1 rota, 1 hook, 1 store DB, 1 store browser, 1 validator,
≈5 arquivos de teste.

## Constitution Check

Avaliação contra `.specify/memory/constitution.md` v1.1.0:

1. **TDD obrigatório** — Respeitado. Testes falham primeiro em validator, store
   (DB e memória), client-storage, rota e hook. `quickstart.md` registra a
   ordem.
2. **Clean Code e simplicidade** — Respeitado. Reuso de `mealTypeSchema`;
   filtro único em `buildRecentConsumedFoods`; nenhum novo endpoint; nenhuma
   abstração prematura.
3. **Documentação técnica viva** — Respeitado. `specs/homologation/` completa e
   contrato 005 atualizado no mesmo PR.
4. **README** — Sem impacto. Feature refina comportamento interno; será
   declarado "README sem alteração necessária" no PR.
5. **Boas práticas** — Respeitado. Validação Zod no limite público, sem
   exposição de detalhes de erro, sem novas dependências, sem mudança de
   autenticação/billing.

Gates: **PASS**.

## Phase 0 — Research

Consolidado em [research.md](./research.md).

Unknowns resolvidos:

- Forma de passar a refeição → query `mealType` opcional.
- Onde aplicar o filtro → `buildRecentConsumedFoods` (compartilhado DB/memória).
- Limite → `1..15`, default `8`.
- Race condition de foco → guard comparando `mealType` da resposta com foco
  corrente no hook.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — mudança apenas na query; entidade de
  resposta inalterada.
- [contracts/recent-foods-per-meal-api.md](./contracts/recent-foods-per-meal-api.md)
  — contrato da rota com o novo parâmetro e novo teto.
- [quickstart.md](./quickstart.md) — passos de TDD e verificação manual.

### Arquivos a alterar (para orientação da fase de tarefas)

- `src/modules/nutrition/validators.ts` — estender `recentFoodsQuerySchema`.
- `src/modules/nutrition/repositories/nutrition-store.ts` — aceitar `mealType`
  em `ListRecentConsumedFoodsOptions`, `listRecentConsumedFoods` e
  `buildRecentConsumedFoods`.
- `src/modules/nutrition/client-storage.ts` — `listRecentNutritionFoodsFromBrowser`
  aceita `mealType`.
- `src/app/api/nutrition/foods/recent/route.ts` — ler `mealType` da URL, passar
  ao store.
- `src/modules/nutrition/hooks/useNutritionSearch.ts` — `loadRecentFoods` usa
  `searchMealContextRef.current`, recarrega via `setSearchMealContext`, guarda
  contra resposta fora de foco.

### Agent context

Executar ao final da fase de tarefas:
`.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`

### Reavaliação de Constituição (pós-design)

Nada muda: nenhum novo ponto de acoplamento, nenhuma dependência nova, nenhum
segredo, nenhuma quebra de compat. Gates continuam **PASS**.

## Phase 2 — Planning complete

Próximo passo: `/speckit.tasks` para gerar `tasks.md` a partir deste plano.

## Artefatos gerados

- `specs/homologation/spec.md`
- `specs/homologation/plan.md`
- `specs/homologation/research.md`
- `specs/homologation/data-model.md`
- `specs/homologation/contracts/recent-foods-per-meal-api.md`
- `specs/homologation/quickstart.md`
