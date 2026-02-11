import { IntentExampleKey } from "../intents/intent.types";
import { Observation } from "../observation/observation.types";
import { BeliefIntent, BeliefState } from "./belief.types";

// ============================================
// 1. BELIEF UPDATER (Bayesian-inspired)
// ============================================
export class BeliefUpdater {
  private readonly DECAY_FACTOR = 0.9; // decae 10% por turno
  private readonly THRESHOLD_DOMINANT = 0.65;
  private readonly MAX_ENTROPY = 0.8;

  // NUEVO: inicializar cuando no hay belief previo
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

  public update(
    currentBelief: BeliefState,
    observation: Observation,
  ): BeliefState {
    // 1. Decay de intenciones previas (olvido temporal)
    const decayedIntents = this.applyDecay(currentBelief.intents);

    // 2. Actualizar con nuevas observaciones RAG
    const updatedIntents = this.incorporateEvidence(
      decayedIntents,
      observation.intentResults,
    );

    // 3. Ajustar por señales conversacionales
    const adjustedIntents = this.adjustByConversationalCues(
      updatedIntents,
      observation,
      currentBelief.dominant,
    );

    // 4. Calcular métricas
    const entropy = this.calculateEntropy(adjustedIntents);
    const dominant = this.getDominantIntent(
      adjustedIntents,
    ) as IntentExampleKey;
    const confidence = dominant ? adjustedIntents[dominant].probability : 0;

    return {
      intents: adjustedIntents,
      dominant,
      entropy,
      confidence,
      conversationTurns: currentBelief.conversationTurns + 1,
      lastUpdate: Date.now(),
      needsClarification:
        entropy > this.MAX_ENTROPY || confidence < this.THRESHOLD_DOMINANT,
      isStuck: currentBelief.conversationTurns > 5 && entropy > 0.6,
    };
  }

  private applyDecay(
    intents: Record<string, BeliefIntent>,
  ): Record<string, BeliefIntent> {
    const updated = { ...intents };

    for (const key in updated) {
      updated[key] = {
        ...updated[key],
        probability: updated[key].probability * this.DECAY_FACTOR,
      };
    }

    return updated;
  }

  private incorporateEvidence(
    intents: Record<string, BeliefIntent>,
    vectorResults: Array<{ intent: IntentExampleKey; score: number }>,
  ): Record<string, BeliefIntent> {
    const updated = { ...intents };

    for (const result of vectorResults) {
      if (!updated[result.intent]) {
        updated[result.intent] = {
          key: result.intent,
          probability: 0,
          evidence: 0,
          rejected: 0,
          lastSeen: Date.now(),
        };
      }

      // Actualización "soft" tipo Bayesiana
      const current = updated[result.intent].probability;
      updated[result.intent].probability =
        current + result.score * (1 - current); // weighted average

      // DESPUÉS (opcional, solo si necesitas más conservador):
      // const LEARNING_RATE = 0.6; // ← Un solo número nuevo
      // updated[result.intent].probability =
      //   current * (1 - LEARNING_RATE) + result.score * LEARNING_RATE;

      updated[result.intent].evidence += 1;
      updated[result.intent].lastSeen = Date.now();
    }

    // Normalizar probabilidades para que sumen 1
    return this.normalize(updated);
  }

  private adjustByConversationalCues(
    intents: Record<string, BeliefIntent>,
    obs: Observation,
    currentDominant?: string,
  ): Record<string, BeliefIntent> {
    const updated = { ...intents };

    // Si dice "no", penalizar la intención dominante
    if (obs.signals.isNegation && currentDominant && updated[currentDominant]) {
      updated[currentDominant].probability *= 0.3;
      updated[currentDominant].rejected += 1;
    }

    // Si dice "sí", reforzar la dominante
    if (
      obs.signals.isAffirmation &&
      currentDominant &&
      updated[currentDominant]
    ) {
      updated[currentDominant].probability = Math.min(
        0.95,
        updated[currentDominant].probability * 1.5,
      );
      updated[currentDominant].evidence += 1;
    }

    return this.normalize(updated);
  }

  private calculateEntropy(intents: Record<string, BeliefIntent>): number {
    // Entropía de Shannon simplificada
    let entropy = 0;
    for (const key in intents) {
      const p = intents[key].probability;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // Normalizar a 0-1 (asumiendo máximo 4 intenciones equiprobables)
    return Math.min(1, entropy / 2);
  }

  private getDominantIntent(
    intents: Record<string, BeliefIntent>,
  ): string | undefined {
    let maxProb = 0;
    let dominant: string | undefined;

    for (const key in intents) {
      if (intents[key].probability > maxProb) {
        maxProb = intents[key].probability;
        dominant = key;
      }
    }

    return maxProb > this.THRESHOLD_DOMINANT ? dominant : undefined;
  }

  private normalize(
    intents: Record<string, BeliefIntent>,
  ): Record<string, BeliefIntent> {
    const sum = Object.values(intents).reduce(
      (acc, i) => acc + i.probability,
      0,
    );

    if (sum === 0) return intents;

    const normalized = { ...intents };
    for (const key in normalized) {
      normalized[key] = {
        ...normalized[key],
        probability: normalized[key].probability / sum,
      };
    }

    return normalized;
  }
}
