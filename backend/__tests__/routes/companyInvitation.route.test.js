import { describe, expect, it } from "@jest/globals";

import companyInvitationRoutes from "../../routes/companyInvitationRoute.js";

describe("company invitation routes", () => {
  it("registers an authenticated invitation credential resolver", () => {
    const route = companyInvitationRoutes.stack.find(
      (layer) => layer.route?.path === "/resolve/:credential",
    );

    expect(route).toBeDefined();
    expect(route.route.methods.get).toBe(true);
    expect(route.route.stack).toHaveLength(4);
  });
});
