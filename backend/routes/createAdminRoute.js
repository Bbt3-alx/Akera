import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import isAdminMiddleware from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.post("/create-admin", isAdminMiddleware, async (req, res) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      return res
        .status(422)
        .json({ success: false, message: "All fields are required" });
    }

    const eexistingAdmin = await User.findOne({ email });
    if (eexistingAdmin) {
      return res.status(409).json({
        success: false,
        message: "USer with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = new User({
      email,
      password: hashedPassword,
      name,
      roles: ["admin"],
    });
    await adminUser.save();
    res
      .status(201)
      .json({ success: true, message: "Admin user created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
