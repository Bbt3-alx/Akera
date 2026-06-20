import { describe, expect, it } from "@jest/globals";

import remoteAgentPayoutRoutes from "../../routes/remoteAgentPayoutRoute.js";

describe("remote agent payout routes", () => {
  it("exposes the backend MVP endpoints", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/", "post"],
      ["/groups", "get"],
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
      ["/groups", "get"],
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
      ["/groups/:groupId/deposits", "post"],
      ["/:payoutCode/pay", "post"],
      ["/:payoutCode/cancel", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.length).toBeGreaterThan(listRoute.stack.length);
    }
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
