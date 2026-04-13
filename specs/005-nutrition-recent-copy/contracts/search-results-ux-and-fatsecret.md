# Contract: Busca de alimentos, recentes e FatSecret Brasil

## UI Contract: resultados buscados x recentes

### Antes de busca ativa

- Mostrar `Consumidos recentemente` quando houver `recentFoods`.
- Botão de cada recente: `Registrar`.
- Não renderizar a seção quando a lista estiver vazia e não estiver carregando.

### Depois de busca submetida

- O primeiro bloco de conteúdo após os controles de busca deve ser o painel de
  resultados.
- A lista completa `Consumidos recentemente` não deve aparecer acima dos
  resultados.
- O filtro de fontes deve aceitar `Recentes` como opção de UI.
- `Todos` representa apenas fontes de catálogo; não inclui recentes.
- Ao selecionar `Recentes`, renderizar os recentes no formato compacto já usado.
- Se houver termo de busca, filtrar recentes pelo nome do alimento.
- Estado vazio para filtro `Recentes`: `Nenhum recente para esta busca.`

## API Contract: GET /api/nutrition/foods/search

Não há mudança obrigatória de payload público para o refinamento de recentes.

`source=recent` não deve ser enviado para esta rota, porque recentes já vêm de
`GET /api/nutrition/foods/recent`.

Valores válidos de `source` permanecem:

```text
all, fatsecret, openfoodfacts, usda, custom, internal, tbca
```

## Provider Contract: FatSecret

### Passagem localizada

Chamadas de busca FatSecret devem executar primeiro uma passagem localizada:

```typescript
{
  method: "foods.search.v3" | "foods.search";
  params: {
    search_expression: string;
    max_results: string;
    page_number: string;
    region: "BR";
    language: "pt";
  };
}
```

### Passagem default

Fallback default pode ser executado depois, mas sem `region` e sem `language`.
Resultados dessa passagem não podem receber automaticamente:

```typescript
{
  locale: "pt-BR";
  countryCode: "BR";
}
```

### Ranking

- Resultado localizado `BR/pt` deve ter prioridade sobre resultado default para
  a mesma intenção de busca.
- Resultado FatSecret default/internacional não deve vencer resultado TBCA ou
  catálogo local brasileiro mais relevante apenas por ser FatSecret.
- Diagnósticos de localização devem ir para log técnico, nunca para UI.

