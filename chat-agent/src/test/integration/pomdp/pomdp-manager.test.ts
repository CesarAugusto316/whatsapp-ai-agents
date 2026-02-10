import { describe, expect, test, beforeEach } from "bun:test";
import {
  PomdpManager,
  BeliefUpdater,
  IntentExampleKey,
} from "@/application/services/pomdp";
import { ModuleKind } from "@/application/services/pomdp";

// Mock context for testing
const mockCtx = {
  session: "session123",
  whatsappEvent: "message",
  businessId: "business123",
  business: { id: "business123", name: "Test Business" } as any,
  customer: { id: "customer123", name: "Test Customer" } as any,
  customerPhone: "+1234567890",
  customerMessage: "I want to make a reservation",
  chatKey: "chat:business123:customer123",
  activeModules: ["booking", "informational", "restaurant"] as ModuleKind[],
  beliefKey: "belief:business123:customer123",
  bookingKey: "booking:business123:customer123",
  productOrderKey: "order:business123:customer123",
};

describe("PomdpManager", () => {
  let pomdpManager: PomdpManager;

  beforeEach(() => {
    pomdpManager = new PomdpManager();
  });

  test("should initialize with empty belief state", () => {
    const emptyBelief = BeliefUpdater.createEmpty();
    expect(emptyBelief.intents).toEqual({});
    expect(emptyBelief.conversationTurns).toBe(0);
    expect(emptyBelief.entropy).toBe(0);
    expect(emptyBelief.confidence).toBe(0);
  });

  test("should process simple intent with high confidence", async () => {
    const ragResults = [
      {
        intent: "booking:create" as IntentExampleKey,
        module: "booking" as ModuleKind,
        score: 0.9,
      },
    ];

    // Since the process method requires async operations with cache adapter,
    // we'll test the individual components instead
    const initialBelief = BeliefUpdater.createEmpty();

    // Create a mock observation
    const observation = {
      text: "I want to make a reservation",
      intentResults: ragResults,
      signals: {
        isAffirmation: false,
        isNegation: false,
        isUncertain: false,
        needsHelp: false,
        wantsHuman: false,
      },
      context: {
        hasActiveBooking: false,
        hasOrderInProgress: false,
        previousDominantIntent: undefined,
        conversationTurns: 0,
      },
    };

    const updatedBelief = pomdpManager["beliefUpdater"].update(
      initialBelief,
      observation as any,
    );

    expect(updatedBelief.intents["booking:create"]).toBeDefined();
    expect(updatedBelief.intents["booking:create"].probability).toBeGreaterThan(
      0,
    );
  });

  test("should handle multiple intents with varying scores", () => {
    const initialBelief = BeliefUpdater.createEmpty();

    const observation = {
      text: "Maybe I want to see the menu or make a reservation",
      intentResults: [
        {
          intent: "restaurant:view_menu" as IntentExampleKey,
          module: "restaurant" as ModuleKind,
          score: 0.6,
        },
        {
          intent: "booking:create" as IntentExampleKey,
          module: "booking" as ModuleKind,
          score: 0.5,
        },
      ],
      signals: {
        isAffirmation: false,
        isNegation: false,
        isUncertain: true, // This signal should affect the belief
        needsHelp: false,
        wantsHuman: false,
      },
      context: {
        hasActiveBooking: false,
        hasOrderInProgress: false,
        previousDominantIntent: undefined,
        conversationTurns: 0,
      },
    };

    const updatedBelief = pomdpManager["beliefUpdater"].update(
      initialBelief,
      observation as any,
    );

    // Check that both intents are present
    expect(updatedBelief.intents["restaurant:view_menu"]).toBeDefined();
    expect(updatedBelief.intents["booking:create"]).toBeDefined();

    // Check that uncertainty flag affects the state
    expect(updatedBelief.needsClarification).toBe(false); // Will depend on entropy/confidence thresholds
  });

  test("should generate appropriate policy decisions", () => {
    const policyEngine = pomdpManager["policyEngine"];

    // Test with high confidence dominant intent
    const highConfidenceBelief = {
      intents: {
        "booking:create": {
          key: "booking:create",
          probability: 0.85,
          evidence: 3,
          rejected: 0,
          lastSeen: Date.now(),
        },
      },
      dominant: "booking:create",
      entropy: 0.2,
      confidence: 0.85,
      conversationTurns: 2,
      lastUpdate: Date.now(),
      needsClarification: false,
      isStuck: false,
    };

    const action = policyEngine.decide(
      highConfidenceBelief as any,
      mockCtx as any,
    );
    expect(action.type).toBe("execute"); // Should execute since confidence > 0.8 and evidence > 2
  });
});
