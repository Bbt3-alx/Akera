import { describe, expect, it } from "@jest/globals";

import { serializeCompanyInvitation } from "../../serializers/companyInvitation.serializer.js";

describe("company invitation serializer", () => {
  it("includes the short invitation code for authorized callers", () => {
    expect(
      serializeCompanyInvitation({
        _id: "invitation-1",
        email: "awa@example.com",
        invitationCode: "ABCD234567",
        status: "pending",
      }),
    ).toMatchObject({
      id: "invitation-1",
      invitationCode: "ABCD234567",
    });
  });
});
