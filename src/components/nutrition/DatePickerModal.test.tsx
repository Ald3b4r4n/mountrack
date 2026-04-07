import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePickerModal } from "@/components/nutrition/DatePickerModal";

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe("DatePickerModal", () => {
  // T027a — max date is yesterday (future dates blocked)
  it("sets the date input max attribute to yesterday", () => {
    render(
      <DatePickerModal
        isOpen={true}
        onClose={jest.fn()}
        onDateSelected={jest.fn()}
      />,
    );

    const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
    expect(dateInput).not.toBeNull();
    expect(dateInput.max).toBe(getYesterday());
  });

  // T027b — calls onDateSelected with YYYY-MM-DD on change
  it("calls onDateSelected with the selected date string", async () => {
    const user = userEvent.setup();
    const onDateSelected = jest.fn();

    render(
      <DatePickerModal
        isOpen={true}
        onClose={jest.fn()}
        onDateSelected={onDateSelected}
      />,
    );

    const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
    await user.type(dateInput, "2026-04-01");

    expect(onDateSelected).toHaveBeenCalledWith("2026-04-01");
  });

  // T027c — does not render when isOpen is false
  it("does not render when isOpen is false", () => {
    render(
      <DatePickerModal
        isOpen={false}
        onClose={jest.fn()}
        onDateSelected={jest.fn()}
      />,
    );

    expect(document.querySelector("input[type='date']")).toBeNull();
  });
});
