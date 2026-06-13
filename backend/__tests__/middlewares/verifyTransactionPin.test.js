import { afterEach, describe, expect, it, jest } from "@jest/globals";

import User from "../../models/User.js";
import verifyTransactionPin from "../../middlewares/verifyTransactionPin.js";
import * as pinHash from "../../utils/hashPin.js";

describe("verifyTransactionPin middleware", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects requests missing transactionPin", async () => {
    const next = jest.fn();

    await verifyTransactionPin(createRequest({ body: {} }), {}, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        errorCode: "PIN_REQUIRED",
      }),
    );
  });

  it("rejects requests when the manager has no configured transaction PIN", async () => {
    mockFindById({ transactionPinHash: undefined });
    const next = jest.fn();

    await verifyTransactionPin(createRequest(), {}, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        errorCode: "PIN_NOT_CONFIGURED",
      }),
    );
  });

  it("rejects wrong transaction PIN values", async () => {
    mockFindById({ transactionPinHash: "pin-hash" });
    jest.spyOn(pinHash, "comparePin").mockResolvedValue(false);
    const next = jest.fn();

    await verifyTransactionPin(createRequest(), {}, next);
    await flushPromises();

    expect(pinHash.comparePin).toHaveBeenCalledWith("123456", "pin-hash");
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        errorCode: "INVALID_PIN",
      }),
    );
  });
});

function createRequest({
  body = { transactionPin: "123456" },
  user = { id: "user-1" },
} = {}) {
  return {
    body,
    user,
  };
}

function mockFindById(user) {
  return jest.spyOn(User, "findById").mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
}

function flushPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
