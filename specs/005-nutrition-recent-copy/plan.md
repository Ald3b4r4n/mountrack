# Implementation Plan: Atalhos de alimentos recentes e cópia entre refeições

**Branch**: `005-nutrition-recent-copy` | **Date**: 2026-04-13 | **Spec**: `specs/005-nutrition-recent-copy/spec.md`
**Input**: Feature specification from `/specs/005-nutrition-recent-copy/spec.md`

## Summary

Adicionar dois atalhos ao fluxo de Nutrição: uma lista de "Consumidos recentemente"
para registrar novamente alimentos já usados e uma ação "Copiar" na linha de cada
item do diário para duplicá-lo em outra refeição. A abordagem reaproveita
`DiaryItemSnapshot`, `nutrition_diary_items`, `saveDiaryItem`, o fallback local do
navegador e os componentes atuais de diário, sem criar nova tabela nesta fase.

## Technical Context

**Language/Version**: TypeScript 5 com strict mode
**Primary Dependencies**: Next.js 16.1.6 App Router, React 19.2.3, Tailwind CSS 3.4.19, DaisyUI 4.12.24, Zod 4.3.6, pg
**Storage**: Supabase/PostgreSQL via `pg`, com fallback em memória/localStorage para modo volátil
**Testing**: Jest 30.2.0, @testing-library/react 16.3.2, jsdom
**Target Platform**: Web/PWA mobile-first, viewport mínimo de 375px
**Project Type**: Aplicação web full-stack com App Router e API routes
**Performance Goals**: Recentes carregados em até 300ms quando há banco disponível; ação de cópia refletida na UI sem refresh manual
**Constraints**: Sem nova dependência; sem devnotes visíveis; textos finais em português-BR; preservar compatibilidade com refeições customizadas
**Scale/Scope**: Módulo de Nutrição, 2 endpoints, 2 a 4 componentes/handlers, testes de rota, repositório e UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TDD**: PASS. Testes devem ser escritos primeiro para:
  `listRecentConsumedFoods`, `POST /api/nutrition/diary-items/[id]/copy`,
  `GET /api/nutrition/foods/recent`, `DiaryItemRow` com ação de copiar e o bloco
  "Consumidos recentemente". O estado vermelho deve ser provado com `npm test --
  --runInBand <arquivo-de-teste>`.
- **Documentation**: PASS. Esta pasta contém spec, plan, research, data-model,
  quickstart e contratos. A implementação deve manter estes artefatos atualizados
  se o contrato mudar.
- **README**: PASS com ação obrigatória na implementação. Como a feature altera
  capacidade visível do produto em Nutrição, `README.md` deve receber nota curta
  em "Principais Recursos" ou "Nutrição" quando o código for entregue.
- **Clean Code**: PASS. Responsabilidades permanecem separadas:
  repositório/serviço para consulta e cópia, rotas para contrato HTTP, hooks para
  orquestração de estado e componentes para UI.
- **Security & Integration**: PASS. Endpoints exigem `requireNutritionUser`,
  consultas ficam escopadas por `user.uid`, nenhum segredo novo e nenhuma
  integração externa nova.
- **Quality Checks**: PASS. Validação esperada: `npm test`, `npm run lint`,
  `npm run build`; `npm audit --audit-level=high` somente se dependências forem
  alteradas.

## Project Structure

### Documentation (this feature)

```text
specs/005-nutrition-recent-copy/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── recent-foods-api.md
    └── diary-item-copy-api.md
```

### Source Code (repository root)

```text
src/
├── app/api/nutrition/
│   ├── foods/recent/route.ts
│   └── diary-items/[id]/copy/route.ts
├── components/nutrition/
│   ├── DiaryItemRow.tsx
│   ├── FoodSearchPanel.tsx
│   ├── FoodSearchResultsSection.tsx
│   └── MealHistoryDialog.tsx
├── components/nutrition/useNutritionScreenActions.ts
├── components/nutrition/NutritionScreen.tsx
└── modules/nutrition/
    ├── client-storage.ts
    ├── repositories/nutrition-store.ts
    ├── repositories/memory-store.ts
    ├── validators.ts
    └── domain/types.ts
```

