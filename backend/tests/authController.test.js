import request from "supertest";
import app from "../index.js";
import * as mockingoose from "mockingoose";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mocked-token"),
}));

// TEST SUITE FOR LOGIN CONTROLLER
describe("Login Controller", () => {
  it("should log in a user with valid credentials and role", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mockUser = {
      _id: "1",
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      roles: ["admin", "manager"],
      lastLogin: new Date(),
    };

    mockingoose(User).toReturn(mockUser, "findOne");

    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
      role: "admin",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty(
      "message",
      "Connected successfully as admin"
    );
    expect(response.body).toHaveProperty("user");
    expect(response.body).toHaveProperty("token", "mocked-token");
  });

  it("should return 401 for invalid password", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mockUser = {
      _id: "1",
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      roles: ["admin", "manager"],
    };

    mockingoose(User).toReturn(mockUser, "findOne");

    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrongpassword",
      role: "admin",
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message", "Password incorrect");
  });

  it("should return 403 for invalid role", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mockUser = {
      _id: "1",
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      roles: ["admin", "manager"],
    };

    mockingoose(User).toReturn(mockUser, "findOne");

    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
      role: "partner",
    });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "Access denied. Invalid role."
    );
  });

  it("should return 404 if user does not exist", async () => {
    mockingoose(User).toReturn(null, "findOne");

    const response = await request(app).post("/api/auth/login").send({
      email: "nonexistent@example.com",
      password: "password123",
      role: "admin",
    });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "User not found");
  });
});

// TEST SUITE FOR SIGNUP CONTROLLER
describe("Signup Contoller", () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });
  it("should successfully register a user with default roles", async () => {
    const mockUserData = {
      email: "test@gmail.com",
      password: "123456",
      name: "john Doe",
    };

    mockingoose(User).toReturn(null, "findOne"); // No existing user
    mockingoose(User).toReturn({}, "save"); // Mock save operation

    const response = await request(app)
      .post("/api/auth/signup")
      .send(mockUserData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.roles).toEqual(["partner"]);
  });

  it("should register a user with additional valid roles", async () => {
    const mockUserData = {
      email: "test@gmail.com",
      password: "123456",
      name: "john Doe",
      roles: ["manager", "partner"],
    };

    mockingoose(User).toReturn(null, "findOne"); // No existing user
    mockingoose(User).toReturn({}, "save"); //Mock save operation

    const response = (await request(app).post("/api/auth/singup")).setEncoding(
      mockUserData
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.roles).toEqual(
      expect.arrayContaining(["manager", "partner"])
    );
  });

  it("should fail when required fields are missing", async () => {
    const mockUserData = {
      email: "test@gmail.com",
      password: "123456",
    };

    const response = await request(app)
      .post("/api/auth/signup")
      .send(mockUserData);

    expect(response.status).toBe(422);
    expect(response.body.message).toBe("All fields are required");
  });

  it("should fail with invalid email format", async () => {
    const mockUserData = {
      email: "invalide-emailgmail.com",
      password: "123456",
      name: "John Doe",
    };

    const response = (await request(app).post("/api/auth/signup")).send(
      mockUserData
    );

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalide email format");
  });

  it("should fail if user already exists", async () => {
    const mockUserData = {
      email: "test@gmail.com",
      password: "123456",
      name: "John Doe",
    };

    mockingoose(User).toReturn(mockUserData, "findOne");
    const response = await request(app)
      .post("/api/auth/signup")
      .send(mockUserData);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User already exists");
  });

  it("should fail when invalid roles provided", async () => {
    const mockUserData = {
      email: "test@gmail.com",
      password: "12345678",
      roles: ["invalidRole", "manager"],
    };

    mockingoose(User).toReturn(null, "findOne");
    mockingoose(User).toReturn({}, "save"); //Mock save operation

    const response = await request(app)
      .post("/api/auth/signup")
      .send(mockUserData);

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("invalidRole is not a valid role.");
  });

  it("should fail if admin role is provided", async () => {
    const mockUserData = {
      email: "test@example.com",
      password: "123456",
      name: "John Doe",
      roles: ["admin"],
    };

    const response = await request(app)
      .post("/api/auth/signup")
      .send(mockUserData);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "Cannot assign admin role during signup"
    );
  });

  it("should hash the password before saving", async () => {
    const mockUserData = {
      email: "test@example.com",
      password: "123456",
      name: "John Doe",
    };

    mockingoose(User).toReturn(null, "findOne"); // No existing user
    mockingoose(User).toReturn({}, "save"); // Mock save operation

    const response = await request(app)
      .post("/api/auth/signup")
      .send(mockUserData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const savedUser = await User.findOne({ email: mockUserData.email });
    expect(
      await bcrypt.compare(mockUserData.password, savedUser.password)
    ).toBe(true);
  });
});
