import { render, screen, waitFor } from "@testing-library/react";
import { BillingManualGrantsShortcut } from "@/components/billing/BillingManualGrantsShortcut";

describe("BillingManualGrantsShortcut", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("shows the grants shortcut for owner/admin roles", async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        roles: ["owner"],
      }),
    } as Response);

    render(<BillingManualGrantsShortcut />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Gratuidades" }),
      ).toHaveAttribute("href", "/billing/grants");
    });
  });

  it("stays hidden for regular users", async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        roles: ["user"],
      }),
    } as Response);

    render(<BillingManualGrantsShortcut />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/billing/access", {
        credentials: "same-origin",
      });
    });

    expect(
      screen.queryByRole("link", { name: "Gratuidades" }),
    ).not.toBeInTheDocument();
  });
});
