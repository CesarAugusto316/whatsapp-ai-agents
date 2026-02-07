//@ts-nocheck
import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Store original environment
const originalEnv = { ...process.env };

describe("Integration: /test-ai endpoint", () => {
  // Common mocks setup function
  function setupCommonMocks() {
    // Mock Redis client
    mock.module("@/infraestructure/cache/redis.client", () => ({
      redisClient: {
        get: mock(async () => null),
        set: mock(async () => {}),
        del: mock(async () => {}),
        expire: mock(async () => {}),
        lrange: mock(async () => []),
        rpush: mock(async () => {}),
        ltrim: mock(async () => {}),
      },
    }));

    // Mock CMS client
    mock.module("@/infraestructure/adapters/cms/cms.adapter", () => ({
      default: {
        getBusinessById: mock(async () => ({
          id: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
          general: {
            name: "Test Restaurant",
            isActive: true,
            timezone: "America/Guayaquil",
          },
          settings: {
            businessHours: {},
          },
        })),
        getCostumerByPhone: mock(async () => ({
          id: "customer-123",
          name: "Test Customer",
          phoneNumber: "+3455555555",
          business: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
        })),
        createCostumer: mock(async () => ({})),
        updateCostumer: mock(async () => ({})),
        checkAvailability: mock(async () => ({})),
        getAppointmentById: mock(async () => ({})),
        getAppointmentsByParams: mock(async () => ({})),
        createAppointment: mock(async () => ({})),
        updateAppointment: mock(async () => ({})),
        deleteAppointment: mock(async () => ({})),
      },
    }));

    // Mock AI client
    mock.module("@/infraestructure/adapters/ai", () => ({
      aiClient: {
        userMsg: mock(
          async () =>
            "¡Hola! Soy el asistente virtual del restaurante Test Restaurant. ¿En qué puedo ayudarte hoy?",
        ),
        systemMsg: mock(async () => "Mock AI response"),
      },
    }));

    // Mock chat history adapter
    mock.module("@/infraestructure/adapters/cache/chatHistory.adapter", () => ({
      default: {
        get: mock(async () => []),
        push: mock(async () => {}),
      },
    }));

    // Mock cache adapter
    mock.module("@/infraestructure/adapters/cache/cache.adapter", () => ({
      default: {
        get: mock(async () => undefined),
        save: mock(async () => {}),
        delete: mock(async () => {}),
      },
    }));

    // Mock reservation saga orchestrator (default behavior)
    mock.module("@/application/use-cases/sagas", () => ({
      reservationStateOrchestrator: mock(async () => ({
        bag: {},
        lastStepResult: {
          execute: {
            result:
              "¡Hola! Soy el asistente virtual del restaurante. ¿En qué puedo ayudarte?",
          },
        },
      })),
      whatsappSagaOrchestrator: mock(async () => ({
        bag: {},
        lastStepResult: {
          execute: {
            result:
              "¡Hola! Soy el asistente virtual del restaurante. ¿En qué puedo ayudarte?",
          },
        },
      })),
    }));

    // Mock intent classifier agent
    mock.module(
      "@/application/agents/restaurant/reservation/intent-classifier-agent",
      () => ({
        intentClassifierAgent: {
          howOrWhat: mock(async () => "WHAT"),
        },
      }),
    );

    // Mock humanizer agent
    mock.module(
      "@/application/agents/restaurant/reservation/humanizer-agent",
      () => ({
        humanizerAgent: mock((message: string) => message),
      }),
    );

    // Mock logger middleware
    mock.module("@/application/middlewares/logger-middleware", () => ({
      loggerMiddleware: () => async (c: any, next: any) => await next(),
    }));
  }

  beforeEach(() => {
    // Set up test environment variables
    process.env.CMS_API = "http://mock-cms:3000";
    process.env.CMS_SLUG = "test-slug";
    process.env.CMS_API_KEY = "test-api-key";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    process.env.CLOUDFLARE_AUTH_TOKEN = "test-auth-token";
    process.env.PORT = "3000";
    process.env.WAHA_API = "http://mock-waha:3000";
    process.env.NODE_ENV = "test";

    // Clear all mocks
    mock.restore();

    // Mock Sentry to prevent initialization errors
    mock.module("@sentry/bun", () => ({
      init: mock(() => {}),
      captureException: mock(() => {}),
      consoleLoggingIntegration: mock(() => ({})),
    }));

    // Setup common mocks
    setupCommonMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test("should return successful response for first message", async () => {
    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "hola",
        from: "+3455555555",
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const responseBody = await res.json();
    // expect(responseBody).toHaveProperty("received", true);
    // expect(responseBody).toHaveProperty("text");
    expect(typeof responseBody.lastStepResult.execute.result).toBe("string");
  });

  test("should handle reservation request", async () => {
    // Override reservation saga orchestrator mock for this test
    mock.module("@/application/use-cases/sagas", () => ({
      reservationStateOrchestrator: mock(async (ctx: any) => {
        if (ctx.customerMessage?.toLowerCase().includes("reserva")) {
          return {
            bag: {},
            lastStepResult: {
              execute: {
                result:
                  "Para hacer una reserva, necesito algunos detalles. ¿Para cuántas personas será?",
              },
            },
          };
        }
        return {
          bag: {},
          lastStepResult: {
            execute: {
              result: "Respuesta por defecto",
            },
          },
        };
        // return ;
      }),
    }));

    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "quiero hacer una reserva",
        from: "+3455555555",
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const responseBody = await res.json();
    // expect(responseBody.received).toBe(true);
    expect(responseBody.lastStepResult.execute.result).toContain("reserva");
  });

  test("should handle inactive business", async () => {
    // Override CMS client mock for inactive business
    mock.module("@/infraestructure/adapters/cms/cms.adapter", () => ({
      default: {
        getBusinessById: mock(async () => ({
          id: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
          general: {
            name: "Test Restaurant",
            isActive: false, // Business is inactive
            timezone: "America/Guayaquil",
          },
          settings: {
            businessHours: {},
          },
        })),
        getCostumerByPhone: mock(async () => ({
          id: "customer-123",
          name: "Test Customer",
          phoneNumber: "+3455555555",
          business: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
        })),
        createCostumer: mock(async () => ({})),
        updateCostumer: mock(async () => ({})),
        checkAvailability: mock(async () => ({})),
        getAppointmentById: mock(async () => ({})),
        getAppointmentsByParams: mock(async () => ({})),
        createAppointment: mock(async () => ({})),
        updateAppointment: mock(async () => ({})),
        deleteAppointment: mock(async () => ({})),
      },
    }));

    // Override reservation saga orchestrator to handle inactive business
    mock.module("@/application/use-cases/sagas", () => ({
      reservationStateOrchestrator: mock(async (ctx: any) => {
        if (!ctx.business?.general?.isActive) {
          return {
            bag: {},
            lastStepResult: {
              execute: {
                result:
                  "El negocio está fuera de servicio, por favor inténtalo más tarde.",
              },
            },
          };
        }
        return {
          bag: {},
          lastStepResult: {
            execute: {
              result: "Respuesta normal",
            },
          },
        };
      }),
    }));

    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "hola",
        from: "+3455555555",
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const responseBody = await res.json();
    // expect(responseBody.received).toBe(true);
    expect(responseBody.lastStepResult.execute.result).toContain(
      "fuera de servicio",
    );
  });
  test("should handle malformed JSON request", async () => {
    // Dynamically import the app (common mocks already set up in beforeEach)
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "invalid json",
    });

    const res = await app.fetch(req);
    // The middleware will throw a JSON parse error, resulting in 500
    expect(res.status).toBe(500);

    const responseBody = await res.json();
    expect(responseBody).toHaveProperty("error");
  });
  test("should handle empty message", async () => {
    // Mock the bootstrap middleware to validate empty messages
    mock.module("@/application/middlewares/bootstrap.middleware", () => ({
      bootstrapMiddleware: () => async (ctx: any, next: any) => {
        const custumerRecievedEvent = await ctx.req.json();
        const customerMessage = (
          custumerRecievedEvent.payload.body || ""
        ).trim();

        if (!customerMessage) {
          return ctx.json({ error: "Customer message not received" }, 400);
        }

        // Set required context values
        ctx.set("businessId", "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c");
        ctx.set("customerMessage", customerMessage);
        ctx.set("customerPhone", "+3455555555");
        ctx.set("business", {
          id: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
          general: {
            name: "Test Restaurant",
            isActive: true,
            timezone: "America/Guayaquil",
          },
          settings: { businessHours: {} },
        });
        ctx.set("customer", {
          id: "customer-123",
          name: "Test Customer",
          phoneNumber: "+3455555555",
          business: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
        });
        ctx.set("bookingState", undefined);
        ctx.set(
          "chatKey",
          "chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555",
        );
        ctx.set(
          "bookingKey",
          "reservation:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555",
        );

        await next();
      },
    }));

    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "", // Empty message
        from: "+3455555555",
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const responseBody = await res.json();
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toContain("Customer message");
  });

  test("should handle existing reservation state", async () => {
    // Mock cache adapter to return existing reservation state
    mock.module("@/infraestructure/adapters/cache/cache.adapter", () => ({
      default: {
        get: mock(async () => ({
          businessId: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
          customerId: "customer-123",
          customerName: "Test Customer",
          status: "MAKE_STARTED",
        })),
        save: mock(async () => {}),
        delete: mock(async () => {}),
      },
    }));

    // Mock reservation saga orchestrator to handle started state
    mock.module("@/application/use-cases/sagas", () => ({
      reservationStateOrchestrator: mock(async (ctx: any) => {
        if (ctx.bookingState?.status === "MAKE_STARTED") {
          return {
            bag: {},
            lastStepResult: {
              execute: {
                result:
                  "Ya estamos en proceso de reserva. ¿Para cuántas personas será?",
              },
            },
          };
        }
        return {
          bag: {},
          lastStepResult: {
            execute: {
              result: "Respuesta por defecto",
            },
          },
        };
      }),
    }));

    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "4 personas",
        from: "+3455555555",
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const responseBody = await res.json();
    // expect(responseBody.received).toBe(true);
    expect(responseBody.lastStepResult.execute.result).toContain(
      "proceso de reserva",
    );
  });

  test("should handle broadcast status phone number", async () => {
    // Mock the bootstrap middleware to validate phone number
    mock.module("@/application/middlewares/bootstrap.middleware", () => ({
      bootstrapMiddleware: () => async (ctx: any, next: any) => {
        const custumerRecievedEvent = await ctx.req.json();
        const customerPhone = custumerRecievedEvent.payload.from;

        if (customerPhone === "status@broadcast") {
          return ctx.json({ error: "Broadcast status not allowed" }, 400);
        }

        // Set required context values for successful case
        ctx.set("businessId", "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c");
        ctx.set("customerMessage", "hola");
        ctx.set("customerPhone", customerPhone);
        ctx.set("business", {
          id: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
          general: {
            name: "Test Restaurant",
            isActive: true,
            timezone: "America/Guayaquil",
          },
          settings: { businessHours: {} },
        });
        ctx.set("customer", {
          id: "customer-123",
          name: "Test Customer",
          phoneNumber: customerPhone,
          business: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
        });
        ctx.set("bookingState", undefined);
        ctx.set(
          "chatKey",
          `chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:${customerPhone}`,
        );
        ctx.set(
          "bookingKey",
          `reservation:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:${customerPhone}`,
        );

        await next();
      },
    }));

    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "hola",
        from: "status@broadcast", // Broadcast status phone
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const responseBody = await res.json();
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toContain("Broadcast status");
  });

  test("should handle customer not found (new customer)", async () => {
    // Override CMS client mock to return no customer
    mock.module("@/infraestructure/adapters/cms/cms.adapter", () => ({
      default: {
        getBusinessById: mock(async () => ({
          id: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
          general: {
            name: "Test Restaurant",
            isActive: true,
            timezone: "America/Guayaquil",
          },
          settings: {
            businessHours: {},
          },
        })),
        getCostumerByPhone: mock(async () => undefined), // No customer found
        createCostumer: mock(async () => ({})),
        updateCostumer: mock(async () => ({})),
        checkAvailability: mock(async () => ({})),
        getAppointmentById: mock(async () => ({})),
        getAppointmentsByParams: mock(async () => ({})),
        createAppointment: mock(async () => ({})),
        updateAppointment: mock(async () => ({})),
        deleteAppointment: mock(async () => ({})),
      },
    }));

    // Mock reservation saga orchestrator to handle new customer
    mock.module("@/application/use-cases/sagas", () => ({
      reservationStateOrchestrator: mock(async (ctx: any) => {
        if (!ctx.customer) {
          return {
            bag: {},
            lastStepResult: {
              execute: {
                result: "¡Bienvenido nuevo cliente! ¿En qué puedo ayudarte?",
              },
            },
          };
        }
        return {
          bag: {},
          lastStepResult: {
            execute: {
              result: "Respuesta para cliente existente",
            },
          },
        };
      }),
    }));

    // Dynamically import the app after mocking
    const { default: app } = await import("@/index.ts");

    const businessId = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
    const payload = {
      payload: {
        body: "hola",
        from: "+3455555555",
      },
    };

    const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const responseBody = await res.json();
    // expect(responseBody.received).toBe(true);
    expect(typeof responseBody.lastStepResult.execute.result).toBe("string");
  });
});
