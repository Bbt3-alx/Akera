import { describe, expect, it, jest } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";

describe("security route manager guard", () => {
  it("allows active manager company context", () => {
    const next = jest.fn();

    requireManagerContext({ context: { role: "manager" } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects non-manager company context", () => {
    const next = jest.fn();

    requireManagerContext({ context: { role: "employee" } }, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        errorCode: "TRANSACTION_PIN_MANAGER_REQUIRED",
      }),
    );
  });
});
