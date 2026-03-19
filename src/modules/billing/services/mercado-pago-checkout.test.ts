/** @jest-environment node */

jest.mock("@/modules/billing/config/mercado-pago", () => ({
  getMercadoPagoAccessToken: jest.fn(),
  getMercadoPagoTestPayerEmail: jest.fn(),
  isMercadoPagoSandboxToken: jest.fn(),
}));

jest.mock("@/modules/billing/providers/mercado-pago", () => ({
  fetchMercadoPagoCollectorProfile: jest.fn(),
}));

import {
  getMercadoPagoAccessToken,
  getMercadoPagoTestPayerEmail,
  isMercadoPagoSandboxToken,
} from "@/modules/billing/config/mercado-pago";
import { fetchMercadoPagoCollectorProfile } from "@/modules/billing/providers/mercado-pago";
import { resolveMercadoPagoCheckoutPayerEmail } from "@/modules/billing/services/mercado-pago-checkout";

const getMercadoPagoAccessTokenMock = jest.mocked(getMercadoPagoAccessToken);
const getMercadoPagoTestPayerEmailMock = jest.mocked(getMercadoPagoTestPayerEmail);
const isMercadoPagoSandboxTokenMock = jest.mocked(isMercadoPagoSandboxToken);
const fetchMercadoPagoCollectorProfileMock = jest.mocked(fetchMercadoPagoCollectorProfile);

describe("mercado-pago checkout service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMercadoPagoAccessTokenMock.mockReturnValue("APP_USR-real-seller");
    getMercadoPagoTestPayerEmailMock.mockReturnValue(null);
    isMercadoPagoSandboxTokenMock.mockReturnValue(false);
    fetchMercadoPagoCollectorProfileMock.mockResolvedValue({
      email: "seller@example.com",
      nickname: "SELLER",
      isTestUser: false,
      rawPayload: {},
    });
  });

  it("returns the app account email for real collectors", async () => {
    await expect(resolveMercadoPagoCheckoutPayerEmail("user@example.com")).resolves.toBe("user@example.com");
  });

  it("uses the configured test buyer email for TEST tokens", async () => {
    getMercadoPagoAccessTokenMock.mockReturnValue("TEST-123");
    getMercadoPagoTestPayerEmailMock.mockReturnValue("buyer@testuser.com");
    isMercadoPagoSandboxTokenMock.mockReturnValue(true);

    await expect(resolveMercadoPagoCheckoutPayerEmail("user@example.com")).resolves.toBe(
      "buyer@testuser.com",
    );
    expect(fetchMercadoPagoCollectorProfileMock).not.toHaveBeenCalled();
  });

  it("uses the configured test buyer email for APP_USR tokens owned by test sellers", async () => {
    getMercadoPagoTestPayerEmailMock.mockReturnValue("buyer@testuser.com");
    fetchMercadoPagoCollectorProfileMock.mockResolvedValue({
      email: "test_user_999@testuser.com",
      nickname: "TESTUSER999",
      isTestUser: true,
      rawPayload: {},
    });

    await expect(resolveMercadoPagoCheckoutPayerEmail("user@example.com")).resolves.toBe(
      "buyer@testuser.com",
    );
  });

  it("fails fast when a test collector is missing the configured test buyer email", async () => {
    fetchMercadoPagoCollectorProfileMock.mockResolvedValue({
      email: "test_user_999@testuser.com",
      nickname: "TESTUSER999",
      isTestUser: true,
      rawPayload: {},
    });

    await expect(resolveMercadoPagoCheckoutPayerEmail("user@example.com")).rejects.toThrow(
      "MERCADO_PAGO_TEST_PAYER_EMAIL_REQUIRED",
    );
  });

  it("fails fast when the configured test buyer email is not a valid email address", async () => {
    getMercadoPagoTestPayerEmailMock.mockReturnValue("6cd638c8acb449810d34dc563ddb96b44d37add6278131368ae4be429ad39fc8");
    fetchMercadoPagoCollectorProfileMock.mockResolvedValue({
      email: "test_user_999@testuser.com",
      nickname: "TESTUSER999",
      isTestUser: true,
      rawPayload: {},
    });

    await expect(resolveMercadoPagoCheckoutPayerEmail("user@example.com")).rejects.toThrow(
      "MERCADO_PAGO_TEST_PAYER_EMAIL_INVALID",
    );
  });
});
