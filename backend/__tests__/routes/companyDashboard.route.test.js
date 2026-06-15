import { readFileSync } from "fs";

import { describe, expect, it, jest } from "@jest/globals";

import companyDashboardRoutes from "../../routes/companyDashboardRoute.js";
import legacyDashboardRoutes from "../../routes/dashbordRoute.js";

describe("company dashboard routes", () => {
  it("exposes GET / behind verified active company-context middleware", () => {
    const route = getRoute(companyDashboardRoutes, "/", "get");
    const handlerNames = route.stack.map((layer) => layer.handle.name);

    expect(handlerNames.slice(0, 3)).toEqual([
      "verifyToken",
      "requireVerifiedUser",
      "resolveCompanyContext",
    ]);
  });

  it("keeps the old legacy dashboard endpoint disabled with 410", async () => {
    const res = createResponse();

    await callLastRouteHandler(legacyDashboardRoutes, "/", "get", {}, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 410,
      message:
        "Legacy dashboard route disabled. Use the modern dashboard endpoint when available.",
    });
  });

  it("mounts the modern endpoint at /api/v1/company/dashboard", () => {
    const indexSource = readFileSync("backend/index.js", "utf8");

    expect(indexSource).toContain("companyDashboardRoutes");
    expect(indexSource).toContain(
      'app.use("/api/v1/company/dashboard", companyDashboardRoutes)',
    );
  });

  it("documents the modern company dashboard endpoint", () => {
    const miscSwagger = readFileSync("backend/swagger/misc.yaml", "utf8");
    const dashboardSection = getSwaggerPathSection(
      miscSwagger,
      '"/api/v1/company/dashboard":',
    );

    expect(dashboardSection).toContain("Modern company dashboard");
    expect(dashboardSection).toMatch(/requires a verified\s+user/);
    expect(dashboardSection).toContain("#/components/parameters/CompanyIdHeader");
    expect(dashboardSection).toContain("manager");
    expect(dashboardSection).toContain("employee");
    expect(dashboardSection).toContain("partner");
    expect(dashboardSection).toContain("partnerBalance");
    expect(dashboardSection).toContain("canceling");
    expect(dashboardSection).toContain("reversing");
    expect(dashboardSection).toContain("trialBalance");
    expect(dashboardSection).toContain("TRIAL_BALANCE_ERROR");
  });
});

async function callLastRouteHandler(router, path, method, req, res) {
  const route = getRoute(router, path, method);
  const handler = route.stack.at(-1).handle;

  await handler(req, res, jest.fn());
}

function getRoute(router, path, method) {
  const layer = router.stack.find(
    (candidate) =>
      candidate.route?.path === path &&
      (candidate.route?.methods?.[method] || candidate.route?.methods?._all),
  );

  expect(layer).toBeDefined();

  return layer.route;
}

function createResponse() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };

  return res;
}

function getSwaggerPathSection(swagger, path) {
  const start = swagger.indexOf(path);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextPath = swagger.indexOf('\n  "/api/v1/', start + 1);

  return nextPath === -1 ? swagger.slice(start) : swagger.slice(start, nextPath);
}
