import { describe, expect, it } from "@jest/globals";

import companyCashRoutes from "../../routes/companyCashRoute.js";

describe("company cash routes", () => {
  it("guards cash endpoints behind the company cash module", () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/deposits", "post"],
    ]) {
      const route = findRoute(path, method);

      expect(route.stack.map((layer) => layer.handle.moduleName)).toContain(
        "company_cash",
      );
    }
  });

  it("exposes read and deposit endpoints with deposit guarded by extra middleware", () => {
    const routes = companyCashRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        methods: layer.route.methods,
        path: layer.route.path,
        stackLength: layer.route.stack.length,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          methods: expect.objectContaining({ get: true }),
          path: "/",
        }),
        expect.objectContaining({
          methods: expect.objectContaining({ post: true }),
          path: "/deposits",
        }),
      ]),
    );

    const getRoute = routes.find((route) => route.path === "/");
    const depositRoute = routes.find((route) => route.path === "/deposits");

    expect(depositRoute.stackLength).toBeGreaterThan(getRoute.stackLength);
  });
});

function findRoute(path, method) {
  const layer = companyCashRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}
