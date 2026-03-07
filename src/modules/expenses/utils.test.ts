import {
  formatCurrencyBRL,
  getExpenseLabel,
  getTodayLocalDate,
} from "@/modules/expenses/utils";

describe("expenses utils", () => {
  it("formats BRL currency using pt-BR locale", () => {
    expect(formatCurrencyBRL(128.4).replace(/\s/g, " ")).toBe("R$ 128,40");
  });

  it("maps expense types to friendly labels", () => {
    expect(getExpenseLabel("ampoule")).toBe("Ampola/Medicação");
    expect(getExpenseLabel("consultation")).toBe("Consulta Médica");
  });

  it("returns a local yyyy-mm-dd date", () => {
    expect(getTodayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

