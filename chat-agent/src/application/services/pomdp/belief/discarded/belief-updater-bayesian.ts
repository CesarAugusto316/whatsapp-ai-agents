import {
  IntentExampleKey,
  RequiredConfirmation,
} from "../../intents/intent.types";
import { Observation } from "../../observation/observation.types";
import { PayloadWithScore } from "../../pomdp-manager";
import { BeliefIntent, BeliefState } from "../belief.types";

/**
 * BeliefUpdater simplificado
 *
 * CONCEPTOS CLAROS:
 * - score: viene del RAG (similitud coseno, 0-1)
 * - probability: creencia actual del sistema sobre esa intención (0-1)
 * - confidence: probability de la intención dominante
 * - entropy: qué tan "confundido" está el sistema (0=seguro, 1=muy confundido)
 */
export class BeliefUpdaterBayesian {
  // Configuración simple
  private readonly DECAY_FACTOR = 0.9; // Olvida 10% por turno
  private readonly CONFIDENCE_THRESHOLD = 0.65; // Mínimo para considerar dominante
  private readonly MAX_ENTROPY = 0.8; // Máximo antes de pedir clarificación

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
    } satisfies BeliefState;
  }

  /**
   * Flujo simplificado:
   * 1. Aplicar decay a creencias anteriores
   * 2. Incorporar nueva evidencia del RAG
   * 3. Ajustar por señales de conversación ("sí"/"no")
   * 4. Calcular métricas y retornar nuevo estado
   */
  public update(
    currentBelief: BeliefState,
    observation: Observation,
  ): BeliefState {
    // Paso 1: Empezar con las creencias existentes (con decay)
    let intents = this.applyDecayToAll(currentBelief.intents);

    // Paso 2: Incorporar nueva evidencia del RAG
    intents = this.addNewEvidence(intents, observation.intentResults);

    // Paso 3: Ajustar por respuestas del usuario ("sí"/"no")
    intents = this.adjustForUserSignals(
      intents,
      observation,
      currentBelief.dominant?.intent,
    );

    // Paso 4: Calcular métricas finales
    const { dominant, entropy, confidence } = this.calculateMetrics(intents);

    // Paso 5: Determinar flags de comportamiento
    const needsClarification =
      entropy > this.MAX_ENTROPY || confidence < this.CONFIDENCE_THRESHOLD;

    const isStuck = currentBelief.conversationTurns > 5 && entropy > 0.6;

    return {
      intents,
      dominant,
      entropy,
      confidence,
      conversationTurns: currentBelief.conversationTurns + 1,
      lastUpdate: Date.now(),
      needsClarification,
      isStuck,
    };
  }

  /**
   * Aplica decay a TODAS las intenciones existentes
   * Simula que el sistema "olvida" un poco con el tiempo
   */
  private applyDecayToAll(
    intents: Record<string, BeliefIntent>,
  ): Record<string, BeliefIntent> {
    const result: Record<string, BeliefIntent> = {};

    for (const key in intents) {
      result[key] = {
        ...intents[key],
        probability: intents[key].probability * this.DECAY_FACTOR,
      };
    }

    return result;
  }

  /**
   * Incorpora nueva evidencia del RAG
   * Usa una actualización tipo "promedio ponderado":
   * nueva_prob = prob_actual + score * (1 - prob_actual)
   */
  private addNewEvidence(
    intents: Record<string, BeliefIntent>,
    ragResults: PayloadWithScore[],
  ): Record<string, BeliefIntent> {
    const result = { ...intents };

    for (const ragResult of ragResults) {
      const intentKey = ragResult.intent;
      const score = ragResult.score; // 0-1 del RAG

      // Si es la primera vez que vemos esta intención
      if (!result[intentKey]) {
        result[intentKey] = {
          key: intentKey,
          probability: score, // Empieza con el score del RAG
          evidence: 1,
          rejected: 0,
          requiresConfirmation: ragResult.requiresConfirmation,
          createdAt: Date.now(),
        } satisfies BeliefIntent;
      }
      // Si ya existía, actualizamos su probabilidad
      else {
        const currentProb = result[intentKey].probability;

        // Fórmula: nueva_prob = actual + score * (1 - actual)
        // Esto da más peso a scores altos cuando la creencia es baja
        result[intentKey].probability = currentProb + score * (1 - currentProb);

        result[intentKey].evidence += 1;
        result[intentKey].createdAt = Date.now();
      }
    }

    // Normalizar para que todas las probabilidades sumen 1
    return this.normalizeProbabilities(result);
  }

  /**
   * Ajusta las probabilidades basado en señales del usuario
   */
  private adjustForUserSignals(
    intents: Record<string, BeliefIntent>,
    obs: Observation,
    currentDominant?: string,
  ): Record<string, BeliefIntent> {
    if (!currentDominant || !intents[currentDominant]) {
      return intents;
    }

    const result = { ...intents };
    const dominantIntent = result[currentDominant];

    // Si el usuario dice "NO", penalizamos la intención dominante
    if (obs.signals.isNegation) {
      dominantIntent.probability *= 0.3; // Reducimos a 30%
      dominantIntent.rejected += 1;
    }

    // Si el usuario dice "SÍ", reforzamos la intención dominante
    if (obs.signals.isAffirmation) {
      dominantIntent.probability = Math.min(
        0.95, // Tope máximo
        dominantIntent.probability * 1.5, // Aumentamos 50%
      );
      dominantIntent.evidence += 1;
    }

    return this.normalizeProbabilities(result);
  }

  /**
   * Calcula las métricas principales:
   * - dominant: intención con mayor probabilidad (si supera el threshold)
   * - entropy: qué tan distribuidas están las probabilidades
   * - confidence: probabilidad de la intención dominante
   */
  private calculateMetrics(intents: Record<string, BeliefIntent>): {
    dominant: BeliefState["dominant"];
    entropy: number;
    confidence: number;
  } {
    // Encontrar la intención con mayor probabilidad
    let maxProb = 0;
    let dominantIntentKey: string | undefined;
    let dominantRequiresConfirmation: RequiredConfirmation | undefined;

    for (const key in intents) {
      if (intents[key].probability > maxProb) {
        maxProb = intents[key].probability;
        dominantIntentKey = key;
        dominantRequiresConfirmation = intents[key].requiresConfirmation;
      }
    }

    // Calcular entropy (Shannon)
    let entropy = 0;
    for (const key in intents) {
      const p = intents[key].probability;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    // Normalizar a 0-1 (máximo teórico para 4 intenciones)
    entropy = Math.min(1, entropy / 2);

    // Determinar si hay intención dominante
    const dominant =
      maxProb > this.CONFIDENCE_THRESHOLD
        ? {
            intent: dominantIntentKey as IntentExampleKey,
            requiresConfirmation: dominantRequiresConfirmation!,
          }
        : undefined;

    return {
      dominant,
      entropy,
      confidence: maxProb,
    };
  }

  /**
   * Normaliza probabilidades para que sumen 1
   */
  private normalizeProbabilities(
    intents: Record<string, BeliefIntent>,
  ): Record<string, BeliefIntent> {
    // Calcular suma total
    const total = Object.values(intents).reduce(
      (sum, intent) => sum + intent.probability,
      0,
    );

    // Si no hay nada o la suma es 0, retornar tal cual
    if (total === 0 || total === 1) {
      return intents;
    }

    // Normalizar cada probabilidad
    const result: Record<string, BeliefIntent> = {};
    for (const key in intents) {
      result[key] = {
        ...intents[key],
        probability: intents[key].probability / total,
      };
    }

    return result;
  }
}
