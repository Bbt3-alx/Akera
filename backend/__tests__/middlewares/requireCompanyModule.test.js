import { describe, expect, it, jest } from "@jest/globals";

import { requireCompanyModule } from "../../middlewares/requireCompanyModule.js";

describe("requireCompanyModule", () => {
  it("allows requests when the active company has the module enabled", () => {
    const req = {
      context: {
        company: {
          enabledModules: ["account_operations"],
        },
      },
    };
    const next = jest.fn();

    requireCompanyModule("account_operations")(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks requests when the active company does not have the module enabled", () => {
    const req = {
      context: {
        company: {
          enabledModules: ["transfers"],
        },
      },
    };
    const next = jest.fn();

    requireCompanyModule("account_operations")(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        errorCode: "MODULE_NOT_ENABLED",
      }),
    );
  });
});
