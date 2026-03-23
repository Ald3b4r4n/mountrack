import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntroTourButton } from "@/components/tours/IntroTourButton";

const setOptionsMock = jest.fn();
const oncompleteMock = jest.fn();
const onexitMock = jest.fn();
const startMock = jest.fn();
const tourFactoryMock = jest.fn(() => ({
  setOptions: setOptionsMock,
  oncomplete: oncompleteMock,
  onexit: onexitMock,
  start: startMock,
}));

jest.mock("intro.js", () => ({
  __esModule: true,
  default: {
    tour: tourFactoryMock,
  },
}));

describe("IntroTourButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("starts an Intro.js tour with only the steps found in the page", async () => {
    render(
      <>
        <div data-tour-id="tour-header">header</div>
        <IntroTourButton
          tourId="dashboard-home"
          steps={[
            {
              selector: "[data-tour-id='tour-header']",
              title: "Header",
              intro: "Resumo geral.",
            },
            {
              selector: "[data-tour-id='missing']",
              title: "Missing",
              intro: "Nao deveria entrar.",
            },
          ]}
        />
      </>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Conhecer o app/i }),
    );

    expect(tourFactoryMock).toHaveBeenCalled();
    expect(setOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showProgress: true,
        steps: [
          expect.objectContaining({
            title: "Header",
            intro: "Resumo geral.",
          }),
        ],
      }),
    );
    expect(startMock).toHaveBeenCalled();
  });

  it("starts once automatically and persists the seen flag", async () => {
    jest.useFakeTimers();

    render(
      <>
        <div data-tour-id="tour-header">header</div>
        <IntroTourButton
          tourId="dashboard-home"
          autoStart
          steps={[
            {
              selector: "[data-tour-id='tour-header']",
              title: "Header",
              intro: "Resumo geral.",
            },
          ]}
        />
      </>,
    );

    jest.advanceTimersByTime(650);

    await waitFor(() => {
      expect(startMock).toHaveBeenCalledTimes(1);
    });
    expect(oncompleteMock).toHaveBeenCalled();
    expect(onexitMock).toHaveBeenCalled();

    const completeHandler = oncompleteMock.mock.calls[0][0] as () => void;
    completeHandler();
    expect(
      window.localStorage.getItem("mountrack-tour:dashboard-home:seen"),
    ).toBe("1");

    jest.useRealTimers();
  });
});
