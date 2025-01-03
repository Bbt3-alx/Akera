import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const url = process.env.MONGODB_URI;
const createAdmin = async (email, password, name) => {
  console.log(url);
  try {
    await mongoose.connect(url);
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log("Admin user already exists with this email");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new User({
      email,
      password: hashedPassword,
      name,
      roles: ["admin"],
    });

    await adminUser.save();
    console.log("Admin user created succesfully!");
    process.exit(0);
  } catch (error) {
    console.log(`Error creating admin user: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

// Collect input from CLI
const [email, password, name] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error("Usage: node createAdmin.js <email> <password> <name>");
  process.exit(1);
}

createAdmin(email, password, name);
