import { readFileSync } from "fs";

import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../middlewares/cache.js", () => ({
  cache: () => (req, res, next) => next(),
}));

jest.mock("../../middlewares/rateLimit.js", () => ({
  companyCreationLimiter: (req, res, next) => next(),
}));

jest.mock("../../controllers/getDashboardStats.js", () => ({
  getDashboardData: (req, res) =>
    res.status(200).json({ success: true, data: {} }),
}));

import companyCashRoutes from "../../routes/companyCashRoute.js";
import companyExchangeRateRoutes from "../../routes/companyExchangeRateRoute.js";
import companyRoutes from "../../routes/companyRoute.js";
import dashboardRoutes from "../../routes/dashbordRoute.js";
import partnerRoutes from "../../routes/partnerRoute.js";
import transactionRoutes from "../../routes/transactionRoute.js";

describe("legacy mounted route shutdown", () => {
  it("returns 410 from mounted legacy partner routes", async () => {
    for (const [path, method] of [
      ["/", "get"],
      ["/new", "post"],
      ["/:id", "get"],
      ["/:id/update/", "put"],
      ["/:id/balance", "get"],
      ["/:id/remove", "put"],
      ["/:id/restore", "put"],
    ]) {
      const res = createResponse();

      await callLastRouteHandler(partnerRoutes, path, method, {}, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 410,
        message: "Legacy partner route disabled. Use company memberships instead.",
      });
    }
  });

  it("keeps create company mounted and returns 410 from legacy company routes", async () => {
    expect(getRoute(companyRoutes, "/", "post").stack.at(-1).handle.name).toBe(
      "createCompany",
    );

    for (const [path, method] of [
      ["/", "get"],
      ["/:id", "get"],
      ["/:id", "put"],
      ["/delete/:id", "put"],
    ]) {
      const res = createResponse();

      await callLastRouteHandler(companyRoutes, path, method, {}, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 410,
        message:
          "Legacy company route disabled. Use membership-context company endpoints instead.",
      });
    }
  });

  it("returns 410 from the old dashboard route", async () => {
    const res = createResponse();

    await callLastRouteHandler(dashboardRoutes, "/", "get", {}, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 410,
      message:
        "Legacy dashboard route disabled. Use the modern dashboard endpoint when available.",
    });
  });

  it("keeps modern company subroutes and transaction routes mounted", () => {
    expect(getRoute(companyCashRoutes, "/", "get")).toBeDefined();
    expect(getRoute(companyCashRoutes, "/deposits", "post")).toBeDefined();
    expect(getRoute(companyExchangeRateRoutes, "/", "get")).toBeDefined();
    expect(getRoute(companyExchangeRateRoutes, "/", "put")).toBeDefined();

    expect(getRoute(transactionRoutes, "/", "post")).toBeDefined();
    expect(getRoute(transactionRoutes, "/", "get")).toBeDefined();
    expect(getRoute(transactionRoutes, "/mine", "get")).toBeDefined();
    expect(getRoute(transactionRoutes, "/pay/:transactionCode", "post")).toBeDefined();
    expect(getRoute(transactionRoutes, "/:transactionCode/cancel", "put")).toBeDefined();
    expect(getRoute(transactionRoutes, "/:transactionCode/reverse", "post")).toBeDefined();
  });

  it("documents disabled legacy partner, company, and dashboard routes as 410", () => {
    const partnerSwagger = readFileSync("backend/swagger/partner.yaml", "utf8");
    const companySwagger = readFileSync("backend/swagger/company.yaml", "utf8");
    const miscSwagger = readFileSync("backend/swagger/misc.yaml", "utf8");

    for (const path of [
      '"/api/v1/partners/new":',
      '"/api/v1/partners":',
      '"/api/v1/partners/{id}":',
      '"/api/v1/partners/{id}/update":',
      '"/api/v1/partners/{id}/balance":',
      '"/api/v1/partners/{id}/remove":',
      '"/api/v1/partners/{id}/restore":',
    ]) {
      const section = getSwaggerPathSection(partnerSwagger, path);

      expect(section).toContain("Legacy partner route disabled");
      expect(section).toContain('"410":');
    }

    for (const path of [
      '"/api/v1/companies":',
      '"/api/v1/companies/{id}":',
      '"/api/v1/companies/delete/{id}":',
    ]) {
      const section = getSwaggerPathSection(companySwagger, path);

      expect(section).toContain("Legacy company route disabled");
      expect(section).toContain('"410":');
    }

    const dashboardSection = getSwaggerPathSection(
      miscSwagger,
      '"/api/v1/dashboard":',
    );
    expect(dashboardSection).toContain("Legacy dashboard route disabled");
    expect(dashboardSection).toContain('"410":');
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
