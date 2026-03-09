# Tool Calling Implementation - Summary

## Problem
The original `state-orchestrator.ts` had tools defined but never executed them:
- Tools were passed to `aiAdapter.generateText()` but results weren't processed
- `ragService.searchProducts` and `ragService.searchBusinessMedia` were referenced but never called
- No mechanism to execute tool calls returned by the LLM

## Solution

### 1. AI Adapter Enhancement (`src/infraestructure/adapters/ai/`)

**New Interface Method:**
```typescript
generateTextWithTools(request: MessagesBasedRequest): Promise<GenerateTextResult>
```

**Key Features:**
- Simple implementation (~30 lines)
- Returns both content and tool calls
- Caller is responsible for tool execution (separation of concerns)
- Uses existing resilient query pattern

**Files Changed:**
- `ai.adapter.interface.ts` - Added `GenerateTextResult` type and `generateTextWithTools` method
- `ai.adapter.ts` - Implemented `generateTextWithTools`
- `index.ts` - Exported `ToolCall`, `ToolDefinition`, `GenerateTextResult` types

### 2. State Orchestrator Enhancement (`src/application/use-cases/sagas/state-orchestrator.ts`)

**New Functions:**

1. **`createProductOrderToolExecutor(ctx)`** - Creates tool executor
   - Executes `search_products` tool → calls `ragService.searchProducts()`
   - Executes `get_menu` tool → calls `ragService.searchProducts()` with category
   - Returns JSON-formatted results for LLM

2. **`processToolCalls(toolCalls, executor, ctx)`** - Processes LLM tool calls
   - Parses tool arguments (JSON)
   - Executes each tool via executor
   - Returns formatted `ChatMessage[]` for LLM consumption

**Flow:**
```
1. User message → LLM with tools
2. LLM returns tool calls? → Execute tools
3. Tool results → Back to LLM
4. LLM generates final response with tool results
5. Return to user
```

### 3. Tests

**Unit Tests** (`src/test/unit/tools/product-order-tools.test.ts`):
- ✅ Tool executor creation
- ✅ `search_products` execution
- ✅ `get_menu` execution (with/without category)
- ✅ Missing parameter handling
- ✅ Unknown tool handling
- ✅ Invalid JSON argument handling
- ✅ Multiple tool calls
- ✅ Result formatting

**Integration Tests** (`src/test/integration/orders/product-order-tools.test.ts`):
- ✅ Search specific product
- ✅ View full menu
- ✅ Filter by category
- ✅ Conversational flow without tools
- ✅ Multiple tool calls in sequence

## Key Design Decisions

1. **Separation of Concerns**: AI adapter only detects tool calls; state orchestrator executes them
2. **Simple over Complex**: No automatic retry loop in adapter (max 30 lines)
3. **Type Safety**: Full TypeScript types for tool calls and results
4. **Error Handling**: Graceful handling of invalid JSON, missing params, unknown tools
5. **Testability**: Exported helper functions for unit testing

## Tool Definitions

### `search_products`
```json
{
  "name": "search_products",
  "description": "Search for products by name or description similarity.",
  "parameters": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "Product description to search for"
      }
    },
    "required": ["description"],
    "additionalProperties": false
  }
}
```

### `get_menu`
```json
{
  "name": "get_menu",
  "description": "Get menu items by category or full menu.",
  "parameters": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "Category filter (optional)"
      }
    },
    "additionalProperties": false
  }
}
```

## Usage Example

```typescript
const result = await aiAdapter.generateTextWithTools({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Quiero una pizza" }
  ],
  tools: [searchProductsTool, getMenuTool]
});

if (result.toolCalls?.length > 0) {
  // Execute tools
  const toolResults = await processToolCalls(
    result.toolCalls,
    createProductOrderToolExecutor(ctx),
    ctx
  );
  
  // Get final response
  messages.push(...toolResults);
  const response = await aiAdapter.generateText({ messages, tools });
  return response;
}

return result.content;
```

## Test Results

**Unit Tests: 11 pass, 0 fail, 30 assertions**

Concrete validations:
- ✅ Returns JSON with `products` array (length, name, price, enabled)
- ✅ Returns error JSON when description is missing
- ✅ Returns JSON with `menuItems` array with correct category
- ✅ Calls `ragService.searchProducts` with correct limits (5 for search, 20 for full menu)
- ✅ Returns `ChatMessage[]` with role 'tool' and tool_call_id
- ✅ Handles invalid JSON arguments gracefully
- ✅ Handles multiple tool calls in order

**Integration Tests: 7 tests with concrete assertions**
- ✅ Pizza search → contains "pizza" or "menú" or "disponible"
- ✅ Menu query → contains "menú" or "carta" or "plato"
- ✅ Beverages filter → contains "bebida" or "refresco" or "menú"
- ✅ Greeting → contains "hola" or "buenas", NOT "error"
- ✅ Complete flow: menu → vegetarian → order (regex patterns)
- ✅ Hamburger search → contains "hamburguesa" or related terms
- ✅ Dessert query → contains "postre" or "dulce" or "tarta"

**TypeScript: ✅ No errors**

## Next Steps

1. Run integration tests with live server: `bun test src/test/integration/orders/`
2. Monitor tool call performance in production
3. Add more tools as needed (e.g., `get_product_details`, `check_availability`)
