# Chat History & System Prompt Architecture

## Problem Statement

When implementing RAG (Retrieval-Augmented Generation) with POMDP-based intent management, a critical issue emerged:

**The Snowball Effect:**
- Each iteration injects a **new system prompt** (RAG context + POMDP state)
- Chat history was persisting **all messages including system prompts**
- Over time, multiple contradictory system prompts accumulate in the same context
- Result: Token explosion, conflicting instructions, degraded model performance

## Architectural Decision

### System Prompt: **TRANSIENT** (Per-Iteration)
- **Purpose**: Fresh instructions for the current iteration only
- **Content**: RAG context, POMDP state, business logic, social protocols
- **Lifecycle**: Created → Used → Discarded (never persisted)
- **Quantity**: **EXACTLY 1** per request/response cycle

### Chat History: **PERSISTENT** (Conversation Only)
- **Purpose**: Maintain conversational context across turns
- **Content**: ONLY `user` and `assistant` messages
- **Lifecycle**: Persisted in Redis with TTL (24h production, 30min dev)
- **Quantity**: Maximum 20 messages (sliding window)
- **Filtering**: System prompts are **explicitly filtered out**

## Implementation

### 1. ChatHistoryAdapter - Filter on Read
```typescript
async get(chatKey: string) {
  const rawHistory = await redisClient.lrange(chatKey, -this.MAX_MESSAGES, -1);

  const messages = rawHistory
    .map((item) => JSON.parse(item))
    .filter((msg) => msg.role !== "system"); // ← CRITICAL

  return messages; // Only user/assistant
}
```

### 2. ChatHistoryAdapter - Never Write System Prompts
```typescript
async push(chatKey: string, customerMessage: string, assistantResponse: string) {
  await redisClient.rpush(
    chatKey,
    JSON.stringify({ role: "user", content: customerMessage, timestamp: Date.now() }),
    JSON.stringify({ role: "assistant", content: assistantResponse, timestamp: Date.now() })
  );
  // System prompts are NEVER passed to this method
}
```

### 3. AiAdapter - Defense in Depth
```typescript
handleChatMessage({ systemPrompt, msg, chatHistory = [] }) {
  // Double-check: filter any leaked system prompts
  const cleanHistory = chatHistory.filter(m => m.role !== 'system');

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt }, // ← Fresh each iteration
    ...cleanHistory,                            // ← Persistent conversation
    { role: "user", content: msg },
  ];

  return this.generateText({ messages });
}
```

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ITERATION N                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. POMDP Manager → Policy Decision                        │
│         ↓                                                   │
│  2. RAG Retrieval → Context Chunks                         │
│         ↓                                                   │
│  3. System Prompt = f(POMDP, RAG, Business Rules)          │
│         ↓                                                   │
│  4. Chat History = Redis.get(chatKey)                      │
│         └─→ Filter: NO system prompts                       │
│         └─→ Max 20 messages (user/assistant only)           │
│         ↓                                                   │
│  5. Messages = [SYSTEM, ...HISTORY, USER_MSG]              │
│         ↓                                                   │
│  6. AI Generation                                          │
│         ↓                                                   │
│  7. Redis.push(chatKey, user_msg, assistant_response)      │
│         └─→ System prompt NOT persisted                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ITERATION N+1                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NEW System Prompt (different RAG/POMDP state)             │
│  SAME Chat History (conversation only)                     │
│                                                             │
│  ✅ No accumulation                                        │
│  ✅ No contradictions                                      │
│  ✅ Predictable token count                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Why This Works

| Aspect | Before (Broken) | After (Fixed) |
|--------|----------------|---------------|
| **System Prompts** | Accumulate in history | Transient, per-iteration |
| **Context Size** | Grows unbounded | Bounded (20 messages + 1 system) |
| **Contradictions** | Multiple system prompts conflict | Only 1 active system prompt |
| **RAG Context** | Repeated in history | Fresh retrieval each time |
| **Token Cost** | Unpredictable, growing | Predictable, bounded |
| **Model Performance** | Degrades over time | Consistent |

## Monitoring

Production logging tracks:
- `CHAT_HISTORY_RETRIEVED`: Message count, chat key
- `CHAT_HISTORY_UPDATED`: Push operations, TTL
- `[AiAdapter] System prompt leaked`: Anomaly detection

## Best Practices

1. **Never** pass system prompts to `chatHistoryAdapter.push()`
2. **Always** filter system prompts on read (defense in depth)
3. **Document** when system prompt structure changes
4. **Monitor** message count in production logs
5. **Test** with 20+ message conversations to verify sliding window

## Related Files

- `src/infraestructure/adapters/cache/chatHistory.adapter.ts` - Persistence layer
- `src/infraestructure/adapters/ai/ai.adapter.ts` - Message composition
- `src/application/use-cases/sagas/booking/workflows/converational-workflow.ts` - Usage example

## References

- [OpenAI API: System Role](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)
- [Anthropic: System Prompts](https://docs.anthropic.com/claude/docs/system-prompts)
- [RAG Best Practices](https://arxiv.org/abs/2305.14283)
