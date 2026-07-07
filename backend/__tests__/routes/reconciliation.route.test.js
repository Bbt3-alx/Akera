import { describe, expect, it } from "@jest/globals";

import { audit } from "../../middlewares/audit.js";
import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../../middlewares/resolveCompanyContext.js";
import verifyToken from "../../middlewares/verifyToken.js";
import reconciliationRoutes from "../../routes/reconciliationRoute.js";

describe("reconciliation routes", () => {
  it.each([
    ["/issues", "get"],
    ["/scan", "post"],
    ["/issues/:id/resolve", "patch"],
  ])("requires active verified company access for %s", (path, method) => {
    const route = findRoute(path, method);
    const handles = route.stack.map((layer) => layer.handle);

    expect(handles).toContain(verifyToken);
    expect(handles).toContain(requireVerifiedUser);
    expect(handles).toContain(resolveCompanyContext);
  });

  it.each([
    ["/scan", "post"],
    ["/issues/:id/resolve", "patch"],
  ])("guards reconciliation mutations as manager-only for %s", (path, method) => {
    const route = findRoute(path, method);
    const handles = route.stack.map((layer) => layer.handle);

    expect(handles).toContain(requireManagerContext);
  });

  it("adds audit middleware to scan and resolve mutations", () => {
    const scanRoute = findRoute("/scan", "post");
    const resolveRoute = findRoute("/issues/:id/resolve", "patch");

    expect(scanRoute.stack.some((layer) => layer.handle.name === audit("x", "y").name)).toBe(true);
    expect(resolveRoute.stack.some((layer) => layer.handle.name === audit("x", "y").name)).toBe(true);
  });
});

function findRoute(path, method) {
  const layer = reconciliationRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
