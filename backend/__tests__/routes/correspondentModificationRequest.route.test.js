import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import verifyTransactionPin from "../../middlewares/verifyTransactionPin.js";
import correspondentModificationRequestRoutes from "../../routes/correspondentModificationRequestRoute.js";

describe("correspondent modification request routes", () => {
  it("exposes list, approve, and reject endpoints", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/:requestId/approve", "post"],
      ["/:requestId/reject", "post"],
    ]) {
      expect(findRoute(path, method)).toBeDefined();
    }
  });

  it("guards manager decisions with manager context and transaction PIN", () => {
    for (const [path, method] of [
      ["/:requestId/approve", "post"],
      ["/:requestId/reject", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle)).toContain(
        requireManagerContext,
      );
      expect(route.stack.map((layer) => layer.handle)).toContain(
        verifyTransactionPin,
      );
    }
  });

  it("does not require manager context or PIN to list scoped requests", () => {
    const route = findRoute("/", "get");

    expect(route.stack.map((layer) => layer.handle)).not.toContain(
      requireManagerContext,
    );
    expect(route.stack.map((layer) => layer.handle)).not.toContain(
      verifyTransactionPin,
    );
  });
});

function findRoute(path, method) {
  const layer = correspondentModificationRequestRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
