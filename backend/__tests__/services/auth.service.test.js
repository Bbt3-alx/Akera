import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../mail/mails.js", () => ({
  sendResetPasswordEmail: jest.fn(),
  sendResetSuccessEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
}));

import { sendVerificationEmail } from "../../mail/mails.js";
import User from "../../models/User.js";
import {
  loginUser,
  resendVerificationEmail,
  signupUser,
} from "../../services/auth.service.js";

const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000;

describe("auth service email verification", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    sendVerificationEmail.mockReset();
  });

  it("sends one verification email on signup outside production", async () => {
    process.env.NODE_ENV = "test";
    jest.spyOn(User, "findOne").mockReturnValue(createLeanQuery(null));
    jest.spyOn(User, "create").mockImplementation(async (data) => ({
      _id: new mongoose.Types.ObjectId(),
      isVerified: false,
      ...data,
    }));

    await signupUser(createSignupPayload());

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "awa@example.com",
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it("creates a signup user with verification token and expiry", async () => {
    const now = new Date("2026-06-14T10:00:00.000Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(now);
    jest.spyOn(User, "findOne").mockReturnValue(createLeanQuery(null));
    const createUser = jest
      .spyOn(User, "create")
      .mockImplementation(async (data) => ({
        _id: new mongoose.Types.ObjectId(),
        isVerified: false,
        ...data,
      }));

    await signupUser(createSignupPayload());

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "awa@example.com",
        verificationToken: expect.stringMatching(/^\d{6}$/),
        verificationTokenExpiresAt: now + VERIFICATION_TOKEN_TTL_MS,
      }),
    );
  });

  it("rejects registration passwords shorter than eight characters", async () => {
    await expect(
      signupUser({
        ...createSignupPayload(),
        password: "short7",
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      errorCode: "VALIDATION_ERROR",
    });
  });

  it("resend still sends a verification email", async () => {
    const now = new Date("2026-06-14T10:00:00.000Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(now);
    const user = {
      email: "awa@example.com",
      isVerified: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(User, "findOne").mockResolvedValue(user);

    await resendVerificationEmail({ email: "Awa@Example.com" });

    expect(user.verificationToken).toEqual(expect.stringMatching(/^\d{6}$/));
    expect(user.verificationTokenExpiresAt).toBe(
      now + VERIFICATION_TOKEN_TTL_MS,
    );
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "awa@example.com",
      user.verificationToken,
    );
  });

  it("rejects login before verification", async () => {
    const password = "secret123";
    const passwordHash = await bcrypt.hash(password, 10);
    jest.spyOn(User, "findOne").mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      email: "awa@example.com",
      password: passwordHash,
      isVerified: false,
    });

    await expect(
      loginUser({ email: "awa@example.com", password }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "EMAIL_NOT_VERIFIED",
    });
  });
});

function createSignupPayload() {
  return {
    email: "Awa@Example.com",
    firstName: "Awa",
    lastName: "Diallo",
    password: "secret123",
  };
}

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}
