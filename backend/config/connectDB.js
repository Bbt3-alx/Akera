import mongoose from "mongoose";
import { configDotenv } from "dotenv";

configDotenv();
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/Akera";
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(
      "MongoDB connected",
      conn.connection.host,
      conn.connection.name
    );
  } catch (error) {
    console.log(`Error connection: ${error}`);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
};
