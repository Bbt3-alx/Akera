import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import verifyTransactionPin from "../../middlewares/verifyTransactionPin.js";
import correspondentDeliveryRoutes from "../../routes/correspondentDeliveryRoute.js";

describe("correspondent delivery routes", () => {
  it("exposes the Phase 27A.1 backend endpoints", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/", "get"],
      ["/:deliveryCode", "get"],
      ["/:deliveryCode/confirm", "post"],
      ["/:deliveryCode/cancel", "post"],
    ]) {
      expect(findRoute(path, method)).toBeDefined();
    }
  });

  it("guards all endpoints behind correspondent collection module and workflow", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/", "get"],
      ["/:deliveryCode", "get"],
      ["/:deliveryCode/confirm", "post"],
      ["/:deliveryCode/cancel", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle.moduleName)).toContain(
        "correspondent_collections",
      );
      expect(route.stack.map((layer) => layer.handle.workflowName)).toContain(
        "correspondent_collection",
      );
    }
  });

  it("uses manager PIN for create/cancel and partner PIN without manager guard for confirm", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/:deliveryCode/cancel", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle)).toContain(
        requireManagerContext,
      );
      expect(route.stack.map((layer) => layer.handle)).toContain(
        verifyTransactionPin,
      );
    }

    const confirmRoute = findRoute("/:deliveryCode/confirm", "post");
    expect(confirmRoute.stack.map((layer) => layer.handle)).toContain(
      verifyTransactionPin,
    );
    expect(confirmRoute.stack.map((layer) => layer.handle)).not.toContain(
      requireManagerContext,
    );
  });

  it("does not require transaction PIN for read endpoints", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/:deliveryCode", "get"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle)).not.toContain(
        requireManagerContext,
      );
      expect(route.stack.map((layer) => layer.handle)).not.toContain(
        verifyTransactionPin,
      );
    }
  });
});

function findRoute(path, method) {
  const layer = correspondentDeliveryRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
