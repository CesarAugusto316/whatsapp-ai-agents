import { pomdpLogsTable } from "@/infraestructure/adapters/db/schema/pomdp-logs";
import { eq } from "drizzle-orm";
import { PomdpActionResult } from "@/application/services/rag/pomdp/pomdp-manager";
import { BeliefState } from "@/application/services/rag/pomdp/belief/belief.types";
import { Observation } from "@/application/services/rag/pomdp/observation/observation.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { ModuleKind } from "@/application/services/rag/rag.types";
import { IntentExampleKey } from "@/application/services/rag/pomdp/intents/intent.types";
import { db } from "@/infraestructure/adapters/db/db-adapter";

export interface PomdpLogData {
  ctx: RestaurantCtx;
  ragResults: Array<{
    intent: IntentExampleKey;
    module: ModuleKind;
    score: number;
  }>;
  previousBeliefState: BeliefState;
  observation: Observation;
  updatedBeliefState: BeliefState;
  actionResult: PomdpActionResult;
  conversationTurn: number;
}

export class PomdpLoggingService {
  static async logPomdpInteraction(logData: PomdpLogData): Promise<void> {
    try {
      const {
        ctx,
        ragResults,
        previousBeliefState,
        observation,
        updatedBeliefState,
        actionResult,
        conversationTurn,
      } = logData;

      await db.insert(pomdpLogsTable).values({
        businessId: ctx.businessId,
        customerId: ctx.customer?.id,
        sessionId: ctx.session,
        chatKey: ctx.chatKey,
        conversationTurn: conversationTurn,
        userMessage: ctx.customerMessage,
        ragResults: ragResults,
        previousBeliefState: previousBeliefState,
        observation: observation,
        updatedBeliefState: updatedBeliefState,
        actionType: actionResult.type,
        actionDetails: this.extractActionDetails(actionResult),
        entropy: String(updatedBeliefState.entropy),
        confidence: String(updatedBeliefState.confidence),
        needsClarification: updatedBeliefState.needsClarification,
        isStuck: updatedBeliefState.isStuck,
        metadata: {
          hasActiveBooking: !!ctx.bookingState?.status,
          hasOrderInProgress: !!ctx.productOrderState,
        },
      });
    } catch (error) {
      console.error("Error logging POMDP interaction:", error);
      // No lanzamos el error para no afectar el flujo principal
    }
  }

  private static extractActionDetails(actionResult: PomdpActionResult) {
    switch (actionResult.type) {
      case "clarify":
        return { question: actionResult.question };
      case "confirm":
        return { intent: actionResult.intent };
      case "execute":
        return { intent: actionResult.intent, saga: actionResult.saga };
      case "fallback":
        return { reason: actionResult.reason };
      case "continue":
        return { response: actionResult.response };
      default:
        return {};
    }
  }

  // Métodos auxiliares para análisis posterior
  static async getConversationLogs(sessionId: string) {
    return await db
      .select()
      .from(pomdpLogsTable)
      .where(eq(pomdpLogsTable.sessionId, sessionId))
      .orderBy(pomdpLogsTable.timestamp);
  }

  static async getBusinessMetrics(
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    let query = db
      .select()
      .from(pomdpLogsTable)
      .where(eq(pomdpLogsTable.businessId, businessId));

    // if (startDate) {
    //   query = query.where(sql`${pomdpLogsTable.timestamp} >= ${startDate}`);
    // }

    // if (endDate) {
    //   query = query.where(sql`${pomdpLogsTable.timestamp} <= ${endDate}`);
    // }

    return await query;
  }
}
