import { PayloadWithScore } from "../pomdp-manager";
import { BeliefIntent, BeliefState, SubIntent } from "./belief.types";

export class BeliefStateUpdater {
  // Solo necesitamos UN umbral para decidir acciones
  private readonly CONFIDENCE_THRESHOLD = 0.65;

  static createEmpty(): BeliefState {
    return {
      executedIntents: {},
      current: undefined,
      previous: undefined,
      intentJumps: 0,
      lastUpdate: Date.now(),
    };
  }

  public update(
    prevState: BeliefState,
    topResult?: PayloadWithScore,
  ): BeliefState {
    //
    if (!topResult) {
      return prevState;
    }

    if (prevState.current && topResult.module === "conversational-signal") {
      //
      if (topResult.intent === "signal:affirmation") {
        //
      }
      if (topResult.intent === "signal:negation") {
        //
      }
      if (topResult.intent === "signal:uncertainty") {
        //
      }
      return prevState;
    }
    if (topResult.module === "social-protocol") {
      return prevState;
    }

    // 2. Calcular confianza base = score del RAG
    let confidence = topResult.score;

    // 3. Ajustar por "sí" / "no" del usuario
    if (
      prevState.previous?.requiresConfirmation === "always" ||
      prevState.previous?.requiresConfirmation === "maybe"
    ) {
      if (
        // newObservation.signals.isAffirmation ||
        topResult.intent === "signal:affirmation"
      ) {
        //
      }
      if (
        // newObservation.signals.isNegation ||
        topResult.intent === "signal:negation"
      ) {
        //
      }
    }

    // 4. Construir estado mínimo (solo 1 intención)
    const intentKey = topResult.intent;
    const newIntent: BeliefIntent = {
      ...topResult,
      signals: {
        isConfirmed: topResult.intent === "signal:affirmation",
        isRejected: topResult.intent === "signal:negation",
        isUncertain: topResult.intent === "signal:uncertainty",
      },
    };

    return {
      ...prevState,
      previous: prevState.current,
      current: newIntent,
      intentJumps: prevState.intentJumps + 1,
      lastUpdate: Date.now(),
    };
  }
}
