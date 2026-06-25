import { readFileSync } from "fs";

import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

jest.mock("../../middlewares/rateLimit.js", () => ({
  companyCreationLimiter: (req, res, next) => next(),
}));

jest.mock("../../middlewares/cache.js", () => ({
  cache: () => (req, res, next) => next(),
}));

import app from "../../index.js";

const ALLOWED_ORIGIN = "http://localhost:5173";
const DISALLOWED_ORIGIN = "http://localhost:9999";

describe("CORS middleware", () => {
  it("runs before middleware that can respond to requests", () => {
    const indexSource = readFileSync("backend/index.js", "utf8");
    const corsIndex = indexSource.indexOf("app.use(cors(CORS_OPTIONS))");

    expect(corsIndex).toBeGreaterThanOrEqual(0);
    expect(corsIndex).toBeLessThan(indexSource.indexOf("app.use(activityLogger)"));
    expect(corsIndex).toBeLessThan(indexSource.indexOf("app.use(helmet())"));
    expect(corsIndex).toBeLessThan(
      indexSource.indexOf("app.use(rateLimit(RATE_LIMIT_OPTIONS))"),
    );
    expect(indexSource).toContain('app.options("*", cors(CORS_OPTIONS))');
  });

  it("returns CORS headers for allowed company dashboard preflights", async () => {
    const res = await request(app)
      .options("/api/v1/company/dashboard")
      .set("Origin", ALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "GET")
      .set(
        "Access-Control-Request-Headers",
        "Content-Type, Authorization, x-company-id, idempotency-key",
      );

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    for (const header of [
      "Content-Type",
      "Authorization",
      "x-company-id",
      "idempotency-key",
    ]) {
      expect(res.headers["access-control-allow-headers"]).toContain(header);
    }
  });

  it("keeps CORS headers on allowed company dashboard error responses", async () => {
    const res = await request(app)
      .get("/api/v1/company/dashboard")
      .set("Origin", ALLOWED_ORIGIN);

    expect(res.status).toBe(401);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: "AUTH_HEADER_INVALID",
      }),
    );
  });

  it("does not allow disallowed origins", async () => {
    const res = await request(app)
      .options("/api/v1/company/dashboard")
      .set("Origin", DISALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
