import { IntentExampleKey } from "../../intents/intent.types";
import { Observation } from "../../observation/observation.types";
import { PayloadWithScore } from "../../pomdp-manager";
import { BeliefIntent, BeliefState } from "../belief.types";

export class BeliefUpdater {
  // Configuración simple: qué tan rápido "olvida" y cuándo actuar
  private readonly DECAY = 0.9; // Olvida 10% por turno
  private readonly MIN_CONFIDENCE = 0.65; // Mínimo para considerar una intención "dominante"
  private readonly MAX_CONFUSION = 0.8; // Máximo de confusión antes de pedir aclaración

  static createEmpty(): BeliefState {
    return {
      intents: {},
      dominant: undefined,
      entropy: 0,
      confidence: 0,
      conversationTurns: 0,
      lastUpdate: Date.now(),
      needsClarification: false,
      isStuck: false,
    };
  }

  public update(current: BeliefState, observation: Observation): BeliefState {
    // Paso 1: Olvidar un poco lo anterior (decay)
    let intents = this.decayIntents(current.intents);

    // Paso 2: Añadir nueva evidencia del RAG
    intents = this.addEvidence(intents, observation.intentResults);

    // Paso 3: Ajustar si el usuario dijo "sí" o "no"
    intents = this.adjustForYesNo(
      intents,
      observation,
      current.dominant?.intent,
    );

    // Paso 4: Calcular métricas finales
    const entropy = this.calculateConfusion(intents);
    const dominant = this.findMostLikelyIntent(intents);
    const confidence = dominant ? intents[dominant.intent].probability : 0;

    return {
      intents,
      dominant,
      entropy,
      confidence,
      conversationTurns: current.conversationTurns + 1,
      lastUpdate: Date.now(),
      needsClarification:
        entropy > this.MAX_CONFUSION || confidence < this.MIN_CONFIDENCE,
      isStuck: current.conversationTurns > 5 && entropy > 0.6,
    };
  }

  // Olvida un 10% de cada intención existente
  private decayIntents(
    intents: Record<string, BeliefIntent>,
  ): Record<string, BeliefIntent> {
    const result = { ...intents };
    for (const key in result) {
      result[key] = {
        ...result[key],
        probability: result[key].probability * this.DECAY,
      };
    }
    return result;
  }

  // Añade nueva evidencia del RAG (vector search)
  private addEvidence(
    intents: Record<string, BeliefIntent>,
    results: PayloadWithScore[],
  ): Record<string, BeliefIntent> {
    const result = { ...intents };

    for (const r of results) {
      // Si es nueva, la creamos
      if (!result[r.intent]) {
        result[r.intent] = {
          key: r.intent,
          probability: 0,
          evidence: 0,
          rejected: 0,
          requiresConfirmation: r.requiresConfirmation,
          lastSeen: Date.now(),
        };
      }

      // Actualizamos probabilidad: mezcla suave entre lo que ya sabíamos y el nuevo score
      const current = result[r.intent].probability;
      result[r.intent].probability = current + r.score * (1 - current);

      result[r.intent].evidence += 1;
      result[r.intent].lastSeen = Date.now();
    }

    return this.normalize(result);
  }

  // Ajusta si el usuario dijo "sí" (refuerza) o "no" (penaliza)
  private adjustForYesNo(
    intents: Record<string, BeliefIntent>,
    obs: Observation,
    dominantIntent?: string,
  ): Record<string, BeliefIntent> {
    if (!dominantIntent || !intents[dominantIntent]) return intents;

    const result = { ...intents };

    if (obs.signals.isNegation) {
      result[dominantIntent].probability *= 0.3; // Penaliza fuerte
      result[dominantIntent].rejected += 1;
    }

    if (obs.signals.isAffirmation) {
      result[dominantIntent].probability = Math.min(
        0.95,
        result[dominantIntent].probability * 1.5,
      );
      result[dominantIntent].evidence += 1;
    }

    return this.normalize(result);
  }

  // Calcula "confusión": 0 = seguro, 1 = muy confundido
  private calculateConfusion(intents: Record<string, BeliefIntent>): number {
    let confusion = 0;
    for (const key in intents) {
      const p = intents[key].probability;
      if (p > 0) confusion -= p * Math.log2(p);
    }
    return Math.min(1, confusion / 2); // Normalizar a 0-1
  }

  // Encuentra la intención más probable (si supera el mínimo)
  private findMostLikelyIntent(
    intents: Record<string, BeliefIntent>,
  ): BeliefState["dominant"] | undefined {
    let maxProb = 0;
    let bestIntent: BeliefState["dominant"] | undefined;

    for (const key in intents) {
      if (intents[key].probability > maxProb) {
        maxProb = intents[key].probability;
        bestIntent = {
          intent: key as IntentExampleKey,
          requiresConfirmation: intents[key].requiresConfirmation,
        };
      }
    }

    return maxProb > this.MIN_CONFIDENCE ? bestIntent : undefined;
  }

  // Normaliza para que todas las probabilidades sumen 1
  private normalize(
    intents: Record<string, BeliefIntent>,
  ): Record<string, BeliefIntent> {
    const total = Object.values(intents).reduce(
      (sum, i) => sum + i.probability,
      0,
    );
    if (total === 0 || total === 1) return intents;

    const result = { ...intents };
    for (const key in result) {
      result[key] = {
        ...result[key],
        probability: result[key].probability / total,
      };
    }
    return result;
  }
}
