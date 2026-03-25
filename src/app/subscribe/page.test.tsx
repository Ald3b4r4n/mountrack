import { render, screen } from "@testing-library/react";
import SubscribePage from "@/app/subscribe/page";
import { getBillingPlan } from "@/modules/billing/repositories/billing-store";

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingPlan: jest.fn(),
}));

jest.mock("@/components/billing/SubscribeExperience", () => ({
  SubscribeExperience: ({
    planCode,
    amountCents,
    monthlyPrice,
    trialDays,
  }: {
    planCode: string;
    amountCents: number;
    monthlyPrice: string;
    trialDays: number;
  }) => (
    <div data-testid="subscribe-experience">
      <span>{planCode}</span>
      <span>{amountCents}</span>
      <span>{monthlyPrice}</span>
      <span>{trialDays}</span>
    </div>
  ),
}));

const getBillingPlanMock = jest.mocked(getBillingPlan);

describe("SubscribePage", () => {
  it("falls back to defaults when billing plan lookup fails", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      getBillingPlanMock.mockRejectedValue(new Error("db down"));

      render(await SubscribePage());

      expect(screen.getByTestId("subscribe-experience")).toHaveTextContent(
        "pro_monthly",
      );
      expect(screen.getByTestId("subscribe-experience")).toHaveTextContent(
        "1499",
      );
      expect(screen.getByTestId("subscribe-experience")).toHaveTextContent(
        "7",
      );
      expect(screen.getByTestId("subscribe-experience")).toHaveTextContent(
        "14,99",
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
