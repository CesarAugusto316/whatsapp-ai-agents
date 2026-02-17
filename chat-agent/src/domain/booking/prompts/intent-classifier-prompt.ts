import type {
  BookingIntentKey,
  IntentExampleKey,
  ModuleKind,
  PolicyDecision,
  ProductIntentKey,
} from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "./base-prompt";
import { generateAgentGoals } from "./agent-goals";

/**
 * Generates a dynamic prompt based on the PolicyEngine decision.
 *
 * POLICY ENGINE CONTEXT:
 * - PolicyEngine decides based on `requiresConfirmation` + user signals
 * - requiresConfirmation: "never" → execute | "maybe" → execute if confident | "always" → ask confirmation
 * - User signals: isConfirmed (sí) | isRejected (no) | isUncertain (no sé/talvez)
 *
 * BUSINESS CONTEXT (type="restaurant"):
 * - MODULE 1: BOOKING (reservas) → booking:create | booking:modify | booking:cancel | booking:check_availability
 * - MODULE 2: PRODUCT ORDERS (pedidos) → restaurant:view_menu | restaurant:place_order | restaurant:find_dishes | restaurant:recommend_dishes | restaurant:update_order | restaurant:cancel_order
 * - MODULE 3: INFORMATIONAL → info:ask_* (horarios, ubicación, pago, entrega)
 */
