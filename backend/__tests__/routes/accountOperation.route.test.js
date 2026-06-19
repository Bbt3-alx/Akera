import { describe, expect, it } from "@jest/globals";

import accountOperationRoutes from "../../routes/accountOperationRoute.js";

describe("account operation routes", () => {
  it("exposes list, withdrawal request, confirm, and reject endpoints", () => {
    expect(findRoute("/", "get")).toBeDefined();
    expect(findRoute("/withdrawal-requests", "post")).toBeDefined();
    expect(findRoute("/:operationCode/confirm", "post")).toBeDefined();
    expect(findRoute("/:operationCode/reject", "post")).toBeDefined();
  });

  it("guards withdrawal requests with extra middleware including manager context and PIN", () => {
    const listRoute = findRoute("/", "get");
    const requestRoute = findRoute("/withdrawal-requests", "post");

    expect(requestRoute.stack.length).toBeGreaterThan(listRoute.stack.length);
    expect(requestRoute.stack.length).toBeGreaterThanOrEqual(6);
  });

  it("guards all account operation endpoints behind the account operations module", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/withdrawal-requests", "post"],
      ["/:operationCode/confirm", "post"],
      ["/:operationCode/reject", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle.moduleName)).toContain(
        "account_operations",
      );
    }
  });
});

function findRoute(path, method) {
  const layer = accountOperationRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
