import jwt from "jsonwebtoken";
import verifyToken from "../middlewares/verifyToken";

jest.mock("jsonwebtoken");

describe("verifyToken Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("should call next if token is valid", () => {
    req.headers.authorization = "Bearer valid-token";
    jwt.verify.mockReturnValue({ id: "1", role: "admin" });

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: "1", role: "admin" });
  });

  it("should return 401 if token is missing", () => {
    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Authorization header missing or malformed",
    });
  });

  it("should return 401 if token is invalid", () => {
    req.headers.authorization = "Bearer invalid-token";
    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token",
    });
  });
});
