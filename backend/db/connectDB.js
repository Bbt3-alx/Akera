import mongoose from "mongoose";
import { configDotenv } from "dotenv";

configDotenv();
const uri = process.env.MONGODB_URI || "mongodb://localhost:12017/akera";
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(uri);
    console.log("MongoDB connected", conn.connection.host, conn.connection.name);
  } catch (error) {
    console.log(`Error connection: ${error}`);
    process.exit(1);
  }
};
