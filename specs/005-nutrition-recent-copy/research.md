# Research: Atalhos de alimentos recentes e cópia entre refeições

**Branch**: `005-nutrition-recent-copy` | **Date**: 2026-04-13

## Decision 1 - Fonte de dados para alimentos recentes

**Decision**: Derivar alimentos recentes de `nutrition_diary_items` e
`nutrition_diaries`, sem nova tabela.

**Rationale**: O histórico do diário já guarda `DiaryItemSnapshot` com alimento,
quantidade, unidade, totais e refeição. A feature precisa de uma projeção curta,
ordenada e deduplicada, não de uma nova entidade persistida. Evitar tabela nova
reduz risco de migração e mantém a implementação simples.

**Alternatives considered**:

- Criar `nutrition_recent_foods`: rejeitado por duplicar dado derivável e exigir
  sincronização extra em cada insert/delete.
- Usar apenas localStorage: rejeitado porque usuários autenticados com banco
  perderiam consistência entre dispositivos.

## Decision 2 - Dedupe de recentes

**Decision**: Deduplicar por `foodId`, mantendo a ocorrência mais recente.

**Rationale**: O objetivo é repetir o alimento, não listar cada consumo passado.
A última ocorrência preserva a quantidade e unidade mais prováveis para o próximo
registro rápido.

**Alternatives considered**:

- Deduplicar por `foodId + quantity + unit`: rejeitado porque pode repetir o mesmo
  alimento várias vezes e poluir a lista curta.
- Não deduplicar: rejeitado por reduzir a velocidade do fluxo.

## Decision 3 - Contrato para registrar recente

**Decision**: Registrar um recente por meio de cópia server-side do item de origem.

**Rationale**: `DiaryItemSnapshot` não contém todos os campos por 100g do
`FoodItem`, mas contém os totais finais já usados no diário. Copiar o snapshot
evita nova busca no catálogo, funciona com alimentos externos não cacheados e
mantém comportamento consistente com o item original.

**Alternatives considered**:

- Reabrir o compositor com `FoodItem`: rejeitado porque o snapshot de diário pode
  não carregar todos os dados necessários para recalcular a porção.
- Criar endpoint separado para "registrar recente": rejeitado por duplicar a regra
  de cópia. A mesma rota de cópia atende recentes e cópia entre refeições.

## Decision 4 - API de cópia

**Decision**: Criar `POST /api/nutrition/diary-items/[id]/copy`.

**Rationale**: A rota deixa clara a origem da cópia, centraliza validação de
usuário, reaproveita `saveDiaryItem` e mantém o cliente simples. Também evita
alterar o contrato atual de `POST /api/nutrition/diary-items`, que depende de
`FoodItem` ou lookup no catálogo.

**Alternatives considered**:

- Adicionar `copyFromItemId` ao POST existente: rejeitado por misturar dois modos
  de criação no mesmo schema e aumentar a chance de payload ambíguo.
- Copiar somente no cliente: rejeitado por risco de escopo, divergência com banco
  e duplicação de regra nutricional.

## Decision 5 - Posição da UI

**Decision**: Exibir "Consumidos recentemente" dentro da área de busca somente
quando ainda não há uma busca ativa. Após o usuário enviar uma busca, os
resultados buscados ficam no topo e "Recentes" vira uma opção/filtro separado,
no mesmo nível de fontes como "Todos", "FatSecret", "Catálogo" e "TBCA".

**Rationale**: Recentes são um atalho de registro e pertencem ao contexto de
busca/adicionar alimento, mas não devem competir com a resposta explícita da
busca. Quando o usuário procura por "arroz", a expectativa principal é ver os
resultados de arroz primeiro. A cópia é uma ação sobre um item já lançado, então
deve ficar na linha do item junto de editar/remover.

**Alternatives considered**:

- Colocar recentes no dashboard: rejeitado porque poderia disputar espaço com
  resumo diário e refeições.
- Manter recentes sempre acima dos resultados: rejeitado porque empurra os
  resultados buscados para baixo em mobile e cria a percepção de que a busca não
  respondeu.
- Misturar recentes em "Todos": rejeitado porque "Todos" deve representar fontes
  de catálogo durante busca ativa; misturar histórico pode gerar duplicidade e
  ambiguidade.
- Colocar cópia em menu oculto: rejeitado porque reduz descoberta da ação.

## Decision 6 - Texto visível

**Decision**: Todo texto novo visível ao usuário será português-BR simples:
"Consumidos recentemente", "Registrar", "Copiar", "Escolha a refeição" e
"Alimento copiado para {refeição}."

**Rationale**: O produto já usa português-BR. O pedido reforça que devnotes não
devem aparecer ao usuário. Mensagens técnicas ficam restritas a logs e testes.

**Alternatives considered**:

- Manter textos técnicos em inglês por rapidez: rejeitado por quebrar padrão do
  produto e prejudicar confiança do usuário.

## Decision 7 - Fallback local

**Decision**: Implementar equivalentes no `client-storage.ts` para listar recentes
e copiar item quando o modo volátil estiver ativo.

**Rationale**: A tela já mantém suporte a persistência local quando o banco não
está disponível. A feature deve preservar esse comportamento para não criar uma
experiência parcial.

**Alternatives considered**:

- Desabilitar recentes/cópia em modo volátil: rejeitado porque o diário ainda
  permite registrar itens localmente.

## Decision 8 - FatSecret Brasil e fallback internacional

**Decision**: Tratar a busca FatSecret como duas passagens distintas: localizada
(`region=BR`, `language=pt`) e default. A passagem localizada deve ter prioridade
quando retorna resultados. A passagem default pode ser usada como fallback, mas
seus itens não devem ser marcados automaticamente como `locale="pt-BR"` ou
`countryCode="BR"`.

**Rationale**: A documentação oficial do FatSecret informa que localização é
recurso premium disponível para contas selecionadas, que `region` filtra por
região, que `language` é ignorado sem `region`, e que sem localização a resposta
usa o padrão `US`/`en`. O código atual já tenta `language=pt` e `region=BR`, mas
também executa fallback default. Além disso, o normalizador atual marca todo
resultado FatSecret como `pt-BR`/`BR`, o que pode fazer item internacional
parecer brasileiro no ranking.

**Alternatives considered**:

- Remover fallback default: rejeitado porque deixaria o FatSecret vazio quando a
  conta não tiver localização ou quando o catálogo BR não tiver cobertura.
- Aceitar fallback default como brasileiro: rejeitado porque distorce ranking e
  dificulta diagnosticar a causa real.
- Priorizar FatSecret sempre acima de TBCA/catálogo local: rejeitado porque
  resultados brasileiros internos podem ser mais relevantes para alimentos
  comuns no Brasil.

**Verification needed**:

- Testar que a chamada proxy e a chamada direta recebem `region=BR` e
  `language=pt` na passagem localizada.
- Testar que a passagem default não injeta `locale`/`countryCode` brasileiros.
- Testar ranking com resposta mista: item `BR/pt`, item default `US/en` e item
  TBCA/catálogo local.
- Registrar diagnóstico técnico quando a passagem localizada retorna zero ou erro
  e o fallback default preenche os resultados.

## Dependency Map

```text
Recentes API -> UI de recentes -> Registro rápido por cópia
Copy API     -> DiaryItemRow copy action -> Atualização de dashboard/histórico
Fallback local acompanha as duas trilhas
FatSecret BR -> normalização com origem da passagem -> ranking de busca
```

**Confirmed**: Nenhuma dependência npm nova. Nenhuma migration obrigatória.
