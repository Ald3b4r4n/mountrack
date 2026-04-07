# API Contract: Food Search

`GET /api/nutrition/foods/search`

**Auth**: Required (`requireNutritionUser` middleware)
**Spec**: `002-food-search-improvements.md` FR-002

---

## Request

### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query. Minimum 2 characters. |
| `source` | string | No | Filter results by data source. See valid values below. Default: `"all"` |

**Valid `source` values**:
- `all` — no filter (default behavior, backward-compatible)
- `fatsecret` — FatSecret catalog only
- `openfoodfacts` — OpenFoodFacts catalog only
- `usda` — USDA FoodData Central only
- `custom` — user-created foods only

**Invalid `source` value** → `400 Bad Request`

### Examples
```
GET /api/nutrition/foods/search?q=frango
GET /api/nutrition/foods/search?q=frango&source=custom
GET /api/nutrition/foods/search?q=pão%20francês&source=fatsecret
```

---

## Response

### 200 OK

```typescript
{
  results: FoodItem[],          // ranked by relevance score; max 8 items (or 50 unranked)
  source: "none" | "internal" | "external" | "mixed",
  externalPending: boolean      // true if background providers still fetching
}
```

**No change from current response shape** — `source` filter is applied server-side before
ranking; the response envelope is identical to the existing contract.

### 400 Bad Request

```json
{ "error": "Invalid source filter: \"xyz\". Valid values: all, fatsecret, openfoodfacts, usda, custom" }
```

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## Backward Compatibility

Existing callers that omit `source` receive identical behavior (default = `"all"`).
No changes to response shape. This change is **non-breaking**.

---

## Implementation Notes

1. Validate `source` param at route level before passing to service.
2. Pass `source` into `CatalogSearchService.search()` → `FoodSearchService.searchFoods()`.
3. In `searchFoods()`, filter candidate results by `food.source === source` before scoring
   (when `source !== "all"`).
4. `"custom"` maps to `food.source === "custom"` in the `nutrition_foods` table.
