// belief-updater.ts
import { ModuleKind, RequiredConfirmation } from "../intents/intent.types";
import { IntentPayloadWithScore } from "../pomdp-manager";
import { BeliefIntent, BeliefState } from "./belief.types";

/**
 * Actualiza el BeliefState del agente con nuevas intenciones detectadas.
 *
 * PRINCIPIOS:
 * - Simple: sin abstracciones innecesarias
 * - Legible: nombres que hablan el dominio
 * - Mantenible: fácil de modificar sin romper cosas
 *
 * INTEGRACIÓN ML (ONNX):
 * Las predicciones se inyectan en userContext/aggregateContext ANTES de llamar a update()
 */
export class BeliefStateUpdater {
  private readonly excludedModules: ModuleKind[] = ["social-protocol"];

  // Umbrales por nivel de riesgo (ajustables según datos reales)
  private readonly thresholds: Record<RequiredConfirmation, number> = {
    never: 0.67,
    maybe: 0.72,
    always: 0.77,
  };

  static createEmpty(): BeliefState {
    return {
      executedIntents: [],
      current: undefined,
      previous: undefined,
      isIntentFound: false,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Actualiza el estado con una nueva intención detectada
   */
  public update(
    prevState: BeliefState,
    alternativeIntents: IntentPayloadWithScore[],
    mainIntent?: IntentPayloadWithScore,
  ): BeliefState {
    // Sin nueva intención → mantenemos estado (no creamos intención artificial)
    if (!mainIntent) {
      return { ...prevState, isIntentFound: false };
    }

    // Si hay intención previa, verificamos si esto es una señal conversacional
    if (
      prevState.current &&
      this.isConversationalSignal(mainIntent, prevState.current)
    ) {
      const updatedIntent = this.applySignalToIntent(
        prevState.current,
        mainIntent,
      );
      return this.createSnapshot(prevState, updatedIntent);
    }

    // Evitamos duplicar módulos excluidos (ej: social-protocol)
    if (this.isExcludedModuleDuplicate(prevState, mainIntent)) {
      return prevState;
    }

    // Nueva intención → creamos snapshot
    const newIntent = this.createBeliefIntent(mainIntent, alternativeIntents);
    return this.createSnapshot(prevState, newIntent);
  }

  /**
   * Crea consultas expresivas sobre el estado (lenguaje de dominio)
   * Uso: const queries = BeliefQueries.of(beliefState);
   */
  public createQueries(state: BeliefState): BeliefQueries {
    return new BeliefQueryLayer(state);
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS (implementación, no expuestos)
  // ─────────────────────────────────────────────────────────────

  private isConversationalSignal(
    intent: IntentPayloadWithScore,
    current: BeliefIntent,
  ): boolean {
    const isSignal = intent.module === "conversational-signal";
    const isCurrentConfident = current.isConfident;
    const isSignalConfident = this.isConfident(
      intent.score,
      this.thresholds[current.requiresConfirmation],
    );
    return isSignal && isCurrentConfident && isSignalConfident;
  }

  private applySignalToIntent(
    prevIntent: BeliefIntent,
    signalIntent: IntentPayloadWithScore,
  ): BeliefIntent {
    return {
      ...prevIntent,
      signals: {
        isConfirmed: signalIntent.intentKey === "signal:affirmation",
        isRejected: signalIntent.intentKey === "signal:negation",
        isUncertain: signalIntent.intentKey === "signal:uncertainty",
      },
    };
  }

  private isExcludedModuleDuplicate(
    state: BeliefState,
    intent: IntentPayloadWithScore,
  ): boolean {
    const hasExcluded = state.executedIntents.some((item) =>
      this.excludedModules.includes(item.module),
    );
    const isExcluded = this.excludedModules.includes(intent.module);
    return hasExcluded && isExcluded;
  }

  private createBeliefIntent(
    mainIntent: IntentPayloadWithScore,
    alternatives: IntentPayloadWithScore[] = [],
  ): BeliefIntent {
    const isConfident = this.isConfident(
      mainIntent.score,
      this.thresholds[mainIntent.requiresConfirmation],
    );

    return {
      ...mainIntent,
      alternatives,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident,
    };
  }

  private createSnapshot(
    prev: BeliefState,
    curr: BeliefIntent,
    isIntentFound = true,
  ): BeliefState {
    return {
      ...prev,
      previous: prev.current,
      current: curr,
      lastUpdate: Date.now(),
      isIntentFound,
    };
  }

  private isConfident(score: number, threshold: number): boolean {
    return score >= threshold;
  }
}

// ─────────────────────────────────────────────────────────────
// CAPA DE CONSULTAS (ligera, sin sobre-ingeniería)
// ─────────────────────────────────────────────────────────────

/**
 * Interfaz de consultas expresivas sobre BeliefState
 *
 * OBJETIVO: Hacer el código más legible sin añadir complejidad innecesaria
 * Uso: queries.isCurrentIntentRejected() en vez de belief.current?.signals.isRejected
 */
export interface BeliefQueries {
  // Intención actual
  isCurrentIntentRejected(): boolean;
  isCurrentIntentConfirmed(): boolean;
  isCurrentIntentUncertain(): boolean;
  canExecuteImmediately(): boolean;
  isConfirmationRequired(): boolean;

  // Historial
  hasUserRejectedSimilarIntentBefore(): boolean;
  getLastConfirmedIntent(): BeliefIntent | null;
  getRejectionChain(): string[];

  // Contexto (futuro: ML predictions)
  getUserPreference(
    key: "priceSensitivity",
  ): "low" | "medium" | "high" | "unknown";
  isSeasonalPatternActive(): boolean;
}

/**
 * Implementación ligera de BeliefQueries
 * No es un Aggregate DDD completo, solo una capa de lectura expresiva
 */
export class BeliefQueryLayer implements BeliefQueries {
  constructor(private state: BeliefState) {}

  isCurrentIntentRejected(): boolean {
    return this.state.current?.signals.isRejected ?? false;
  }

  isCurrentIntentConfirmed(): boolean {
    return this.state.current?.signals.isConfirmed ?? false;
  }

  isCurrentIntentUncertain(): boolean {
    return this.state.current?.signals.isUncertain ?? false;
  }

  canExecuteImmediately(): boolean {
    const intent = this.state.current;
    if (!intent) return false;

    const isNeverConfirm = intent.requiresConfirmation === "never";
    const isMaybeAndConfident =
      intent.requiresConfirmation === "maybe" && intent.isConfident;

    return (
      (isNeverConfirm || isMaybeAndConfident) && this.isCurrentIntentConfirmed()
    );
  }

  isConfirmationRequired(): boolean {
    return this.state.current?.requiresConfirmation === "always";
  }

  hasUserRejectedSimilarIntentBefore(): boolean {
    const currentModule = this.state.current?.module;
    if (!currentModule) return false;

    return this.state.executedIntents.some(
      (intent) => intent.module === currentModule && intent.signals.isRejected,
    );
  }

  getLastConfirmedIntent(): BeliefIntent | null {
    const confirmed = this.state.executedIntents.filter(
      (intent) => intent.signals.isConfirmed,
    );
    return confirmed.length > 0 ? confirmed[confirmed.length - 1] : null;
  }

  getRejectionChain(): string[] {
    return this.state.executedIntents
      .filter((intent) => intent.signals.isRejected)
      .map((intent) => intent.intentKey);
  }

  getUserPreference(key: "priceSensitivity") {
    return this.state.userContext?.preferences?.[key] ?? "unknown";
  }

  isSeasonalPatternActive(): boolean {
    return this.state.aggregateContext?.season !== "regular";
  }
}

// policy-engine.ts (fragmento)
// public decide(belief: BeliefState): PolicyDecision {
//   const intent = belief.current;
//   const queries = new BeliefQueryLayer(belief); // ← capa de consultas

//   if (!belief.isIntentFound || !intent) {
//     return { type: "unknown_intent", intent: undefined, state: belief };
//   }

//   const clonedBelief = structuredClone(belief);

//   // Antes: intent.signals?.isRejected
//   // Ahora: queries.isCurrentIntentRejected()
//   if (queries.isCurrentIntentRejected()) {
//     return { type: "propose_alternative", intent, state: clonedBelief };
//   }

//   // Antes: intent.requiresConfirmation === "always" && !intent.signals?.isConfirmed
//   // Ahora: queries.isConfirmationRequired() && !queries.isCurrentIntentConfirmed()
//   if (queries.isConfirmationRequired() && !queries.isCurrentIntentConfirmed()) {
//     return { type: "ask_confirmation", intent, state: clonedBelief };
//   }

//   // ... resto de reglas
// }