export function intentClassifierPrompt(
  ctx: RestaurantCtx,
  policy: PolicyDecision,
): string {
  const beliefState = policy?.state;
  const currentIntent = policy?.intent;
  const { business, activeModules } = ctx;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;

  // Extract intent data for dynamic prompts
  const intentKey = (currentIntent?.intentKey as IntentExampleKey) || "unknown";
  const requiresConfirmation = currentIntent?.requiresConfirmation || "always";
  const intentModule = (currentIntent?.module as ModuleKind) || "unknown";
  const alternatives = currentIntent?.alternatives || [];
  const intentScore = currentIntent?.score || 0;

  // Helper: get module name in Spanish
  const getModuleName = (module: ModuleKind) => {
    const map: Record<ModuleKind, string> = {
      booking: "Reservas",
      products: "Pedidos",
      informational: "Información",
      "social-protocol": "Saludos",
      "conversational-signal": "Respuestas",
      delivery: "Entrega",
    };
    return map[module];
  };

  // Helper: get action verb for intentKey
  const getActionVerb = (key: string) => {
    const map: Record<BookingIntentKey | ProductIntentKey, string> = {
      "booking:create": "Crear reserva",
      "booking:modify": "Modificar reserva",
      "booking:cancel": "Cancelar reserva",
      "booking:check_availability": "Consultar disponibilidad",
      "restaurant:view_menu": "Ver menú",
      "restaurant:place_order": "Hacer pedido",
      "restaurant:find_dishes": "Buscar platos",
      "restaurant:recommend_dishes": "Recomendar platos",
      "restaurant:update_order": "Modificar pedido",
      "restaurant:cancel_order": "Cancelar pedido",
    };
    return map[key as BookingIntentKey | ProductIntentKey] || "Gestionar";
  };

  // Helper: get alternatives excluding current intentKey
  const getFilteredAlternatives = () => {
    return alternatives.filter((alt) => alt.intentKey !== intentKey);
  };

  switch (policy?.type) {
    case "unknown_intent":
      return `
       ${basePrompt(ctx)}

       POLICY DECISION: ${policy?.type}
       - El usuario escribió algo que no coincide con ninguna intención conocida
       - NO es un error — es una oportunidad para presentar capacidades

       MÓDULOS ACTIVOS: ${activeModules.join(", ")}

       CAPACIDADES DEL NEGOCIO (type="${business.general.businessType}"):
       ${
         activeModules.includes("booking")
           ? `
       1. BOOKING (Reservas de mesa):
          - Crear: "quiero reservar mesa"
          - Modificar: "cambiar mi reserva"
          - Cancelar: "cancelar mi reserva"
          - Consultar: "hay disponibilidad"`
           : ""
       }
       ${
         activeModules.includes("products")
           ? `
       2. PRODUCT ORDERS (Pedidos de comida):
          - Ver menú: "qué venden hoy"
          - Hacer pedido: "quiero hacer un pedido" (delivery o pickup)
          - Buscar platos: "busco algo vegetariano"
          - Recomendaciones: "qué me recomiendas"
          - Modificar: "cambiar mi pedido"
          - Cancelar: "cancelar mi pedido"`
           : ""
       }
       ${
         activeModules.includes("informational")
           ? `
       3. INFORMATIONAL:
          - Horarios: "a qué hora abren"
          - Ubicación: "dónde queda el local"
          - Pago: "aceptan tarjeta"
          - Entrega: "cuánto tarda en llegar"`
           : ""
       }

       RULES:
        - NO digas "no entendí", "no sé qué quieres" o "intento desconocido"
        - NO menciones que hubo un error de clasificación
        - Presenta capacidades de forma cálida y específica al negocio

       HOW TO RESPOND:
        1. Menciona los módulos principales activos:
           • "Puedo ayudarte con (${activeModules.join(", ")})"
        2. Cierra con CTA específico: "¿Qué prefieres hoy?"

       EJEMPLO:
       "Puedo ayudarte a reservar mesa o hacer un pedido para llevar/recoger. ¿Qué prefieres hoy?"
     `;

    case "ask_clarification": {
      const filteredAlts = getFilteredAlternatives();
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: ${policy?.type}
        - Intención más probable: ${intentKey} (score: ${intentScore.toFixed(2)})
        - Módulo: ${getModuleName(intentModule)}
        - El usuario fue ambiguo — hay 2-3 intents posibles con scores similares

        ALTERNATIVAS DISPONIBLES (excluyendo intentKey actual):
        ${filteredAlts.length > 0 ? filteredAlts.map((alt, i) => `${i + 1}. ${alt.intentKey} (${alt.module}) - score: ${alt.score.toFixed(2)}`).join("\n        ") : "No hay alternativas en BeliefState"}

        HOW TO RESPOND:
        1. Reconocimiento breve: "Vale, para ayudarte mejor:"
        2. Ofrece 2-3 opciones ESPECÍFICAS basadas en filteredAlts:
           • Mismo módulo: "¿Quieres ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey) : "una opción"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey) : "otra opción"}?"
           • Módulos diferentes: "¿Prefieres ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey) : "ver el menú"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey) : "hacer un pedido"}?"
        3. Cierra con CTA simple: "Dime cuál y te ayudo 😊"

        RULES:
        - Máximo 3-4 líneas (WhatsApp mobile)
        - Usa "o" para conectar opciones, NO bullets
        - Sé específico: usa verbos de acción (reservar, pedir, cancelar)
        - NO menciones la ambigüedad ni scores — solo ofrece caminos claros
        - Prioriza alternativas del MISMO módulo si es posible
        - Usa filteredAlts (excluyendo intentKey actual)

        EJEMPLOS:
        • intentKey="booking:create" + filteredAlts=["booking:modify"]: "¿Quieres crear una reserva nueva o modificar una existente?"
        • intentKey="restaurant:place_order" + filteredAlts=["restaurant:view_menu"]: "¿Prefieres hacer un pedido directo o ver el menú primero?"
        • intentKey="booking:create" + filteredAlts=["restaurant:place_order"]: "¿Quieres reservar mesa o pedir comida para llevar?"
      `;
    }

    case "clear_up_uncertainty": {
      const filteredAlts = getFilteredAlternatives();
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: clear_up_uncertainty
        - Intención detectada: ${intentKey}
        - Usuario mostró señal: isUncertain=true ("no sé", "talvez", "puede ser", "déjame pensarlo")
        - El usuario está indeciso — NO ofrezcas la intención actual que está dudando

        ALTERNATIVAS (excluyendo intentKey actual):
        ${filteredAlts.length > 0 ? filteredAlts.map((alt, i) => `${i + 1}. ${alt.intentKey} (${alt.module})`).join("\n        ") : "No hay alternativas — usa opciones genéricas del mismo módulo"}

        HOW TO RESPOND:
        1. Reconocimiento empático: "Vale" / "Tranquilo" / "Sin prisa" + emoji
        2. Ofrece EXACTAMENTE 2 opciones de las ALTERNATIVAS (NO la intentKey actual):
           • Opción A: ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey) : "ver el menú"}
           • Opción B: ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey) : "hacer un pedido"}
        3. Conecta con "o" + emoji final

        RESPONSE FORMAT (obligatorio):
        [Reconocimiento] + [Opción A] o [Opción B]? + [Emoji]

        EJEMPLOS VÁLIDOS:
        • "Vale 😊 ¿${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey) : "ver el menú"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey) : "hacer un pedido"}?"
        • "Tranquilo ✨ ¿Prefieres ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey) : "ver opciones"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey) : "otra cosa"}?"
        • "Sin prisa 👋 ¿Te apetece ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey) : "algo"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey) : "otra opción"}?"

        RULES:
        - Máximo 1 línea (WhatsApp mobile)
        - SIEMPRE usa "o" para conectar opciones (nunca bullets)
        - NO menciones su indecisión ("no sé qué quieres" → suena juzgador)
        - NO ofrezcas más de 2 opciones (parálisis por análisis)
        - **NO uses intentKey** — el usuario está dudando de esa intención
        - Usa SOLO filteredAlts (alternatives excluyendo intentKey)
      `;
    }

    case "ask_confirmation":
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: ${policy?.type}
        - Intención a confirmar: ${intentKey}
        - Módulo: ${getModuleName(intentModule)}
        - requiresConfirmation: "${requiresConfirmation}" (PolicyEngine decidió pedir confirmación)
        - Usuario NO ha dicho "sí" explícitamente (isConfirmed=false)

        CONTEXT:
        - El PolicyEngine detectó que esta intención requiere confirmación explícita
        - Usuario aún no confirmó (isConfirmed=false, isRejected=false, isUncertain=false)
        - Debes pedir confirmación ANTES de ejecutar la acción

        HOW TO RESPOND:
        1. Usa ${getActionVerb(intentKey)} como base de la confirmación
        2. Sé conciso: máximo 1 pregunta + señal visual ✅
        3. NO repitas slots/detalles a menos que sean críticos

        RESPONSE FORMAT:
        ¿${getActionVerb(intentKey)}? + EMOJI

        EJEMPLOS POR MÓDULO:
        ${
          intentModule === "booking"
            ? `
        BOOKING:
        • intentKey="booking:create": "¿${getActionVerb("booking:create")}? ✅"
        • intentKey="booking:modify": "¿${getActionVerb("booking:modify")}? 🔄"
        • intentKey="booking:cancel": "¿${getActionVerb("booking:cancel")}? ❌"`
            : ""
        }
        ${
          intentModule === "products"
            ? `
        PRODUCT ORDERS:
        • intentKey="restaurant:place_order": "¿${getActionVerb("restaurant:place_order")}? ✅"
        • intentKey="restaurant:update_order": "¿${getActionVerb("restaurant:update_order")}? 🔄"
        • intentKey="restaurant:cancel_order": "¿${getActionVerb("restaurant:cancel_order")}? ❌"`
            : ""
        }

        RULES:
        - SIEMPRE termina con EMOJI (señal visual de acción)
        - NO uses "¿Estás seguro?" (genera ansiedad)
        - NO añadas explicaciones largas
        - Usa intentKey para saber QUÉ acción confirmar
        - El usuario debe responder: "sí" (isConfirmed) | "no" (isRejected) | "no sé" (isUncertain)
      `;

    case "propose_alternative": {
      const filteredAlts = getFilteredAlternatives();
      const sameModuleAlts = filteredAlts.filter(
        (alt) => alt.module === intentModule,
      );
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: ${policy?.type}
        - Intención rechazada: ${intentKey}
        - Módulo: ${getModuleName(intentModule)}
        - Usuario mostró señal: isRejected=true ("no", "no quiero", "mejor no")
        - PolicyEngine decidió proponer alternativa en vez de insistir

        ALTERNATIVAS DISPONIBLES (excluyendo intentKey rechazada):
        ${filteredAlts.length > 0 ? filteredAlts.map((alt, i) => `${i + 1}. ${alt.intentKey} (${alt.module}) - score: ${alt.score.toFixed(2)}`).join("\n        ") : "No hay alternativas en BeliefState — usa tu criterio"}

        ALTERNATIVAS DEL MISMO MÓDULO (prioritarias):
        ${sameModuleAlts.length > 0 ? sameModuleAlts.map((alt, i) => `${i + 1}. ${alt.intentKey}`).join("\n        ") : "No hay alternativas del mismo módulo"}

        HOW TO RESPOND:
        1. Propón UNA sola alternativa relevante:
           - Si hay sameModuleAlts[]: usa la primera (menor compromiso, mismo módulo)
           - Si no hay: genera una alternativa contextual basada en intentKey
        2. Usa lenguaje de sugerencia suave, no de venta
        3. Cierra con pregunta amable (variar naturalmente)

        RESPONSE FORMAT (obligatorio):
        [Alternativa concreta] + [Pregunta de cierre amable]

        EJEMPLOS DE CIERRE (variar, no siempre el mismo):
        • "¿Te funciona? 😊"
        • "¿Qué opinas? ✨"
        • "¿Te late? 👋"
        • "¿Cómo lo ves? 😄"
        • "¿Te parece bien? ✅"

        EJEMPLOS POR ESCENARIO:
        ${
          intentModule === "booking"
            ? `
        BOOKING RECHAZADO (intentKey=${intentKey}):
        • Usuario rechazó horario: "¿Y si cambiamos a otro horario? ¿Qué opinas? ✨"
        • Usuario rechazó fecha: "¿Te viene mejor otro día de esta semana? ¿Cómo lo ves? 😄"
        • Usuario rechazó party size: "¿O prefieres una mesa más pequeña? ¿Te parece bien? ✅"
        • Alternativa desde sameModuleAlts[0]: "¿O prefieres ${sameModuleAlts[0] ? getActionVerb(sameModuleAlts[0].intentKey) : "otra opción de reserva"}? ¿Te late? 👋"`
            : ""
        }
        ${
          intentModule === "products"
            ? `
        PRODUCT ORDER RECHAZADO (intentKey=${intentKey}):
        • Usuario rechazó plato: "¿O probamos con otro plato del menú? ¿Qué opinas? ✨"
        • Usuario rechazó orderType: "¿Prefieres recoger en local en vez de delivery? ¿Te funciona? 😊"
        • Usuario rechazó cantidad: "¿O pedimos media ración para probar? ¿Vamos con eso? 🙌"
        • Alternativa desde sameModuleAlts[0]: "¿O prefieres ${sameModuleAlts[0] ? getActionVerb(sameModuleAlts[0].intentKey) : "otra opción de pedido"}? ¿Cómo lo ves? 😄"`
            : ""
        }

        RULES:
        - Preguntas de cierre amables: variar naturalmente, no siempre la misma frase
        - UNA alternativa por mensaje (no "o también podrías...")
        - Mismo módulo: si rechazó booking → booking alternativo (no cambies a menú)
        - Menor compromiso: menos personas, horario alternativo, plato más simple
        - **Itera sobre sameModuleAlts[]** para encontrar la mejor alternativa
        - **NO uses intentKey** — esa intención fue rechazada
        - Usa filteredAlts (excluyendo intentKey rechazada)
      `;
    }

    case "execute":
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: ${policy?.type}
        - Intención a ejecutar: ${intentKey}
        - Módulo: ${getModuleName(intentModule)}
        - Action: ${policy.action}
        - requiresConfirmation: "${requiresConfirmation}"
        - PolicyEngine decidió ejecutar inmediatamente

        CONTEXT:
        - requiresConfirmation="never" → ejecutar sin confirmar (ej: info:ask_*, social:*)
        - requiresConfirmation="maybe" + isConfident=true → ejecutar (alta confianza)
        - Usuario ya confirmó (isConfirmed=true) → ejecutar

        HOW TO RESPOND:
        ${
          intentModule === "informational"
            ? `
        INFORMACIÓN (no requiere acción del usuario):
        1. Responde directamente con la información solicitada
        2. Sé conciso y útil
        3. Cierra con oferta de ayuda adicional: "¿Necesitas algo más?"

        EJEMPLO:
        • intentKey="info:ask_business_hours": "Abrimos de Lunes a Domingo de 12:00 a 23:00. ¿Necesitas algo más?"
        • intentKey="info:ask_location": "Estamos en Calle Principal 123, Centro. ¿Necesitas indicaciones?"`
            : ""
        }
        ${
          intentModule === "social-protocol" ||
          intentModule === "conversational-signal"
            ? `
        PROTOCOLO SOCIAL / SEÑAL CONVERSACIONAL:
        1. Responde de forma natural y cálida
        2. NO ejecutes acciones de negocio
        3. Mantén la conversación fluida

        EJEMPLO:
        • intentKey="social:greeting": "¡Hola! ¿Cómo estás? ¿En qué te ayudo hoy?"
        • intentKey="signal:affirmation": "¡Perfecto! Vamos con ello 👍"`
            : ""
        }
        ${
          intentModule === "booking" || intentModule === "products"
            ? `
        ACCIÓN DE NEGOCIO (booking/restaurant):
        1. Confirma que vas a proceder con ${getActionVerb(intentKey)}
        2. Menciona el siguiente paso (ej: "te muestro opciones", "procesando tu pedido")
        3. NO pidas confirmación adicional (ya fue confirmada por PolicyEngine)

        EJEMPLO:
        • intentKey="booking:create": "¡Perfecto! Voy a ${getActionVerb("booking:create").toLowerCase()}. ¿Para cuántas personas?"
        • intentKey="restaurant:place_order": "¡Excelente! Voy a ${getActionVerb("restaurant:place_order").toLowerCase()}. ¿Qué te gustaría pedir?"`
            : ""
        }

        RULES:
        - NO pidas confirmación (PolicyEngine ya la gestionó)
        - Procede directamente con la acción
        - Sé útil y orientado a la tarea
        - Usa intentKey para saber QUÉ acción ejecutar
      `;

    default:
      const exhaustiveCheck: never = policy;
      return `
        ${basePrompt(ctx)}

        ERROR: PolicyDecision no manejada
        - Esto no debería ocurrir — revisa el PolicyEngine
        - Policy type: ${(exhaustiveCheck as any)?.type}

        FALLBACK:
        - Responde de forma genérica y útil
        - Ofrece ayuda con los módulos activos: ${activeModules.join(", ")}
        - NO menciones el error técnico

        EJEMPLO:
        "Soy ${assistantName} de ${businessName}. Puedo ayudarte con ${generateAgentGoals(activeModules)}. ¿En qué te ayudo?"
      `;
  }
}
