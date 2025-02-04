import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/connectDB.js";
import cookieParser from "cookie-parser";
import path from "path";
import { CORS_OPTIONS, RATE_LIMIT_OPTIONS } from "./config/config.js";
import authRoutes from "./routes/authRoute.js";
import userRoutes from "./routes/userRoute.js";
import companyRoutes from "./routes/companyRoute.js";
import partnerRoutes from "./routes/partnerRoute.js";
import transactionRoutes from "./routes/transactionRoute.js";
import buyOperationRoutes from "./routes/buyOperationRoutes.js";
import sellOperationRoutes from "./routes/sellOperationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import shipmentRoutes from "./routes/shippingOperationRoutes.js";
import usdTransactionRoutes from "./routes/usdTransactionRoutes.js";
import { swaggerDocs, swaggerUi } from "./swaggerConfig.js";
import { activityLogger } from "./middlewares/activityLogger.js";

dotenv.config();
const app = express();
const __dirname = path.resolve();

// Activity looger
app.use(activityLogger);

// Security Middleware
app.use(helmet());
app.use(rateLimit(RATE_LIMIT_OPTIONS));
app.use(cors(CORS_OPTIONS));

// Body Parsers
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/partners", partnerRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/operations", buyOperationRoutes);
app.use("/api/v1/sells", sellOperationRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/dollars", usdTransactionRoutes);

// Swagger (Dev only)
// if (process.env.NODE_ENV !== "production") {
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// }

// Production static files
if (process.env.NODE_ENV === "production") {
  app.use(
    express.static(path.join(__dirname, "/frontend/dist"), {
      maxAge: "1y",
    })
  );
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

// Error Handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    code: 500,
    message: "Internal Server Error",
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
