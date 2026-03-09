import { describe, test, expect, mock } from "bun:test";
import { DomainCtx } from "@/domain/booking";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { ToolCall } from "@/infraestructure/adapters/ai";
import type { ExecuteToolFn } from "@/application/use-cases/sagas/state-orchestrator";

const mockRagService = {
  searchProducts: mock(() =>
    Promise.resolve({
      points: [
        {
          id: "product-1",
          payload: {
            name: "Pizza Margarita",
            description: "Pizza con tomate y mozzarella",
            price: 12.5,
            enabled: true,
          },
        },
        {
          id: "product-2",
          payload: {
            name: "Ensalada César",
            description: "Ensalada con pollo y parmesano",
            price: 9.0,
            enabled: true,
          },
        },
        {
          id: "product-3",
          payload: {
            name: "Coca Cola",
            description: "Refresco de cola 330ml",
            price: 2.5,
            enabled: true,
          },
        },
      ],
    }),
  ),
};

mock.module("@/application/services/rag", () => ({
  ragService: mockRagService,
}));

const { createProductOrderToolExecutor, processToolCalls } =
  await import("@/application/use-cases/sagas/state-orchestrator");

describe("Product Order Tool Executor", () => {
  const mockCtx = {
    businessId: "test-business-123",
    business: {
      general: {
        businessType: "restaurant" as SpecializedDomain,
        isActive: true,
      },
    },
    customerMessage: "Test message",
    customerPhone: "+34555555555",
    chatKey: "chat:test:123",
  } as DomainCtx;

  describe("createProductOrderToolExecutor", () => {
    test("should return JSON with products array for search_products", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);

      const result = await executor({
        name: "search_products",
        arguments: { description: "pizza" },
        ctx: mockCtx,
      });

      const parsed = JSON.parse(result);
      expect(parsed.products).toBeArray();
      expect(parsed.products).toHaveLength(3);
      expect(parsed.products[0].name).toBe("Pizza Margarita");
      expect(parsed.products[0].price).toBe(12.5);
      expect(parsed.products[0].enabled).toBe(true);
    });

    test("should return error JSON when description is missing", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);

      const result = await executor({
        name: "search_products",
        arguments: {},
        ctx: mockCtx,
      });

      const parsed = JSON.parse(result);
      expect(parsed.error).toBe("Missing required parameter: description");
    });

    test("should return JSON with menuItems for get_menu without category", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);

      const result = await executor({
        name: "get_menu",
        arguments: {},
        ctx: mockCtx,
      });

      const parsed = JSON.parse(result);
      expect(parsed.menuItems).toBeArray();
      expect(parsed.menuItems).toHaveLength(3);
      expect(parsed.menuItems[0].category).toBe("general");
    });

    test("should return JSON with menuItems filtered by category 'bebidas'", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);

      const result = await executor({
        name: "get_menu",
        arguments: { description: "bebidas" },
        ctx: mockCtx,
      });

      const parsed = JSON.parse(result);
      expect(parsed.menuItems).toBeArray();
      expect(parsed.menuItems[0].category).toBe("bebidas");
    });

    test("should return error JSON for unknown tool", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);

      const result = await executor({
        name: "delete_product",
        arguments: { id: "123" },
        ctx: mockCtx,
      });

      const parsed = JSON.parse(result);
      expect(parsed.error).toBe("Unknown tool: delete_product");
    });

    test("should call ragService.searchProducts with correct limit (5 for search, 20 for full menu)", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);

      // Search with limit 5
      await executor({
        name: "search_products",
        arguments: { description: "pizza" },
        ctx: mockCtx,
      });
      expect(mockRagService.searchProducts).toHaveBeenCalledWith(
        "pizza",
        "test-business-123",
        5,
      );

      // Full menu with limit 20
      await executor({
        name: "get_menu",
        arguments: {},
        ctx: mockCtx,
      });
      expect(mockRagService.searchProducts).toHaveBeenCalledWith(
        "menú completo",
        "test-business-123",
        20,
      );

      // Category filter with limit 5
      await executor({
        name: "get_menu",
        arguments: { description: "postres" },
        ctx: mockCtx,
      });
      expect(mockRagService.searchProducts).toHaveBeenCalledWith(
        "postres",
        "test-business-123",
        5,
      );
    });
  });

  describe("processToolCalls", () => {
    test("should return ChatMessage array with role 'tool'", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);
      const toolCalls: ToolCall[] = [
        {
          type: "function",
          function: {
            name: "search_products",
            arguments: JSON.stringify({ description: "pizza" }),
          },
        },
      ];

      const results = await processToolCalls(toolCalls, executor, mockCtx);

      expect(results).toBeArray();
      expect(results).toHaveLength(1);
      expect(results[0].role).toBe("tool");
      expect(results[0].name).toBe("search_products");
    });

    test("should include tool_call_id in result message", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);
      const toolCalls: ToolCall[] = [
        {
          type: "function",
          function: {
            name: "search_products",
            arguments: JSON.stringify({ description: "pizza" }),
          },
          id: "call_abc123",
        },
      ];

      const results = await processToolCalls(toolCalls, executor, mockCtx);

      expect(results[0].tool_call_id).toBe("call_abc123");
    });

    test("should return JSON string in content field", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);
      const toolCalls: ToolCall[] = [
        {
          type: "function",
          function: {
            name: "search_products",
            arguments: JSON.stringify({ description: "pizza" }),
          },
        },
      ];

      const results = await processToolCalls(toolCalls, executor, mockCtx);

      expect(() => JSON.parse(results[0].content)).not.toThrow();
      const parsed = JSON.parse(results[0].content);
      expect(parsed.products).toBeArray();
    });

    test("should handle multiple tool calls in order", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);
      const toolCalls: ToolCall[] = [
        {
          type: "function",
          function: {
            name: "search_products",
            arguments: JSON.stringify({ description: "pizza" }),
          },
          id: "call_1",
        },
        {
          type: "function",
          function: {
            name: "get_menu",
            arguments: JSON.stringify({ description: "bebidas" }),
          },
          id: "call_2",
        },
      ];

      const results = await processToolCalls(toolCalls, executor, mockCtx);

      expect(results).toHaveLength(2);
      expect(results[0].tool_call_id).toBe("call_1");
      expect(results[0].name).toBe("search_products");
      expect(results[1].tool_call_id).toBe("call_2");
      expect(results[1].name).toBe("get_menu");
    });

    test("should handle invalid JSON by using empty args", async () => {
      const executor = createProductOrderToolExecutor(mockCtx);
      const toolCalls: ToolCall[] = [
        {
          type: "function",
          function: {
            name: "search_products",
            arguments: "invalid json {",
          },
        },
      ];

      const results = await processToolCalls(toolCalls, executor, mockCtx);

      expect(results).toHaveLength(1);
      expect(results[0].role).toBe("tool");
      // Should return error JSON for missing description
      const parsed = JSON.parse(results[0].content);
      expect(parsed.error).toBeDefined();
    });
  });
});
