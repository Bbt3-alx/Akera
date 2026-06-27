import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import verifyTransactionPin from "../../middlewares/verifyTransactionPin.js";
import correspondentCollectionRoutes from "../../routes/correspondentCollectionRoute.js";

describe("correspondent collection routes", () => {
  it("exposes the Phase 27A backend endpoints", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/", "get"],
      ["/:collectionCode", "get"],
      ["/:collectionCode/confirm", "post"],
      ["/:collectionCode/cancel", "post"],
    ]) {
      expect(findRoute(path, method)).toBeDefined();
    }
  });

  it("guards all endpoints behind correspondent collection module and workflow", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/", "get"],
      ["/:collectionCode", "get"],
      ["/:collectionCode/confirm", "post"],
      ["/:collectionCode/cancel", "post"],
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

  it("requires manager context and transaction PIN for money mutations only", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/:collectionCode/confirm", "post"],
      ["/:collectionCode/cancel", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle)).toContain(
        requireManagerContext,
      );
      expect(route.stack.map((layer) => layer.handle)).toContain(
        verifyTransactionPin,
      );
    }

    for (const [path, method] of [
      ["/", "get"],
      ["/:collectionCode", "get"],
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
  const layer = correspondentCollectionRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
