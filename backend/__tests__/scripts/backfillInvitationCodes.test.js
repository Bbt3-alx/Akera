import { describe, expect, it, jest } from "@jest/globals";

import { backfillInvitationCodes } from "../../scripts/backfillInvitationCodes.js";

describe("backfill invitation codes", () => {
  it("is idempotent and retries duplicate codes", async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "invite-1" }]),
    };
    const InvitationModel = {
      find: jest.fn().mockReturnValue(query),
      updateOne: jest.fn()
        .mockRejectedValueOnce({ code: 11000, keyPattern: { invitationCode: 1 } })
        .mockResolvedValueOnce({ modifiedCount: 1 }),
    };
    const generateCode = jest.fn()
      .mockReturnValueOnce("AAAA234567")
      .mockReturnValueOnce("BBBB234567");

    await expect(
      backfillInvitationCodes({ InvitationModel, generateCode }),
    ).resolves.toEqual({ scanned: 1, updated: 1 });
    expect(generateCode).toHaveBeenCalledTimes(2);
  });
});
