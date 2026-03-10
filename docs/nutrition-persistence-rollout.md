# Implantacao de Persistencia do Modulo de Nutricao

## Objetivo

Transformar o modulo `nutrition` em um sistema persistente, multi-device e seguro, sem depender de um catalogo pesado dentro do banco.

Objetivos praticos:

- manter os dados do usuario entre desktop e celular
- usar o Supabase/Postgres apenas para o que e privado e mutavel
- manter o catalogo publico de alimentos fora do banco
- impedir qualquer acesso cruzado entre usuarios
- continuar viavel no `Free Plan` do Supabase

## Decisao principal

### Source of truth

- `Firebase Auth`: identidade e sessao
- `Supabase Postgres`: dados privados e persistentes do usuario
- `JSON versionado no repositorio`: catalogo publico auditado de alimentos
- `pipeline offline`: ingestao, normalizacao, deduplicacao e geracao do JSON publico

### O que entra no banco

- metas do usuario
- diarios
- itens do diario
- agua
- plano alimentar
- alimentos customizados do proprio usuario

### O que fica fora do banco

- catalogo publico geral
- payload bruto de provedores externos
- cache tecnico de importacao

## Arquitetura recomendada

### Camadas

1. `Auth`
   Firebase emite o token do usuario.

2. `API do Next`
   As rotas validam o token e resolvem o `user_id` real.

3. `Persistencia privada`
   O Postgres guarda apenas dados privados do usuario.

4. `Catalogo publico`
   Um JSON curado e versionado e carregado pelo backend para busca.

5. `Pipeline offline`
   Scripts locais importam dados externos, normalizam, auditam, removem duplicatas e geram o artefato final.

## Estrutura de arquivos

### Artefatos de catalogo

```text
data/
  nutrition/
    catalog/
      foods-public.v1.json
      foods-public.manifest.json
      brands-watchlist.json
      aliases.json
    staging/
      imported/
      normalized/
      audit/
```

### Scripts do pipeline

```text
scripts/
  nutrition/
    catalog/
      import-openfoodfacts.ts
      import-usda.ts
      normalize-foods.ts
      dedupe-foods.ts
      audit-public-catalog.ts
      build-public-catalog.mjs
```

### Codigo de runtime

```text
src/
  modules/
    nutrition/
      catalog/
        load-public-catalog.ts
        public-catalog-types.ts
        search-public-catalog.ts
      repositories/
        nutrition-store.ts
        nutrition-user-foods.ts
      services/
        catalog-search.service.ts
```

## Modelo de dados

### Tabelas privadas

Manter ou consolidar estas tabelas:

- `nutrition_goals`
- `nutrition_diaries`
- `nutrition_diary_items`
- `nutrition_meal_plans`

Adicionar a tabela de alimentos customizados:

- `nutrition_user_foods_custom`

### Tabela nova sugerida

```sql
create table nutrition_user_foods_custom (
  id text primary key,
  user_id text not null,
  name text not null,
  normalized_name text not null,
  brand text,
  barcode text,
  serving_grams numeric,
  calories_per100 numeric not null default 0,
  protein_per100 numeric not null default 0,
  carbs_per100 numeric not null default 0,
  fat_per100 numeric not null default 0,
  fiber_per100 numeric not null default 0,
  sodium_per100 numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nutrition_user_foods_custom_user_idx
  on nutrition_user_foods_custom (user_id, normalized_name);

create index nutrition_user_foods_custom_barcode_idx
  on nutrition_user_foods_custom (user_id, barcode);
```

### O que sai do caminho principal

Estas estruturas deixam de ser o centro da persistencia:

- `nutrition_foods` como catalogo geral de producao
- `nutrition_food_sources_raw`

Elas podem ser aposentadas depois da migracao ou ficar somente como apoio de ambiente local de ingestao.

## Formato do catalogo publico

### `foods-public.v1.json`

Cada item deve ser pequeno, normalizado e estavel:

```json
{
  "version": "2026-03-09",
  "generatedAt": "2026-03-09T12:00:00.000Z",
  "foods": [
    {
      "id": "pub_banana_prata",
      "name": "Banana prata",
      "normalizedName": "banana prata",
      "brand": null,
      "barcode": null,
      "baseUnit": "g",
      "servingGrams": 100,
      "caloriesPer100": 98,
      "proteinPer100": 1.3,
      "carbsPer100": 26,
      "fatPer100": 0.1,
      "fiberPer100": 2.0,
      "sodiumPer100": 0,
      "searchTerms": ["banana", "banana prata", "fruta"],
      "sourceLabel": "catalog"
    }
  ]
}
```

