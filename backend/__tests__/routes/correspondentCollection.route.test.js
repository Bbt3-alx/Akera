import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import verifyTransactionPin from "../../middlewares/verifyTransactionPin.js";
import correspondentCollectionRoutes from "../../routes/correspondentCollectionRoute.js";

describe("correspondent collection routes", () => {
  it("exposes the Phase 27A backend endpoints", () => {
    for (const [path, method] of [
      ["/", "post"],
      ["/", "get"],
      ["/correspondents", "get"],
      ["/:collectionCode", "get"],
      ["/:collectionCode/pay", "post"],
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
      ["/correspondents", "get"],
      ["/:collectionCode", "get"],
      ["/:collectionCode/pay", "post"],
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

  it("uses manager PIN for pay/confirm and shared PIN for partner-capable cancel", () => {
    const createRoute = findRoute("/", "post");
    expect(createRoute.stack.map((layer) => layer.handle)).not.toContain(
      requireManagerContext,
    );
    expect(createRoute.stack.map((layer) => layer.handle)).toContain(
      verifyTransactionPin,
    );

    for (const [path, method] of [
      ["/:collectionCode/pay", "post"],
      ["/:collectionCode/confirm", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle)).toContain(
        requireManagerContext,
      );
      expect(route.stack.map((layer) => layer.handle)).toContain(
        verifyTransactionPin,
      );
    }

    const correspondentsRoute = findRoute("/correspondents", "get");
    expect(correspondentsRoute.stack.map((layer) => layer.handle)).not.toContain(
      requireManagerContext,
    );
    expect(correspondentsRoute.stack.map((layer) => layer.handle)).not.toContain(
      verifyTransactionPin,
    );

    const cancelRoute = findRoute("/:collectionCode/cancel", "post");
    expect(cancelRoute.stack.map((layer) => layer.handle)).toContain(
      verifyTransactionPin,
    );
    expect(cancelRoute.stack.map((layer) => layer.handle)).not.toContain(
      requireManagerContext,
    );

    for (const [path, method] of [
      ["/", "get"],
      ["/correspondents", "get"],
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

  it("registers the correspondent selector before collection code lookups", () => {
    const correspondentsIndex = findRouteIndex("/correspondents", "get");
    const collectionCodeIndex = findRouteIndex("/:collectionCode", "get");

    expect(correspondentsIndex).toBeGreaterThanOrEqual(0);
    expect(collectionCodeIndex).toBeGreaterThanOrEqual(0);
    expect(correspondentsIndex).toBeLessThan(collectionCodeIndex);
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

function findRouteIndex(path, method) {
  return correspondentCollectionRoutes.stack.findIndex(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );
}
