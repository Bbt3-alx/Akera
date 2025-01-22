import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const API_URL = process.env.API_URL;
const swaggerOptions = {
  // SWAGGER DEFINTINON
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Akera API, documentation.",
      version: "1.0.0",
      description:
        "Akera is a finance management system designed to help bussiness in gold industry to manage their daily operation.",
    },
    // SERVER INFOS
    servers: [
      {
        url: API_URL,
        description: `${process.env.VITE_NODE_ENV} server`,
      },
    ],

    // COMPONENT
    components: {
      schemas: {
        // User schema
        User: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            id: {
              type: "string",
              description: "The unique identifier for the user.",
            },
            name: {
              type: "string",
              description: "The name of the user.",
            },
            email: {
              type: "string",
              description: "The address email of the user.",
            },
            password: {
              type: "string",
              description: "The password of the user.",
            },
            company: {
              type: "object",
              description:
                "The company linked to the user, this field will be used if the user create a company.",
            },
            roles: {
              type: "array",
              items: {
                type: "string",
              },
              description: "The user roles.",
            },
            lastLogin: {
              type: "string",
              format: "date-time",
              description: "The last time that the user has connected.",
            },
            isVerified: {
              type: "integer",
              description: "Check if user has verified his email.",
            },
          },
        },

        // Company schema
        Company: {
          required: ["name", "address", "contact"],
          properties: {
            id: {
              type: "string",
              description: "The unique identifier for the company.",
            },
            name: {
              type: "string",
              description: "",
            },
            address: {
              type: "string",
              description: "The company physical address",
            },
            contact: {
              type: "string",
              description: "The contact of the company [phone, email]",
            },
            balance: {
              type: "integer",
              description: "The balance of the company",
            },
            manager: {
              type: "object",
              description: "Associated manager",
            },
            partners: {
              type: "object",
              description: "A list of associated partners",
            },
            transaction: {
              type: "object",
              description: "A list of company's transaction.",
            },
            operations: {
              type: "object",
              description: "A list of operation.",
            },
          },
        },

        // Partner schema
        Partner: {
          type: "object",
          required: ["name", "phone", "email"],
          properties: {
            id: {
              type: "string",
              description: "The unique identifier for the partner.",
            },
            name: {
              type: "string",
              description: "The name of the partner",
            },
            phone: {
              type: "string",
              description: "The partner's phone number",
            },
            email: {
              type: "string",
              description: "The email address of the partner",
            },
            companies: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of associated company IDs",
            },
            transaction: {
              type: "object",
              description: "A list of partner's transaction.",
            },
            operations: {
              type: "object",
              description: "A list of partner's operation.",
            },
          },
        },

        // Transaction schema
        Transaction: {
          required: ["amount", "description", "company"],
          properties: {
            id: {
              type: "string",
              description: "The unique identifier for the transaction.",
            },
            amount: {
              type: "integer",
              description: "The amount to be paied.",
            },
            code: {
              type: "string",
              description: "A unique id for the current transaction.",
            },
            date: {
              type: "date",
              description: "The date of the transaction.",
            },
            description: {
              type: "string",
              description:
                "Name of the person to be paid or the purpose of the transaction.",
            },
            status: {
              type: "string",
              description:
                "The transaction status ['pending', 'paid', 'cancelled'], default to pending.",
            },
            partner: {
              type: "object",
              description: "The partner who made the transaction.",
            },
            company: {
              type: "object",
              description: "The company which will process the transaction.",
            },
          },
        },
        // Gold schema
        Gold: {
          required: ["base", "weight"],
          properties: {
            base: {
              type: "number",
              description: "Gold price per gram.",
            },
            weight: {
              type: "number",
              description: "Weight of the gold in grams (must be at least 1).",
              minimum: 1,
            },
            w_weight: {
              type: "number",
              description: "Weight of the gold in another unit, optional.",
            },
            density: {
              type: "number",
              description: "Density of the gold, optional.",
            },
            karat: {
              type: "number",
              description: "The karat value of the gold, optional.",
            },
            value: {
              type: "number",
              description: "The monetary value of this gold.",
            },
            situation: {
              type: "string",
              description: "Current situation or status of the gold.",
            },
          },
        },

        // BuyOperation schema
        BuyOperation: {
          required: ["currency", "gold", "partner", "company"],
          properties: {
            currency: {
              type: "string",
              enum: ["FCFA", "GNF", "USD"],
              description: "Currency used for the transaction.",
              default: "FCFA",
            },
            gold: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Gold",
              },
              description: "List of gold items involved in the transaction.",
            },
            amount: {
              type: "number",
              description: "Total amount of the transaction.",
            },
            paymentStatus: {
              type: "string",
              enum: ["pending", "paid", "partially paid"],
              description: "Current payment status of the transaction.",
              default: "pending",
            },
            amountPaid: {
              type: "number",
              description: "Total amount already paid.",
              default: 0,
            },
            partner: {
              type: "string",
              description:
                "ID of the partner (User) involved in the transaction.",
            },
            company: {
              type: "string",
              description: "ID of the company involved in the transaction.",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Date of the transaction.",
              default: "2025-01-16T00:00:00Z",
            },
            status: {
              type: "string",
              enum: ["pending", "shipped", "completed", "cancelled", "on hold"],
              description: "Current status of the transaction.",
              default: "pending",
            },
          },
        },

        // ShippingOperation schema
        ShippingOperation: {
          required: [
            "weight",
            "carat",
            "amount",
            "partner",
            "company",
            "buyOperationId",
          ],
          properties: {
            weight: {
              type: "number",
              description:
                "Weight of the gold being shipped (must be at least 1).",
              minimum: 1,
            },
            carat: {
              type: "number",
              description: "Carat value of the gold (must be at least 10).",
              minimum: 10,
            },
            amount: {
              type: "number",
              description: "Total amount for the shipping operation.",
            },
            partner: {
              type: "string",
              description:
                "ID of the partner (User) involved in the shipping operation.",
            },
            company: {
              type: "string",
              description: "ID of the company handling the shipping.",
            },
            shippedAt: {
              type: "string",
              format: "date-time",
              description: "Date and time when the gold was shipped.",
              default: Date.now(),
            },
            situation: {
              type: "string",
              description:
                "Current situation or status of the shipping operation.",
            },
            fees: {
              type: "number",
              description: "Fees associated with the shipping operation.",
            },
            status: {
              type: "string",
              enum: ["pending", "shipped"],
              description: "Current status of the shipping operation.",
              default: "pending",
            },
            buyId: {
              type: "string",
              description: "ID of the associated buy operation.",
            },
          },
        },

        // SellOperation schema
        SellOperation: {
          required: ["rate", "weight", "amount", "unit"],
          properties: {
            rate: {
              type: "number",
              description: "Rate at which the gold is being sold.",
            },
            weight: {
              type: "number",
              description:
                "Weight of the gold being sold (must be at least 1).",
              minimum: 1,
            },
            unit: {
              type: "string",
              description: "The unit of weight (e.g., 'grams', 'ounces').",
            },
            amount: {
              type: "number",
              description: "Total amount for the sell operation.",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Date and time of the sell operation.",
              default: Date.now(),
            },
            company: {
              type: "string",
              description: "ID of the company involved in the sell operation.",
            },
            status: {
              type: "string",
              enum: ["pending", "completed", "cancelled"],
              description: "Current status of the sell operation.",
              default: "pending",
            },
          },
        },

        // Payment schema
        Payment: {
          required: ["amount", "totalAmount"],
          properties: {
            operation: {
              type: "string",
              description: "ID of the associated buy operation.",
            },
            description: {
              type: "string",
              description: "Description of the payment.",
            },
            amount: {
              type: "number",
              description: "Currently paying amount.",
            },
            totalAmount: {
              type: "number",
              description: "Total amount from the operation.",
            },
            remain: {
              type: "number",
              description:
                "Remaining amount (totalAmount - paidAmount from operation).",
            },
            status: {
              type: "string",
              enum: ["canceled", "paid", "partially paid", "pending"],
              description: "Current status of the payment.",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Date and time of the payment.",
              default: "2025-01-16T00:00:00Z",
            },
            partner: {
              type: "string",
              description: "ID of the partner involved in the payment.",
            },
            company: {
              type: "string",
              description: "ID of the company processing the payment.",
            },
            paiedBy: {
              type: "string",
              description: "ID of the user who made the payment.",
            },
            method: {
              type: "string",
              description: "Payment method (e.g., Mobile Money, Cash).",
              default: "Cash",
            },
          },
        },
      },

      // RESPONSES
      responses: {
        User: {
          description: "User created successfully, please verify your email.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
        ValidationError: {
          description: "Input validation failed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
              },
            },
          },
        },
        UserExists: {
          description: "User already exists.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Server error.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },

      // Authorization
      securitySchemes: {
        verifyToken: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        verifyToken: [],
      },
    ],
  },

  // API ROUTES LOCATION
  apis: ["./backend/routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
export { swaggerDocs, swaggerUi };
