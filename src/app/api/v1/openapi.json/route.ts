import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Purple Haze Restro & Garden API",
      version: "1.0.0",
      description:
        "Unified REST API v1 for Purple Haze Restro & Garden, Biratnagar. Serves the React Native mobile app, web frontend, and admin dashboard.",
      contact: {
        name: "Purple Haze Tech Team",
        email: "purplehazebiratnagar@gmail.com",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1 Endpoint Base",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "15-minute JWT access token returned from /auth/login or /auth/refresh.",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
          description: "Auth.js session cookie for web browser sessions.",
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: "object",
          properties: {
            data: { type: "object" },
            error: { type: "null" },
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
              },
            },
          },
        },
        StandardErrorResponse: {
          type: "object",
          properties: {
            data: { type: "null" },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Invalid input provided" },
                details: { type: "array", items: { type: "object" } },
              },
              required: ["code", "message"],
            },
          },
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          summary: "Register new customer account",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    phone: { type: "string" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "User registered with auth tokens" },
            "400": { description: "Validation error" },
            "409": { description: "Email already registered" },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Sign in with email and password",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful, returns tokens and user" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          summary: "Rotate refresh token and issue new 15m access token",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "New token pair issued" },
            "401": { description: "Invalid or reused refresh token (family revoked)" },
          },
        },
      },
      "/auth/logout": {
        post: {
          summary: "Revoke refresh token and end session",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": { description: "Logged out successfully" },
          },
        },
      },
      "/auth/google": {
        post: {
          summary: "Verify Google ID token and sign in / register",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idToken"],
                  properties: {
                    idToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Google authentication verified" },
          },
        },
      },
      "/auth/firebase": {
        post: {
          summary: "Verify Firebase ID token and exchange it for the Purple Haze API session",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idToken"],
                  properties: { idToken: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Firebase identity verified and API session issued" },
            "401": { description: "Firebase ID token is invalid or expired" },
            "403": { description: "Firebase email or phone identity is not verified" },
          },
        },
      },
      "/auth/apple": {
        post: {
          summary: "Verify Apple identity token and sign in / register",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["identityToken"],
                  properties: {
                    identityToken: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Apple authentication verified" },
          },
        },
      },
      "/auth/me": {
        get: {
          summary: "Get current authenticated user session",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": { description: "Current user profile" },
            "401": { description: "Unauthenticated" },
          },
        },
      },
      "/menu/categories": {
        get: {
          summary: "List menu categories",
          tags: ["Menu"],
          responses: {
            "200": { description: "List of active categories" },
          },
        },
      },
      "/menu/dishes": {
        get: {
          summary: "List dishes with category and filter support",
          tags: ["Menu"],
          parameters: [
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "isVeg", in: "query", schema: { type: "boolean" } },
            { name: "isFeatured", in: "query", schema: { type: "boolean" } },
          ],
          responses: {
            "200": { description: "List of menu dishes" },
          },
        },
      },
      "/menu/dishes/{slug}": {
        get: {
          summary: "Get single dish details by slug",
          tags: ["Menu"],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Dish details" },
            "404": { description: "Dish not found" },
          },
        },
      },
      "/menu/search": {
        get: {
          summary: "Search dishes by keyword query",
          tags: ["Menu"],
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Matching dishes" },
          },
        },
      },
      "/cart/validate": {
        post: {
          summary: "Validate cart item availability, add-ons, and prices",
          tags: ["Cart"],
          responses: {
            "200": { description: "Validation results" },
          },
        },
      },
      "/coupons/validate": {
        post: {
          summary: "Validate coupon code against subtotal",
          tags: ["Coupons"],
          responses: {
            "200": { description: "Coupon discount calculation" },
          },
        },
      },
      "/checkout/calculate": {
        post: {
          summary: "Server-side calculate order subtotal, discount, delivery, tax and total",
          tags: ["Checkout"],
          responses: {
            "200": { description: "Verified totals calculation" },
          },
        },
      },
      "/orders": {
        get: {
          summary: "List customer orders with pagination",
          tags: ["Orders"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": { description: "Customer order history" },
          },
        },
        post: {
          summary: "Place new order (Idempotency-Key header supported)",
          tags: ["Orders"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } },
          ],
          responses: {
            "201": { description: "Order created successfully" },
          },
        },
      },
      "/orders/{id}": {
        get: {
          summary: "Get order details",
          tags: ["Orders"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "token", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Order details" },
          },
        },
      },
      "/orders/{id}/cancel": {
        post: {
          summary: "Cancel order (if within cancellation window)",
          tags: ["Orders"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Order cancelled" },
          },
        },
      },
      "/orders/{id}/reorder": {
        post: {
          summary: "Extract items from past order to populate new cart",
          tags: ["Orders"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Reorder lines" },
          },
        },
      },
      "/orders/track": {
        get: {
          summary: "Track order status by order number and phone (guest or user)",
          tags: ["Orders"],
          parameters: [
            { name: "orderNumber", in: "query", required: true, schema: { type: "string" } },
            { name: "phone", in: "query", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Live tracking information" },
          },
        },
      },
      "/profile": {
        get: {
          summary: "Get current profile",
          tags: ["Profile"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Profile data" } },
        },
        put: {
          summary: "Update current profile",
          tags: ["Profile"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Profile updated" } },
        },
      },
      "/profile/addresses": {
        get: {
          summary: "List user delivery addresses",
          tags: ["Profile"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Addresses list" } },
        },
        post: {
          summary: "Add new delivery address",
          tags: ["Profile"],
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Address created" } },
        },
      },
      "/profile/favorites": {
        get: {
          summary: "List user favorite dishes",
          tags: ["Profile"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Favorites list" } },
        },
        post: {
          summary: "Toggle favorite status on a dish",
          tags: ["Profile"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Toggled favorite" } },
        },
      },
      "/payments/initiate": {
        post: {
          summary: "Initiate mobile payment (eSewa / Khalti)",
          tags: ["Payments"],
          responses: { "200": { description: "Payment credentials and return URLs" } },
        },
      },
      "/payments/verify": {
        post: {
          summary: "Direct server-side verification of payment status",
          tags: ["Payments"],
          responses: { "200": { description: "Verification confirmation" } },
        },
      },
      "/admin/orders": {
        get: {
          summary: "Admin orders live queue",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "Orders queue" }, "403": { description: "Forbidden" } },
        },
      },
      "/admin/orders/{id}/status": {
        put: {
          summary: "Transition order status (strictly validated)",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "Status updated" } },
        },
      },
      "/admin/menu/dishes/{id}/availability": {
        patch: {
          summary: "Toggle dish availability (sold out toggle)",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "Availability toggled" } },
        },
      },
      "/admin/reports": {
        get: {
          summary: "Get restaurant sales and operation summaries",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "Reports summary data" } },
        },
      },
      "/admin/settings": {
        get: {
          summary: "Get system settings",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "Settings map" } },
        },
        put: {
          summary: "Update system settings (Admin only)",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "Settings updated" } },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
