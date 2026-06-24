import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../../middlewares/resolveCompanyContext.js";
import { transactionPinLimiter } from "../../middlewares/transactionPinRateLimit.js";
import verifyToken from "../../middlewares/verifyToken.js";
import securityRoutes from "../../routes/securityRoute.js";

describe("security transaction PIN routes", () => {
  it.each([
    ["/transaction-pin/status", "get"],
    ["/transaction-pin/setup", "post"],
    ["/transaction-pin/change", "patch"],
    ["/setup-transaction-pin", "post"],
  ])("allows active verified users without manager-only gating for %s", (path, method) => {
    const route = findRoute(path, method);
    const handles = route.stack.map((layer) => layer.handle);

    expect(handles).toContain(verifyToken);
    expect(handles).toContain(requireVerifiedUser);
    expect(handles).toContain(resolveCompanyContext);
    expect(handles).not.toContain(requireManagerContext);
  });

  it.each([
    ["/transaction-pin/setup", "post"],
    ["/transaction-pin/change", "patch"],
    ["/setup-transaction-pin", "post"],
  ])("keeps PIN mutation rate limiting for %s", (path, method) => {
    const route = findRoute(path, method);

    expect(route.stack.map((layer) => layer.handle)).toContain(
      transactionPinLimiter,
    );
  });

  it("does not rate limit the status read endpoint", () => {
    const route = findRoute("/transaction-pin/status", "get");

    expect(route.stack.map((layer) => layer.handle)).not.toContain(
      transactionPinLimiter,
    );
  });
});

function findRoute(path, method) {
  const layer = securityRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
