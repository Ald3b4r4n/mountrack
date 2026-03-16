import { buildNutritionBarcodeCandidates, normalizeNutritionBarcode } from "@/modules/nutrition/barcode";

describe("nutrition barcode helpers", () => {
  it("extracts digits from scanner payloads", () => {
    expect(normalizeNutritionBarcode("(01) 07891000100103")).toBe("07891000100103");
  });

  it("rejects non-numeric payloads", () => {
    expect(normalizeNutritionBarcode("https://example.com/promo")).toBeNull();
  });

  it("adds the EAN-13 fallback for GTIN-14 values", () => {
    expect(buildNutritionBarcodeCandidates("07891000100103")).toEqual([
      "07891000100103",
      "7891000100103",
    ]);
  });
});
