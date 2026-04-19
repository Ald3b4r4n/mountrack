# Research: Recentes por refeição

## Decisão 1: Adicionar `mealType` opcional à query de `/api/nutrition/foods/recent`

- **Decisão**: Estender `recentFoodsQuerySchema` com `mealType` opcional usando o
  `mealTypeSchema` já existente em `src/modules/nutrition/validators.ts`.
- **Rationale**: Reaproveita validação canônica (breakfast/lunch/dinner/snack/
  `custom:...`), mantém consistência com o resto da API de nutrição e evita
  duplicar regex.
- **Alternativas consideradas**:
  - Criar endpoint separado `/api/nutrition/foods/recent/[mealType]`. Rejeitado:
    introduz rota redundante e quebra o padrão de filtros via query string já
    usado por `search`.
  - Filtrar no cliente após receber a lista completa. Rejeitado: gasta banda e,
    com `limit=15`, faria ranking errado por cortar itens antes do filtro.

## Decisão 2: Subir teto de `limit` para 15

- **Decisão**: `z.coerce.number().int().min(1).max(15).default(8)`.
- **Rationale**: Requisito explícito do usuário; pequeno aumento sem impacto
  perceptível de payload (itens recentes são leves).
- **Alternativas**: manter 12 (atual). Rejeitada: não atende ao pedido.

## Decisão 3: Aplicar filtro na projeção `buildRecentConsumedFoods`

- **Decisão**: Aceitar `mealType?: MealType` no builder e descartar itens cujo
  `mealType` divirja, antes da deduplicação por `foodId`.
- **Rationale**: Mantém dedup correta por refeição — um mesmo `foodId` registrado
  em Café e Almoço renderiza corretamente nos dois contextos separados.
- **Alternativas**: filtrar pós-dedup. Rejeitado: pode descartar a ocorrência
  mais recente daquela refeição em favor de uma ocorrência mais nova em outra.

## Decisão 4: Paridade em modo browser-volatile

- **Decisão**: Propagar `mealType` a `listRecentNutritionFoodsFromBrowser` e ao
  `buildRecentConsumedFoods` compartilhado.
- **Rationale**: Modo sem DB precisa mesmo comportamento; caso contrário, o
  usuário em fallback local veria lista diferente da versão conectada.

## Decisão 5: Hook recarrega quando foco muda

- **Decisão**: `useNutritionSearch.loadRecentFoods` passa a depender de
  `searchMealContextRef.current`; `setSearchMealContext` dispara reload.
- **Rationale**: Requisito FR-006. Alternativa (ref sem reload) mantém lista
  obsoleta e quebra SC-001.

## Riscos

- **Race condition**: troca de foco rápida pode exibir resposta antiga. Mitigar
  com token/guard simples (comparar `mealType` da resposta com o foco atual antes
  de aplicar o `setRecentFoods`).
- **Cache do contrato 005**: atualizar contrato existente para refletir novo
  parâmetro e novo teto; evitar divergência entre specs.
