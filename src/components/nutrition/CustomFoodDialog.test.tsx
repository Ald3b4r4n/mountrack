import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomFoodDialog } from "@/components/nutrition/CustomFoodDialog";
import {
  authorizedNutritionFetch,
  getNutritionErrorMessage,
} from "@/modules/nutrition/client";
import type { FoodItem } from "@/modules/nutrition/domain/types";

jest.mock("@/modules/nutrition/client", () => ({
  authorizedNutritionFetch: jest.fn(),
  getNutritionErrorMessage: jest.fn(),
}));

const authorizedNutritionFetchMock = jest.mocked(authorizedNutritionFetch);
const getNutritionErrorMessageMock = jest.mocked(getNutritionErrorMessage);

const authUser = {
  uid: "nutrition-user",
  getIdToken: jest.fn().mockResolvedValue("firebase-token"),
};

const createdFood: FoodItem = {
  id: "custom-food-1",
  source: "custom",
  name: "File de Tilapia Grelhado",
  brand: "Casa",
  baseUnit: "g",
  caloriesPer100: 131,
  proteinPer100: 25.56,
  carbsPer100: 0.36,
  fatPer100: 3.15,
  confidenceScore: 1,
  mealCategories: ["lunch"],
};

describe("CustomFoodDialog", () => {
  beforeEach(() => {
    authorizedNutritionFetchMock.mockReset();
    getNutritionErrorMessageMock.mockReset();
  });

  it("uses the authorized nutrition client to create a custom food", async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn();

    authorizedNutritionFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ item: createdFood }),
    } as Response);

    render(
      <CustomFoodDialog
        authUser={authUser}
        open
        onClose={jest.fn()}
        onCreated={onCreated}
      />,
    );

    await user.type(screen.getByLabelText(/Nome do alimento/i), "File de Tilapia Grelhado");
    await user.click(screen.getByRole("button", { name: /Criar alimento/i }));

    await waitFor(() => {
      expect(authorizedNutritionFetchMock).toHaveBeenCalledWith(
        authUser,
        "/api/nutrition/foods/custom",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        }),
      );
    });

    expect(onCreated).toHaveBeenCalledWith(createdFood);
  });

  it("shows the auth-aware error message when the request is rejected", async () => {
    const user = userEvent.setup();

    authorizedNutritionFetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      clone: () => ({ json: async () => ({ code: "nutrition_auth_unauthorized" }) }),
    } as unknown as Response);
    getNutritionErrorMessageMock.mockResolvedValue(
      "Sua sessao da nutricao expirou ou nao foi validada. Entre novamente e tente de novo.",
    );

    render(
      <CustomFoodDialog
        authUser={authUser}
        open
        onClose={jest.fn()}
        onCreated={jest.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/Nome do alimento/i), "File de Tilapia Grelhado");
    await user.click(screen.getByRole("button", { name: /Criar alimento/i }));

    expect(
      await screen.findByText(/Sua sessao da nutricao expirou ou nao foi validada/i),
    ).toBeInTheDocument();
  });
});
