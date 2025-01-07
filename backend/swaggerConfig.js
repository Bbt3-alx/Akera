import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

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
        url: "http://localhost:5000",
        description: `${process.env.NODE_ENV} server`,
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
