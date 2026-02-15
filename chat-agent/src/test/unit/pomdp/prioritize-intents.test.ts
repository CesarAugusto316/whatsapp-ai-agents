import { describe, expect, test } from "bun:test";
import {
  IntentPayloadWithScore,
  ModuleKind,
  prioritizeIntents,
} from "@/application/services/pomdp";

describe("prioritizeIntents", () => {
  test("should prioritize booking intents over social protocol intents", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "social-protocol" satisfies ModuleKind,
        intentKey: "social:greeting",
        score: 0.85,
        requiresConfirmation: "never",
      },
      {
        module: "booking" satisfies ModuleKind,
        intentKey: "booking:create",
        score: 0.78,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    // Verifica que el intent de reserva tenga prioridad sobre el saludo
    expect(result[0].intentKey).toBe("booking:create");
    expect(result[1].intentKey).toBe("social:greeting");

    // Verifica que el array esté ordenado después de la búsqueda
    expect(result).toHaveLength(2);
  });

  test("should not reorder if high priority intent already comes first", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "booking" satisfies ModuleKind,
        intentKey: "booking:create",
        score: 0.85,
        requiresConfirmation: "never",
      },
      {
        module: "social-protocol" satisfies ModuleKind,
        intentKey: "social:greeting",
        score: 0.78,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    expect(result[0].intentKey).toBe("booking:create");
    expect(result[1].intentKey).toBe("social:greeting");
  });

  test("should handle single intent correctly", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "social-protocol" satisfies ModuleKind,
        intentKey: "social:greeting",
        score: 0.85,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    expect(result).toHaveLength(1);
    expect(result[0].intentKey).toBe("social:greeting");
  });

  test("should handle empty array", () => {
    const intents: IntentPayloadWithScore[] = [];

    const result = prioritizeIntents(intents);

    expect(result).toHaveLength(0);
  });

  test("should reorder when low priority has high score but difference is small", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "social-protocol" satisfies ModuleKind,
        intentKey: "social:greeting",
        score: 0.9,
        requiresConfirmation: "never",
      },
      {
        module: "booking" satisfies ModuleKind,
        intentKey: "booking:create",
        score: 0.85,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    // Aunque el saludo tiene mayor puntuación, la diferencia es menor a 0.2
    // por lo tanto, el booking debería tener prioridad
    expect(result[0].intentKey).toBe("booking:create");
    expect(result[1].intentKey).toBe("social:greeting");
  });

  test("should not reorder when score difference is too large", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "social-protocol" satisfies ModuleKind,
        intentKey: "social:greeting",
        score: 0.95,
        requiresConfirmation: "never",
      },
      {
        module: "booking" satisfies ModuleKind,
        intentKey: "booking:create",
        score: 0.74,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    // La diferencia de puntuación es mayor a 0.2, por lo que no se reordena
    expect(result[0].intentKey).toBe("social:greeting");
    expect(result[1].intentKey).toBe("booking:create");
  });

  test("should handle conversational signals with low priority", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "conversational-signal" satisfies ModuleKind,
        intentKey: "signal:affirmation",
        score: 0.85,
        requiresConfirmation: "never",
      },
      {
        module: "booking" satisfies ModuleKind,
        intentKey: "booking:create",
        score: 0.78,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    expect(result[0].intentKey).toBe("booking:create");
    expect(result[1].intentKey).toBe("signal:affirmation");
  });

  test("should handle informational intents with medium priority", () => {
    const intents: IntentPayloadWithScore[] = [
      {
        module: "informational" satisfies ModuleKind,
        intentKey: "info:ask_contact",
        score: 0.85,
        requiresConfirmation: "never",
      },
      {
        module: "booking" satisfies ModuleKind,
        intentKey: "booking:create",
        score: 0.78,
        requiresConfirmation: "never",
      },
    ];

    const result = prioritizeIntents(intents);

    expect(result[0].intentKey).toBe("info:ask_contact");
    expect(result[1].intentKey).toBe("booking:create");
  });
});
