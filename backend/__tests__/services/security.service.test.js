import bcrypt from "bcrypt";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import User from "../../models/User.js";
import * as pinHash from "../../utils/hashPin.js";
import {
  changeTransactionPin,
  getTransactionPinStatus,
  setupTransactionPin,
} from "../../services/security.service.js";

describe("security service transaction PIN helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns false when no transaction PIN is configured", async () => {
    const { findById, query } = mockFindById(createUser());

    await expect(getTransactionPinStatus("user-1")).resolves.toEqual({
      configured: false,
    });

    expect(findById).toHaveBeenCalledWith("user-1");
    expect(query.select).toHaveBeenCalledWith("+transactionPinHash");
  });

  it("returns true when a transaction PIN hash exists", async () => {
    mockFindById(createUser({ transactionPinHash: "pin-hash" }));

    await expect(getTransactionPinStatus("user-1")).resolves.toEqual({
      configured: true,
    });
  });

  it("sets up a PIN when the current password is correct", async () => {
    const user = createUser();
    mockFindById(user);
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(pinHash, "hashPin").mockResolvedValue("new-pin-hash");

    const result = await setupTransactionPin({
      currentPassword: "correct-password",
      transactionPin: "123456",
      userId: "user-1",
    });

    expect(result).toEqual({ configured: true });
    expect(pinHash.hashPin).toHaveBeenCalledWith("123456");
    expect(user.transactionPinHash).toBe("new-pin-hash");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("123456");
  });

  it("rejects setup when a PIN is already configured", async () => {
    mockFindById(createUser({ transactionPinHash: "existing-pin-hash" }));

    await expect(
      setupTransactionPin({
        currentPassword: "correct-password",
        transactionPin: "123456",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "PIN_ALREADY_CONFIGURED",
    });
  });

  it("rejects setup with an invalid PIN format", async () => {
    const findById = jest.spyOn(User, "findById");

    await expect(
      setupTransactionPin({
        currentPassword: "correct-password",
        transactionPin: "12345",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_PIN",
    });
    expect(findById).not.toHaveBeenCalled();
  });

  it("rejects setup when currentPassword is missing", async () => {
    const findById = jest.spyOn(User, "findById");

    await expect(
      setupTransactionPin({
        transactionPin: "123456",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "CURRENT_PASSWORD_REQUIRED",
    });
    expect(findById).not.toHaveBeenCalled();
  });

  it("rejects setup when the password is wrong", async () => {
    mockFindById(createUser());
    jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

    await expect(
      setupTransactionPin({
        currentPassword: "wrong-password",
        transactionPin: "123456",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "INVALID_PASSWORD",
    });
  });

  it("changes a PIN when current password and current PIN are correct", async () => {
    const user = createUser({ transactionPinHash: "old-pin-hash" });
    mockFindById(user);
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(pinHash, "comparePin").mockResolvedValue(true);
    jest.spyOn(pinHash, "hashPin").mockResolvedValue("new-pin-hash");

    const result = await changeTransactionPin({
      currentPassword: "correct-password",
      currentTransactionPin: "123456",
      newTransactionPin: "654321",
      userId: "user-1",
    });

    expect(result).toEqual({ configured: true });
    expect(pinHash.comparePin).toHaveBeenCalledWith("123456", "old-pin-hash");
    expect(pinHash.hashPin).toHaveBeenCalledWith("654321");
    expect(user.transactionPinHash).toBe("new-pin-hash");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("654321");
  });

  it("rejects change when no PIN is configured", async () => {
    mockFindById(createUser());

    await expect(
      changeTransactionPin({
        currentPassword: "correct-password",
        currentTransactionPin: "123456",
        newTransactionPin: "654321",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "PIN_NOT_CONFIGURED",
    });
  });

  it("rejects change when the current PIN is wrong", async () => {
    mockFindById(createUser({ transactionPinHash: "old-pin-hash" }));
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(pinHash, "comparePin").mockResolvedValue(false);

    await expect(
      changeTransactionPin({
        currentPassword: "correct-password",
        currentTransactionPin: "000000",
        newTransactionPin: "654321",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "INVALID_CURRENT_PIN",
    });
  });

  it("rejects change with an invalid new PIN", async () => {
    const findById = jest.spyOn(User, "findById");

    await expect(
      changeTransactionPin({
        currentPassword: "correct-password",
        currentTransactionPin: "123456",
        newTransactionPin: "abcdef",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_PIN",
    });
    expect(findById).not.toHaveBeenCalled();
  });
});

function createUser({ transactionPinHash } = {}) {
  return {
    password: "password-hash",
    save: jest.fn().mockResolvedValue(undefined),
    transactionPinHash,
  };
}

function mockFindById(user) {
  const query = {
    select: jest.fn().mockResolvedValue(user),
  };
  const findById = jest.spyOn(User, "findById").mockReturnValue(query);

  return { findById, query };
}
