import { describe, expect, it } from "@jest/globals";

import { requireManagerContext } from "../../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../../middlewares/resolveCompanyContext.js";
import verifyToken from "../../middlewares/verifyToken.js";
import auditTimelineRoutes from "../../routes/auditTimelineRoute.js";

describe("audit timeline routes", () => {
  it("exposes a manager-only audit log list endpoint", () => {
    const route = findRoute("/", "get");
    const handles = route.stack.map((layer) => layer.handle);

    expect(handles).toContain(verifyToken);
    expect(handles).toContain(requireVerifiedUser);
    expect(handles).toContain(resolveCompanyContext);
    expect(handles).toContain(requireManagerContext);
  });
});

function findRoute(path, method) {
  const layer = auditTimelineRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
