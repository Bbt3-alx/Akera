import bcrypt from "bcrypt";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import User from "../../models/User.js";
import * as pinHash from "../../utils/hashPin.js";
import {
  changeTransactionPin,
  getTransactionPinStatus,
  setupTransactionPin,
} from "../../controllers/security.controller.js";

describe("security controller transaction PIN handlers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns transaction PIN status without exposing the hash", async () => {
    mockFindById(createUser({ transactionPinHash: "pin-hash" }));
    const res = createResponse();

    await getTransactionPinStatus(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        configured: true,
      },
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("pin-hash");
  });

  it("sets safe audit metadata after setup", async () => {
    mockFindById(createUser());
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(pinHash, "hashPin").mockResolvedValue("new-pin-hash");
    const res = createResponse();

    await setupTransactionPin(
      createRequest({
        body: {
          currentPassword: "correct-password",
          transactionPin: "123456",
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Transaction PIN configured.",
      data: {
        configured: true,
      },
    });
    expect(res.locals.audit).toEqual({
      targetId: "user-1",
      metadata: {
        configured: true,
      },
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("123456");
    expect(JSON.stringify(res.locals.audit)).not.toContain("correct-password");
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });

  it("sets safe audit metadata after change", async () => {
    mockFindById(createUser({ transactionPinHash: "old-pin-hash" }));
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(pinHash, "comparePin").mockResolvedValue(true);
    jest.spyOn(pinHash, "hashPin").mockResolvedValue("new-pin-hash");
    const res = createResponse();

    await changeTransactionPin(
      createRequest({
        body: {
          currentPassword: "correct-password",
          currentTransactionPin: "123456",
          newTransactionPin: "654321",
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Transaction PIN changed.",
      data: {
        configured: true,
      },
    });
    expect(res.locals.audit).toEqual({
      targetId: "user-1",
      metadata: {
        configured: true,
      },
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("654321");
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
    expect(JSON.stringify(res.locals.audit)).not.toContain("654321");
  });
});

function createRequest({ body = {}, user = { id: "user-1" } } = {}) {
  return {
    body,
    user,
  };
}

function createResponse() {
  return {
    locals: {},
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
}

function createUser({ transactionPinHash } = {}) {
  return {
    password: "password-hash",
    save: jest.fn().mockResolvedValue(undefined),
    transactionPinHash,
  };
}

function mockFindById(user) {
  return jest.spyOn(User, "findById").mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
}
