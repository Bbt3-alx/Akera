import { afterEach, describe, expect, it, jest } from "@jest/globals";

const ORIGINAL_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;

describe("CORS config", () => {
  afterEach(() => {
    if (ORIGINAL_ALLOWED_ORIGINS === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = ORIGINAL_ALLOWED_ORIGINS;
    }
    jest.resetModules();
  });

  it("keeps localhost dev origins when custom origins are configured", async () => {
    process.env.ALLOWED_ORIGINS = "https://dashboard.example.com";
    jest.resetModules();

    const { CORS_OPTIONS } = await import("../../config/config.js");

    expect(CORS_OPTIONS.origin).toEqual(
      expect.arrayContaining([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://dashboard.example.com",
      ]),
    );
  });

  it("trims configured origins and removes empty entries", async () => {
    process.env.ALLOWED_ORIGINS =
      " https://dashboard.example.com, ,http://localhost:5173, ";
    jest.resetModules();

    const { CORS_OPTIONS } = await import("../../config/config.js");

    expect(CORS_OPTIONS.origin).toContain("https://dashboard.example.com");
    expect(CORS_OPTIONS.origin).toContain("http://localhost:5173");
    expect(CORS_OPTIONS.origin).not.toContain("");
    expect(CORS_OPTIONS.origin).not.toContain(" https://dashboard.example.com");
  });
});