### `foods-public.manifest.json`

Usado para rastrear build e auditoria:

```json
{
  "catalogVersion": "2026-03-09",
  "foodCount": 1234,
  "generatedAt": "2026-03-09T12:00:00.000Z",
  "inputSources": ["openfoodfacts", "usda", "manual-curation"],
  "dedupeRulesVersion": "v1"
}
```

## Fluxo de busca em producao

### Ordem de busca

1. `catalogo publico JSON`
2. `alimentos customizados do proprio usuario`
3. opcionalmente, um fallback externo sem persistencia automatica

### Regras

- o usuario comum nunca escreve no catalogo publico
- alimento customizado entra apenas em `nutrition_user_foods_custom`
- se um alimento nao existir:
  - o usuario pode criar um custom food privado
  - o sistema pode registrar um pedido de curadoria leve

## Atualizacao em background

### Fila de enriquecimento

Quando a busca local nao encontra cobertura suficiente:

- a API registra um item em `nutrition_missing_food_queue`
- a resposta ao usuario volta imediatamente com `externalPending`
- o enriquecimento externo sai do caminho interativo

### Processamento agendado

Em deploy na Vercel:

- `vercel.json` agenda `GET /api/nutrition/foods/enrichment?limit=5`
- a rota interna exige `Authorization: Bearer <token>`
- `CRON_SECRET` protege o cron da Vercel
- `NUTRITION_INGEST_TOKEN` permite execucao manual controlada

### Operacao manual

Para aquecer a fila sob demanda:

```bash
npm run nutrition:enrich -- --base-url https://seu-app.vercel.app --limit 10
```

O script usa `NUTRITION_INGEST_TOKEN` ou `CRON_SECRET` e chama a rota interna autenticada.

### Resultado esperado

- a busca do usuario continua rapida e previsivel
- Open Food Facts e USDA viram fontes de aquecimento de catalogo
- falhas externas nao bloqueiam a experiencia principal

## Fluxo do pipeline offline

### Estado atual em 9 de marco de 2026

- `brands-watchlist.json` criado com a watchlist inicial de marcas
- `manual-brand-seeds.json` criado para marcas confirmadas mas mal cobertas no Open Food Facts
- `brands-watchlist.json` curado para remover entradas ruidosas e seeds fracos ligados a loja/canal ou linha de produto sem marca propria
- `foods-public.v1.json` hidratado com 169 produtos
- `foods-public.manifest.json` atualizado com cobertura de 63 marcas e 0 marcas faltantes
- `nutrition-store.ts` passou a responder com o catalogo publico em JSON no runtime
- `nutrition_foods` segue apenas como apoio de ingestao, enriquecimento e backfill legado, nao mais como fonte principal de busca em runtime
- custom foods legados agora sao migrados para `nutrition_user_foods_custom` no bootstrap do schema e o runtime le apenas a tabela privada nova
- rotas HTTP de nutricao agora validam payloads e params criticos com schema explicito, incluindo `custom`, `history`, `barcode`, `search`, `diaries`, `diary-items` e a rota interna de `enrichment`
- a cobertura de testes de rota agora verifica escopo por usuario, validacao de entrada e comportamento defensivo nas principais operacoes privadas do modulo

### 1. Importacao

Scripts coletam bases externas em ambiente local:

- `import-openfoodfacts.ts`
- `import-usda.ts`

Saida em:

- `data/nutrition/staging/imported/*.json`

### 2. Normalizacao

Scripts convertem as fontes para o formato interno:

- nomes padronizados
- unidades padronizadas
- macros por 100g ou 100ml
- barcode quando houver

Saida em:

- `data/nutrition/staging/normalized/*.json`

### 3. Deduplicacao

Heuristicas:

- mesmo barcode = mesmo item
- mesmo `normalizedName` + marca semelhante = candidato a duplicata
- macros muito proximas com nomes equivalentes = candidato a fusao

Saida em:

- `data/nutrition/staging/audit/duplicates-report.json`

### 4. Auditoria

O catalogo so entra no publico depois de revisao:

- remover duplicatas
- validar macros absurdos
- revisar marcas
- revisar aliases

### 5. Build do artefato publico

`build-public-catalog.mjs` gera:

- `data/nutrition/catalog/foods-public.v1.json`
- `data/nutrition/catalog/foods-public.manifest.json`

Comandos uteis:

```bash
npm run nutrition:catalog:build
npm run nutrition:catalog:build -- --brands "NatureBarr,+MU" --fetch-timeout-ms 3000 --retry-attempts 1
npm run nutrition:catalog:refresh-missing
```

Flags principais:

