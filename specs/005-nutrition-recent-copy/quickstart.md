# Quickstart: Atalhos de alimentos recentes e cópia entre refeições

**Branch**: `005-nutrition-recent-copy` | **Date**: 2026-04-13

## Antes de implementar

1. Ler os contratos em `specs/005-nutrition-recent-copy/contracts/`.
2. Confirmar os pontos atuais:

```bash
rg -n "saveDiaryItem|findDiaryItemById|replaceDiaryItem|removeDiaryItem" src/modules/nutrition/repositories/nutrition-store.ts
rg -n "DiaryItemRow|FoodSearchPanel|useNutritionScreenActions" src/components/nutrition
```

3. Escrever os testes primeiro e confirmar falha inicial.

## Ordem de implementação sugerida

1. Repositório/serviço de recentes e cópia.
2. Rotas HTTP:
   - `GET /api/nutrition/foods/recent`
   - `POST /api/nutrition/diary-items/[id]/copy`
3. Fallback local em `client-storage.ts`.
4. UI de "Consumidos recentemente".
5. Ação "Copiar" na `DiaryItemRow` e seletor de refeição.
6. Hidratação de dashboard/histórico após mutações.
7. README curto sobre a nova capacidade de Nutrição.

## TDD: comandos por etapa

### Repositório

```bash
npm test -- --runInBand src/modules/nutrition/repositories/nutrition-store.test.ts
```

Testes mínimos:

- lista recentes apenas do usuário autenticado;
- deduplica por `foodId`;
- copia item com novo `id`;
- preserva item original.

### Rotas

```bash
npm test -- --runInBand src/app/api/nutrition/foods/recent/route.test.ts
npm test -- --runInBand src/app/api/nutrition/diary-items/[id]/copy/route.test.ts
```

Testes mínimos:

- exige autenticação;
- valida payload/query;
- retorna 404 para item inexistente ou de outro usuário;
- retorna `201` com diário atualizado ao copiar.

### Componentes

```bash
npm test -- --runInBand src/components/nutrition/DiaryItemRow.test.tsx
npm test -- --runInBand src/components/nutrition/FoodSearchPanel.test.tsx
```

Testes mínimos:

- botão `Copiar` aparece na linha;
- `aria-label` descreve a ação em português-BR;
- seção `Consumidos recentemente` aparece quando há dados;
- estado vazio não exibe devnotes, TODOs ou texto técnico.

## Checks finais

```bash
npm test
npm run lint
npm run build
```

Executar também se houver alteração de dependências:

```bash
npm audit --audit-level=high
```

## Padrão de texto para usuário

Usar português-BR direto e sem termos internos:

- `Consumidos recentemente`
- `Registrar`
- `Registrar novamente`
- `Copiar`
- `Escolha a refeição`
- `Alimento copiado para {refeição}.`
- `Não foi possível copiar esse alimento agora.`

Não usar em UI:

- `devnote`
- `TODO`
- `debug`
- `copy endpoint`
- stack trace
- nomes de arquivos ou rotas

## Resultado da implementação em 2026-04-13

- `npm test`: passou com 83 suites e 409 testes.
- `npm run lint`: passou com 5 avisos já existentes fora do escopo da feature.
- `npm run build`: passou e confirmou as rotas `/api/nutrition/foods/recent` e `/api/nutrition/diary-items/[id]/copy`.
- `npm audit --audit-level=high`: falhou com 16 vulnerabilidades; plano de mitigação registrado em `docs/dependency-audit-notes.md`.
- Correção mobile posterior: `npx jest --runInBand src/components/nutrition/FoodSearchPanel.test.tsx` passou com regressão para nomes longos em "Consumidos recentemente".
