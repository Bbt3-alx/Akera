import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import CompanyInvitation from "../../models/CompanyInvitation.js";

describe("CompanyInvitation model", () => {
  it("generates a token during validation when one is not provided", async () => {
    const invitation = new CompanyInvitation({
      email: "partner@example.com",
      company: new mongoose.Types.ObjectId(),
      role: "partner",
      currency: "GNF",
      invitedBy: new mongoose.Types.ObjectId(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await expect(invitation.validate()).resolves.toBeUndefined();
    expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);
    expect(invitation.invitationCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
  });

  it("preserves an existing invitation code during validation", async () => {
    const invitation = new CompanyInvitation({
      email: "partner@example.com",
      company: new mongoose.Types.ObjectId(),
      role: "partner",
      currency: "GNF",
      invitedBy: new mongoose.Types.ObjectId(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitationCode: "ABCD234567",
    });

    await invitation.validate();

    expect(invitation.invitationCode).toBe("ABCD234567");
  });
});