- `--brands "Marca A,Marca B"` para processar apenas um lote especifico
- `--only-missing` para usar o manifest atual como fila de trabalho
- `--fetch-timeout-ms` e `--retry-attempts` para diferenciar build full de sonda incremental
- em modo incremental, o script preserva o catalogo existente e substitui apenas as marcas alvo

### 6. Commit e release

O JSON publico entra no repositorio e segue junto do deploy do app.

## Regras de seguranca

### Isolamento por usuario

Todos os dados privados devem ser filtrados por `user_id`:

- metas
- diario
- itens do diario
- agua
- meal plan
- custom foods

### Regras obrigatorias

- nenhuma rota aceita `user_id` vindo do client como fonte de verdade
- o `user_id` sempre vem do token validado
- update e delete sempre exigem `where user_id = $currentUser`
- alimento customizado nunca pode aparecer para outro usuario
- o catalogo publico e read-only

### Observacao importante

O risco principal nao esta mais no isolamento de custom foods, que ja foi separado do catalogo publico. O que ainda falta para declarar a implantacao concluida e o fechamento operacional: validacao final de sincronizacao real com sessao autenticada, revisao dos fluxos legados que sobraram apenas para ingestao e confirmacao de que o modo `database` se mantem dominante em producao.

## Estrategia de rollout

### Fase 1 - Fechar persistencia privada

- garantir `database` como modo principal para usuarios autenticados
- manter fallback local apenas como degradacao
- validar sincronizacao real entre dispositivos

### Fase 2 - Separar custom foods

- criar `nutrition_user_foods_custom`
- migrar cadastro manual para tabela privada
- ajustar busca para retornar apenas custom foods do dono

### Fase 3 - Extrair catalogo publico do banco

- introduzir `foods-public.v1.json`
- mudar `catalog-search.service.ts` para ler JSON + custom foods do usuario
- remover dependencia de `nutrition_foods` em runtime

### Fase 4 - Montar pipeline offline

- criar scripts de importacao
- criar normalizacao
- criar auditoria de duplicatas
- gerar o primeiro catalogo publico versionado

### Fase 5 - Endurecer seguranca

- revisar todas as rotas de nutricao
- adicionar testes de acesso cruzado
- revisar logs e mensagens de erro
- documentar limites operacionais do Free Plan

Status pratico desta fase:

- revisao de rotas e validacao de entrada: praticamente concluida
- testes de escopo por usuario nas rotas privadas: em andamento avancado
- linguagem de erro no workspace `Buscar`: concluida
- validacao operacional final e documentacao de encerramento: pendentes

## Checklist operacional final

Antes de declarar a implantacao concluida em producao:

- confirmar que requests autenticadas de nutricao respondem com `x-nutrition-storage: database`
- validar que o mesmo usuario enxerga o mesmo diario, metas, agua e custom foods em mais de um dispositivo
- validar que usuario A nao consegue ler, editar nem localizar dados privados de usuario B pelas rotas HTTP
- confirmar que a rota interna de `enrichment` responde `401` sem token, `503` sem configuracao e `200` quando chamada com segredo valido
- revisar se `nutrition_foods` e `nutrition_food_sources_raw` ficaram apenas no caminho de ingestao/backfill, nunca no caminho principal de runtime

## Limites operacionais do Free Plan

Para manter o plano viavel no Free Plan do Supabase:

- guardar no banco apenas dados privados e mutaveis do usuario
- manter o catalogo publico, payloads brutos e artefatos de curadoria fora do banco principal
- monitorar crescimento de diario, meal plans e custom foods por usuario
- tratar dependencias externas e ingestao como background, nunca como parte do fluxo interativo critico
- assumir que o ambiente gratuito pode exigir degradacao controlada e observacao periodica de uso

## Validacao

Antes de considerar a implantacao concluida:

- mesmo usuario ve os mesmos dados no desktop e no celular
- usuario A nao consegue ler nem editar dados do usuario B
- custom food de A nao aparece para B
- busca publica funciona sem depender de banco para catalogo
- fallback local nao sobrescreve dados persistidos do banco
- o tamanho do banco cresce apenas com dados privados

## Proxima decisao tecnica recomendada

Fechar a validacao operacional final da persistencia e, na sequencia, voltar para o plano de UX em `docs/nutrition-ux-redesign.md`.

Traduzindo para a pratica:

- validar `database` de ponta a ponta com sessao autenticada real
- revisar se ainda sobra algum fluxo legado usando store local como caminho principal
- depois retomar o acabamento estrutural do workspace `Hoje`, do desktop e dos estados vazios no redesign de UX
