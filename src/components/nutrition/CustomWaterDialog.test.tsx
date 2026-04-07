import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomWaterDialog } from "@/components/nutrition/CustomWaterDialog";

describe("CustomWaterDialog", () => {
  // T029a — calls onSave with targetDate when provided
  it("passes targetDate to onSave when targetDate prop is provided", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <CustomWaterDialog
        open={true}
        onClose={jest.fn()}
        onSave={onSave}
        targetDate="2026-04-04"
      />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "500");
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onSave).toHaveBeenCalledWith(
      500,
      "increment",
      "2026-04-04",
    );
  });

  // T029b — calls onSave without targetDate when not provided (falls back to today)
  it("calls onSave without targetDate when targetDate prop is omitted", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <CustomWaterDialog
        open={true}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "250");
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onSave).toHaveBeenCalledWith(250, "increment", undefined);
  });
});