**Structure Decision**: Manter projeto único Next.js. A lista de recentes e a
cópia ficam no domínio de nutrição; nenhuma abstração compartilhada fora de
`src/modules/nutrition` é necessária.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nenhuma violação planejada | N/A | N/A |

## Phase 0: Research

Concluído em `research.md`.

Decisões principais:

- Derivar recentes de `nutrition_diary_items` em vez de criar tabela nova.
- Usar uma rota dedicada de cópia para duplicar `DiaryItemSnapshot` existente.
- Exibir recentes no contexto da busca, com CTA limpo em português-BR.
- Adicionar ação "Copiar" na linha do diário, ao lado de editar/remover.
- Manter fallback local usando `client-storage.ts`.

## Phase 1: Design & Contracts

Concluído em:

- `data-model.md`
- `contracts/recent-foods-api.md`
- `contracts/diary-item-copy-api.md`
- `quickstart.md`

## Design Details

### Recentes

Implementar `listRecentConsumedFoods(userId, { limit })` em
`nutrition-store.ts`. No PostgreSQL, consultar `nutrition_diary_items` com join em
`nutrition_diaries`, filtrar por `user_id`, ordenar por `consumed_at desc` e
deduplicar por `foodId`, mantendo a ocorrência mais recente. No fallback, varrer
diários do usuário no store local e aplicar a mesma ordenação/deduplicação.

O endpoint `GET /api/nutrition/foods/recent?limit=8` retorna uma projeção de
`DiaryItemSnapshot`; ele não expõe dados de outro usuário e não depende do
catálogo externo.

### Cópia

Implementar `copyDiaryItem(userId, sourceItemId, target)` ou composição
equivalente no repositório/serviço:

1. localizar item origem escopado por usuário;
2. criar novo snapshot com `crypto.randomUUID()`, `targetDate`,
   `targetMealType`, `targetMealLabel` e `consumedAt` atual por padrão;
3. persistir via `saveDiaryItem`;
4. retornar `{ diary, item }`.

O endpoint `POST /api/nutrition/diary-items/[id]/copy` centraliza a regra e evita
duplicar cálculo nutricional no cliente.

### UI

- `FoodSearchPanel` recebe `recentFoods`, estado de loading e callback
  `onRegisterRecentFood`.
- A seção deve usar título "Consumidos recentemente" e CTAs como "Registrar" ou
  "Registrar novamente".
- `DiaryItemRow` recebe `onCopy?: (item) => void` e mostra um botão com
  `aria-label="Copiar {nome} para outra refeição"`.
- O seletor de refeição para cópia pode reutilizar padrão do `MealSwitchDialog`
  ou um diálogo enxuto novo se o componente atual não servir.
- Mensagens de sucesso: "Alimento copiado para {refeição}." e "Alimento
  registrado em {refeição}."
- Mensagens de erro: "Não foi possível copiar esse alimento agora." e "Não foi
  possível registrar esse alimento agora."

### Testes TDD

1. `nutrition-store.test.ts`
   - lista recentes escopados por usuário;
   - deduplica por `foodId`;
   - copia item criando novo `id` sem alterar origem.
2. `recent/route.test.ts`
   - exige autenticação;
   - retorna recentes em formato estável;
   - limita `limit` dentro do intervalo permitido.
3. `copy/route.test.ts`
   - copia item para outra refeição;
   - retorna 404 para item inexistente ou de outro usuário;
   - rejeita payload inválido.
4. `DiaryItemRow.test.tsx`
   - renderiza botão Copiar;
   - dispara callback com item correto;
   - mantém labels em português-BR.
5. `FoodSearchPanel.test.tsx` ou componente extra de recentes
   - renderiza "Consumidos recentemente";
   - aciona registro rápido;
   - não renderiza devnotes em estado vazio.

## Post-Design Constitution Check

- **TDD**: PASS. Testes definidos por camada e devem falhar antes da produção.
- **Documentation**: PASS. Artefatos gerados nesta pasta.
- **README**: PASS com ação futura obrigatória na implementação.
- **Clean Code**: PASS. Sem nova dependência, sem nova tabela e com regra de cópia
  no backend.
- **Security & Integration**: PASS. Escopo de usuário e validação via Zod.
- **Quality Checks**: PASS. Comandos esperados documentados no quickstart.
