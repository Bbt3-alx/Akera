import { beforeEach, describe, expect } from "@jest/globals";
import authorizeRoles from "../middlewares/roleAuthorization";

describe("authorizeROles Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { role: "admin" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("should call next if user role is allowed", () => {
    const middleware = authorizeRoles("admin", "manager");
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if user role is not allowed", () => {
    const middleware = authorizeRoles("manager");
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Insufficient permissions",
    });
  });

  it("should return 403 if user role is missing", () => {
    req.user = {}; // No role
    const middleware = authorizeRoles("admin", "manager");
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. User role not found.",
    });
  });
});
