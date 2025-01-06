import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db/connectDB.js";
import authRoutes from "./routes/authRoute.js";
import cookieParser from "cookie-parser";
import path from "path";
import userRoutes from "./routes/userRoute.js";
import companyRoutes from "./routes/companyRoute.js";
import partnerRoutes from "./routes/partnerRoute.js";
import transactionRoutes from "./routes/transactionRoute.js";
import { swaggerDocs, swaggerUi } from "./swaggerConfig.js";

dotenv.config();
const app = express();
const __dirname = path.resolve();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json()); //Parse incoming reques
app.use(cookieParser()); //Parse incoming cookies

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/transactions", transactionRoutes);

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Only in the production environment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}
// Run the server
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
    connectDB();
  });
}

export default app;
