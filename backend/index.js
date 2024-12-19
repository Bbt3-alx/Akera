import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db/connectDB.js";
import authRoutes from "./routes/authRoute.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();

app.use(express.json()); //Parse incoming reques
app.use(cookieParser()); //Parse incoming cookies
app.use("/api/auth", authRoutes);

// Run the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
  connectDB();
});
