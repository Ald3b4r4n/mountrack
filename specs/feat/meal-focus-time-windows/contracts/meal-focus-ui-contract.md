# UI Contract: Refeição em foco

## Função pura de mapeamento

```ts
function getMealFocusForHour(hour: number, minute: number): DefaultMealType;
```

- **Entrada**: `hour ∈ [0, 23]`, `minute ∈ [0, 59]`.
- **Saída**: uma entre `"breakfast" | "lunch" | "snack" | "dinner"`.
- **Tabela**:

| Minuto do dia (`H*60+M`) | Saída |
|--------------------------|-------|
| 0..660 | `breakfast` |
| 661..840 | `lunch` |
| 841..1080 | `snack` |
| 1081..1439 | `dinner` |

## Comportamento na UI

- **Carga inicial**: se houver valor persistido que seja `custom:*`, descartar.
  Se for default, manter apenas se pertencer à janela atual; senão, usar a
  default da janela atual.
- **Auto-sync**: a cada 60s, se a janela atual difere da janela do último
  override manual, aplicar a default da janela atual. Override manual não
  sobrevive à fronteira.
- **Adicionar alimento**: seletor mostra defaults + customs. Foco rotativo é
  sobre defaults.

## Regras invariantes

- `getDefaultFocusedMeal(now)` **nunca** retorna `custom:*`.
- Entre 00:00–05:59 o foco default é `breakfast` (rotação pós-meia-noite).
- Fronteiras pertencem à janela anterior:
  - `11:00` → `breakfast`, `11:01` → `lunch`.
  - `14:00` → `lunch`, `14:01` → `snack`.
  - `18:00` → `snack`, `18:01` → `dinner`.
