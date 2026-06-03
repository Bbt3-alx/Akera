import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const API_URL = process.env.API_URL || "http://localhost:3000";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Akera API",
      version: "1.0.0",
      description:
        "API documentation for Akera, a finance management system for gold-industry operations.",
    },
    servers: [
      {
        url: API_URL,
        description: `${process.env.NODE_ENV || "development"} server`,
      },
    ],
  },
  apis: ["./backend/swagger/**/*.yaml"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export { swaggerDocs, swaggerUi };
