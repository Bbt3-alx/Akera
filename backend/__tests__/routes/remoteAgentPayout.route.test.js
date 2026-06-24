import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import verifyTransactionPin from "../../middlewares/verifyTransactionPin.js";
import remoteAgentPayoutRoutes from "../../routes/remoteAgentPayoutRoute.js";

describe("remote agent payout routes", () => {
  it("exposes the backend MVP endpoints", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/", "post"],
      ["/eligible-agents", "get"],
      ["/my-groups", "get"],
      ["/groups", "get"],
      ["/groups", "post"],
      ["/groups/:groupId", "get"],
      ["/groups/:groupId", "patch"],
      ["/groups/:groupId/members", "post"],
      ["/groups/:groupId/members/:membershipId", "patch"],
      ["/groups/:groupId/deposits", "post"],
      ["/lookup", "post"],
      ["/:payoutCode", "get"],
      ["/:payoutCode/pay", "post"],
      ["/:payoutCode/cancel", "post"],
    ]) {
      expect(findRoute(path, method)).toBeDefined();
    }
  });

  it("guards all endpoints behind the remote agent payout module", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/", "post"],
      ["/eligible-agents", "get"],
      ["/my-groups", "get"],
      ["/groups", "get"],
      ["/groups", "post"],
      ["/groups/:groupId", "get"],
      ["/groups/:groupId", "patch"],
      ["/groups/:groupId/members", "post"],
      ["/groups/:groupId/members/:membershipId", "patch"],
      ["/groups/:groupId/deposits", "post"],
      ["/lookup", "post"],
      ["/:payoutCode", "get"],
      ["/:payoutCode/pay", "post"],
      ["/:payoutCode/cancel", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle.moduleName)).toContain(
        "remote_agent_payout",
      );
    }
  });

  it("guards sensitive money mutations with extra middleware", () => {
    const listRoute = findRoute("/", "get");

    for (const [path, method] of [
      ["/", "post"],
      ["/groups", "post"],
      ["/groups/:groupId", "patch"],
      ["/groups/:groupId/members", "post"],
      ["/groups/:groupId/members/:membershipId", "patch"],
      ["/groups/:groupId/deposits", "post"],
      ["/:payoutCode/pay", "post"],
      ["/:payoutCode/cancel", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.length).toBeGreaterThan(listRoute.stack.length);
      expect(route.stack.map((layer) => layer.handle)).toContain(
        verifyTransactionPin,
      );
    }
  });

  it("does not require transaction PIN for group read endpoints", () => {
    const eligibleAgentsRoute = findRoute("/eligible-agents", "get");
    const myGroupsRoute = findRoute("/my-groups", "get");
    const listRoute = findRoute("/groups", "get");
    const detailRoute = findRoute("/groups/:groupId", "get");
    const createRoute = findRoute("/groups", "post");

    expect(eligibleAgentsRoute.stack.length).toBeLessThan(createRoute.stack.length);
    expect(myGroupsRoute.stack.length).toBeLessThan(createRoute.stack.length);
    expect(listRoute.stack.length).toBeLessThan(createRoute.stack.length);
    expect(detailRoute.stack.length).toBeLessThan(createRoute.stack.length);
    expect(eligibleAgentsRoute.stack.map((layer) => layer.handle)).not.toContain(
      verifyTransactionPin,
    );
    expect(myGroupsRoute.stack.map((layer) => layer.handle)).not.toContain(
      verifyTransactionPin,
    );
    expect(listRoute.stack.map((layer) => layer.handle)).not.toContain(
      verifyTransactionPin,
    );
    expect(detailRoute.stack.map((layer) => layer.handle)).not.toContain(
      verifyTransactionPin,
    );
  });

  it("requires manager context for all group management endpoints", () => {
    for (const [path, method] of [
      ["/groups", "get"],
      ["/groups", "post"],
      ["/groups/:groupId", "get"],
      ["/groups/:groupId", "patch"],
      ["/groups/:groupId/members", "post"],
      ["/groups/:groupId/members/:membershipId", "patch"],
      ["/eligible-agents", "get"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle)).toContain(
        requireManagerContext,
      );
    }

    expect(
      findRoute("/groups/:groupId/deposits", "post").stack.map(
        (layer) => layer.handle,
      ),
    ).not.toContain(requireManagerContext);
    expect(
      findRoute("/my-groups", "get").stack.map((layer) => layer.handle),
    ).not.toContain(requireManagerContext);
  });

  it("registers my-groups before payoutCode routes", () => {
    expect(findRouteIndex("/my-groups", "get")).toBeLessThan(
      findRouteIndex("/:payoutCode", "get"),
    );
  });

  it("registers eligible-agents before payoutCode routes", () => {
    expect(findRouteIndex("/eligible-agents", "get")).toBeLessThan(
      findRouteIndex("/:payoutCode", "get"),
    );
  });
});

function findRoute(path, method) {
  const layer = remoteAgentPayoutRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}

function findRouteIndex(path, method) {
  const index = remoteAgentPayoutRoutes.stack.findIndex(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(index).toBeGreaterThanOrEqual(0);

  return index;
}
