import type {
  BookingIntentKey,
  DomainKind,
  IntentExampleKey,
  ModuleKind,
  OrderIntentKey,
  PolicyDecision,
  ProductIntentKey,
  ProductOrderIntentKey,
} from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "./base-prompt";

/**
 * Generates a dynamic prompt based on the PolicyEngine decision.
 *
 * POLICY ENGINE CONTEXT:
 * - PolicyEngine decides based on `requiresConfirmation` + user signals
 * - requiresConfirmation: "never" → execute | "maybe" → execute if confident | "always" → ask confirmation
 * - User signals: isConfirmed (sí) | isRejected (no) | isUncertain (no sé/talvez)
 *
 * DOMAIN + MODULE ARCHITECTURE:
 * - businessType determina el dominio (restaurant, real-estate, erotic, retail, medical)
 * - Modules son condicionales según el dominio
 * - Vocabulario específico por dominio + módulo activo
 *
 * DOMAIN MODULES:
 * - restaurant: booking (reservas), products (menú), orders (pedidos), delivery (entrega)
 * - real-estate: booking (visitas/citas)
 * - erotic: booking (citas), products (catálogo), orders (pedidos)
 * - retail: products (catálogo), orders (pedidos), delivery (entrega)
 * - medical: booking (citas médicas)
 */
export function intentClassifierPrompt(
  ctx: RestaurantCtx,
  policy: PolicyDecision,
): string {
  const beliefState = policy?.state;
  const currentIntent = policy?.intent;
  const { business, activeModules } = ctx;
  const businessType = business.general.businessType as DomainKind;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;

  // Extract intent data for dynamic prompts
  const intentKey = (currentIntent?.intentKey as IntentExampleKey) || "unknown";
  const requiresConfirmation = currentIntent?.requiresConfirmation || "always";
  const intentModule = (currentIntent?.module as ModuleKind) || "unknown";
  const alternatives = currentIntent?.alternatives || [];
  const intentScore = currentIntent?.score || 0;

  // Helper: get module name in Spanish (domain-aware)
  const getModuleName = (module: ModuleKind, domain: DomainKind) => {
    const coreModules: Partial<Record<ModuleKind, string>> = {
      informational: "Información",
      "social-protocol": "Saludos",
      "conversational-signal": "Respuestas",
    };

    const domainModules: Record<string, Partial<Record<ModuleKind, string>>> = {
      restaurant: {
        booking: "Reservas de mesa",
        products: "Menú y platos",
        orders: "Pedidos de comida",
        delivery: "Entrega a domicilio",
      },
      "real-estate": {
        booking: "Visitas y citas",
      },
      erotic: {
        booking: "Citas",
        products: "Catálogo",
        orders: "Pedidos",
      },
      retail: {
        products: "Catálogo de productos",
        orders: "Pedidos",
        delivery: "Entrega",
      },
      medical: {
        booking: "Citas médicas",
      },
    };

    if (coreModules[module]) return coreModules[module]!;
    if (
      domain &&
      domainModules[domain]?.[module as keyof (typeof domainModules)[string]]
    ) {
      return domainModules[domain][
        module as keyof (typeof domainModules)[string]
      ]!;
    }

    // Fallback genérico
    const fallback: Record<ModuleKind, string> = {
      booking: "Reservas",
      products: "Productos",
      orders: "Pedidos",
      delivery: "Entrega",
      informational: "Información",
      "social-protocol": "Saludos",
      "conversational-signal": "Respuestas",
    };
    return fallback[module];
  };

  // Helper: get action verb for intentKey (domain-aware)
  const getActionVerb = (key: IntentExampleKey, domain: DomainKind) => {
    // Booking verbs varían por dominio
    const bookingVerbs: Record<string, Record<BookingIntentKey, string>> = {
      restaurant: {
        "booking:create": "Crear reserva",
        "booking:modify": "Modificar reserva",
        "booking:cancel": "Cancelar reserva",
        "booking:check_availability": "Consultar disponibilidad",
      },
      "real-estate": {
        "booking:create": "Agendar visita",
        "booking:modify": "Modificar visita",
        "booking:cancel": "Cancelar visita",
        "booking:check_availability": "Consultar disponibilidad",
      },
      erotic: {
        "booking:create": "Reservar cita",
        "booking:modify": "Modificar cita",
        "booking:cancel": "Cancelar cita",
        "booking:check_availability": "Consultar disponibilidad",
      },
      medical: {
        "booking:create": "Agendar cita médica",
        "booking:modify": "Modificar cita",
        "booking:cancel": "Cancelar cita",
        "booking:check_availability": "Consultar disponibilidad",
      },
    };

    // Product verbs varían por dominio
    const productVerbs: Record<string, Record<ProductIntentKey, string>> = {
      restaurant: {
        "products:view": "Ver menú",
        "products:find": "Buscar platos",
        "products:recommend": "Recomendar platos",
      },
      erotic: {
        "products:view": "Ver catálogo",
        "products:find": "Buscar servicios",
        "products:recommend": "Recomendar servicios",
      },
      retail: {
        "products:view": "Ver catálogo",
        "products:find": "Buscar productos",
        "products:recommend": "Recomendar productos",
      },
    };

    // Order verbs varían por dominio
    const orderVerbs: Record<string, Record<OrderIntentKey, string>> = {
      restaurant: {
        "orders:create": "Hacer pedido de comida",
        "orders:modify": "Modificar pedido",
        "orders:cancel": "Cancelar pedido",
      },
      erotic: {
        "orders:create": "Hacer pedido",
        "orders:modify": "Modificar pedido",
        "orders:cancel": "Cancelar pedido",
      },
      retail: {
        "orders:create": "Hacer pedido",
        "orders:modify": "Modificar pedido",
        "orders:cancel": "Cancelar pedido",
      },
    };

    // Buscar en el diccionario específico del dominio
    if (domain) {
      // @ts-ignore
      const booking = bookingVerbs[domain]?.[key];
      if (booking) return booking;

      // @ts-ignore
      const product = productVerbs[domain]?.[key];
      if (product) return product;

      // @ts-ignore
      const order = orderVerbs[domain]?.[key];
      if (order) return order;
    }

    // Fallback genérico
    const fallbackVerbs: Record<
      BookingIntentKey | ProductOrderIntentKey,
      string
    > = {
      "booking:create": "Crear reserva",
      "booking:modify": "Modificar reserva",
      "booking:cancel": "Cancelar reserva",
      "booking:check_availability": "Consultar disponibilidad",
      "products:view": "Ver productos",
      "products:find": "Buscar productos",
      "products:recommend": "Recomendar productos",
      "orders:create": "Hacer pedido",
      "orders:modify": "Modificar pedido",
      "orders:cancel": "Cancelar pedido",
    };
    return (
      fallbackVerbs[key as BookingIntentKey | ProductOrderIntentKey] ||
      "Gestionar"
    );
  };

  // Helper: get alternatives excluding current intentKey
  const getFilteredAlternatives = () => {
    return alternatives.filter((alt) => alt.intentKey !== intentKey);
  };

  // Helper: get domain-specific capabilities description
  const getDomainCapabilities = () => {
    const capabilities: string[] = [];
    let index = 1;

    if (activeModules.includes("booking")) {
      const bookingLabel = getModuleName("booking", businessType);
      const createVerb = getActionVerb("booking:create", businessType);
      const modifyVerb = getActionVerb("booking:modify", businessType);
      const cancelVerb = getActionVerb("booking:cancel", businessType);
      const checkVerb = getActionVerb(
        "booking:check_availability",
        businessType,
      );

      capabilities.push(`
       ${index}. ${bookingLabel.toUpperCase()}:
          - Crear: "${createVerb.toLowerCase()}"
          - Modificar: "${modifyVerb.toLowerCase()}"
          - Cancelar: "${cancelVerb.toLowerCase()}"
          - Consultar: "${checkVerb.toLowerCase()}"`);
      index++;
    }

    if (activeModules.includes("products")) {
      const productsLabel = getModuleName("products", businessType);
      const viewVerb = getActionVerb("products:view", businessType);
      const findVerb = getActionVerb("products:find", businessType);
      const recommendVerb = getActionVerb("products:recommend", businessType);

      capabilities.push(`
       ${index}. ${productsLabel.toUpperCase()}:
          - Ver: "${viewVerb.toLowerCase()}"
          - Buscar: "${findVerb.toLowerCase()}"
          - Recomendaciones: "${recommendVerb.toLowerCase()}"`);
      index++;
    }

    if (activeModules.includes("orders")) {
      const ordersLabel = getModuleName("orders", businessType);
      const createVerb = getActionVerb("orders:create", businessType);
      const modifyVerb = getActionVerb("orders:modify", businessType);
      const cancelVerb = getActionVerb("orders:cancel", businessType);

      capabilities.push(`
       ${index}. ${ordersLabel.toUpperCase()}:
          - Crear: "${createVerb.toLowerCase()}"
          - Modificar: "${modifyVerb.toLowerCase()}"
          - Cancelar: "${cancelVerb.toLowerCase()}"`);
      index++;
    }

    if (activeModules.includes("delivery")) {
      const deliveryLabel = getModuleName("delivery", businessType);
      capabilities.push(`
       ${index}. ${deliveryLabel.toUpperCase()}:
          - Consultar tiempo: "cuánto tarda en llegar"
          - Consultar método: "cómo hacen la entrega"`);
      index++;
    }

    if (activeModules.includes("informational")) {
      capabilities.push(`
       ${index}. INFORMACIÓN:
          - Horarios: "a qué hora abren"
          - Ubicación: "dónde queda el local"
          - Pago: "metodos de pago"
          - Contacto: "cómo los contacto"`);
    }

    return capabilities.join("\n");
  };

  switch (policy?.type) {
    case "unknown_intent":
      return `
       ${basePrompt(ctx)}

       POLICY DECISION: ${policy?.type}
       - El usuario escribió algo que no coincide con ninguna intención conocida
       - NO es un error — es una oportunidad para presentar capacidades

       DOMINIO: ${businessType || "general"}
       MÓDULOS ACTIVOS: ${activeModules.join(", ")}

       CAPACIDADES DEL NEGOCIO (type="${businessType}"):
       ${getDomainCapabilities()}

       RULES:
        - NO digas "no entendí", "no sé qué quieres" o "intento desconocido"
        - NO menciones que hubo un error de clasificación
        - Presenta capacidades de forma cálida y específica al negocio

       HOW TO RESPOND:
        1. Menciona los módulos principales activos de forma natural
        2. Usa vocabulario específico del dominio (${businessType})
        3. Cierra con CTA específico: "¿Qué prefieres hoy?"

       EJEMPLO:
       "Puedo ayudarte con ${activeModules
         .filter(
           (m) =>
             m !== "informational" &&
             m !== "social-protocol" &&
             m !== "conversational-signal",
         )
         .map((m) => getModuleName(m, businessType))
         .join(" y ")}. ¿Qué prefieres hoy?"
     `;

    case "ask_clarification": {
      const filteredAlts = getFilteredAlternatives();
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: ${policy?.type}
        - Intención más probable: ${intentKey} (score: ${intentScore.toFixed(2)})
        - Módulo: ${getModuleName(intentModule, businessType)}
        - Dominio: ${businessType || "general"}
        - El usuario fue ambiguo — hay 2-3 intents posibles con scores similares

        ALTERNATIVAS DISPONIBLES (excluyendo intentKey actual):
        ${filteredAlts.length > 0 ? filteredAlts.map((alt, i) => `${i + 1}. ${alt.intentKey} (${getModuleName(alt.module, businessType)}) - score: ${alt.score.toFixed(2)}`).join("\n        ") : "No hay alternativas en BeliefState"}

        HOW TO RESPOND:
        1. Reconocimiento breve y cálido: "Vale", "Claro", "Perfecto" + emoji
        2. Ofrece 2 opciones ESPECÍFICAS basadas en filteredAlts (NO más de 2)
        3. Conecta con "o" (natural, NO bullets en líneas separadas)
        4. Cierra con CTA simple y amable

        RESPONSE FORMAT (obligatorio):
        - Máximo 2-3 líneas (WhatsApp mobile)
        - UNA sola línea con "o" conectando opciones
        - NO menciones la ambigüedad ni scores
        - NO uses bullets (📅, ⏰ en líneas separadas)

        EJEMPLOS POR MÓDULO (adaptar vocabulario a ${businessType}):
        ${
          intentModule === "booking"
            ? `
        BOOKING AMBIGUO (${getModuleName("booking", businessType)}):
        • filteredAlts=["booking:create", "booking:modify"]: "Vale 😊 ¿Quieres ${getActionVerb("booking:create", businessType).toLowerCase()} o ${getActionVerb("booking:modify", businessType).toLowerCase()}? Dime cuál y te ayudo ✨"
        • filteredAlts=["booking:create", "booking:check_availability"]: "Claro 😊 ¿Quieres ${getActionVerb("booking:create", businessType).toLowerCase()} directamente o primero ${getActionVerb("booking:check_availability", businessType).toLowerCase()}? Tú me dices 📅"
        • filteredAlts=["booking:cancel", "booking:modify"]: "Perfecto 😊 ¿Necesitas ${getActionVerb("booking:cancel", businessType).toLowerCase()} o ${getActionVerb("booking:modify", businessType).toLowerCase()}? Estoy aquí para ayudarte ✅"`
            : ""
        }
        ${
          intentModule === "products"
            ? `
        PRODUCTS AMBIGUOS (${getModuleName("products", businessType)}):
        • filteredAlts=["products:view", "products:find"]: "Vale 😊 ¿Quieres ${getActionVerb("products:view", businessType).toLowerCase()} o ${getActionVerb("products:find", businessType).toLowerCase()} algo en específico? Dime y te ayudo 📋"
        • filteredAlts=["products:find", "products:recommend"]: "Claro 😊 ¿${getActionVerb("products:find", businessType).toLowerCase()} algo en particular o prefieres que te ${getActionVerb("products:recommend", businessType).toLowerCase()}? Tú decides ✨"`
            : ""
        }
        ${
          intentModule === "orders"
            ? `
        ORDERS AMBIGUOS (${getModuleName("orders", businessType)}):
        • filteredAlts=["orders:create", "products:view"]: "Perfecto 😊 ¿Quieres ${getActionVerb("orders:create", businessType).toLowerCase()} o primero ${getActionVerb("products:view", businessType).toLowerCase()}? Como prefieras 🍽️"
        • filteredAlts=["orders:create", "orders:modify"]: "Vale 😊 ¿Es ${getActionVerb("orders:create", businessType).toLowerCase()} uno nuevo o necesitas ${getActionVerb("orders:modify", businessType).toLowerCase()} uno existente? Dime y vamos con ello ✨"`
            : ""
        }
        ${
          intentModule === "informational"
            ? `
        INFORMACIÓN AMBIGUA:
        • filteredAlts=["info:ask_location", "info:ask_business_hours"]: "Claro 😊 ¿Necesitas saber dónde estamos o nuestro horario? Tú me dices 📍"
        • filteredAlts=["info:ask_payment_methods", "info:ask_contact"]: "Perfecto 😊 ¿Quieres saber métodos de pago o datos de contacto? Estoy aquí para ayudarte ✅"`
            : ""
        }

        RULES:
        - Sé específico: usa verbos de acción del dominio (${businessType})
        - NO menciones la ambigüedad ni scores — solo ofrece caminos claros
        - Prioriza alternativas del MISMO módulo si es posible
        - Varía reconocimientos: "Vale", "Claro", "Perfecto", "Entiendo"
        - Varía cierres: "Dime cuál y te ayudo", "Tú me dices", "Como prefieras"
        - **Adapta el vocabulario** según businessType (${businessType}) + activeModules (${activeModules.join(", ")})
      `;
    }

    case "clear_up_uncertainty": {
      const filteredAlts = getFilteredAlternatives();
      return `
        ${basePrompt(ctx)}

        POLICY DECISION: ${policy?.type}
        - Intención detectada: ${intentKey}
        - Dominio: ${businessType || "general"}
        - Usuario mostró señal: isUncertain=true ("no sé", "talvez", "puede ser", "déjame pensarlo")
        - El usuario está indeciso — NO ofrezcas la intención actual que está dudando

        ALTERNATIVAS (excluyendo intentKey actual):
        ${filteredAlts.length > 0 ? filteredAlts.map((alt, i) => `${i + 1}. ${alt.intentKey} (${getModuleName(alt.module, businessType)})`).join("\n        ") : "No hay alternativas — usa opciones genéricas del mismo módulo"}

        HOW TO RESPOND:
        1. Reconocimiento empático: "Vale" / "Tranquilo" / "Sin prisa" + emoji
        2. Ofrece EXACTAMENTE 2 opciones de las ALTERNATIVAS (NO la intentKey actual):
           • Opción A: ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey, businessType) : "ver opciones"}
           • Opción B: ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey, businessType) : "otra opción"}
        3. Conecta con "o" + emoji final

        RESPONSE FORMAT (obligatorio):
        [Reconocimiento] + [Opción A] o [Opción B]? + [Emoji]

        EJEMPLOS VÁLIDOS:
        • "Vale 😊 ¿${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey, businessType) : "ver opciones"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey, businessType) : "otra opción"}?"
        • "Tranquilo ✨ ¿Prefieres ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey, businessType) : "ver opciones"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey, businessType) : "otra cosa"}?"
        • "Sin prisa 👋 ¿Te apetece ${filteredAlts[0] ? getActionVerb(filteredAlts[0].intentKey, businessType) : "algo"} o ${filteredAlts[1] ? getActionVerb(filteredAlts[1].intentKey, businessType) : "otra opción"}?"

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
        - Módulo: ${getModuleName(intentModule, businessType)}
        - Dominio: ${businessType || "general"}
        - requiresConfirmation: "${requiresConfirmation}" (PolicyEngine decidió pedir confirmación)
        - Usuario NO ha dicho "sí" explícitamente (isConfirmed=false)

        CONTEXT:
        - El PolicyEngine detectó que esta intención requiere confirmación explícita
        - Usuario aún no confirmó (isConfirmed=false, isRejected=false, isUncertain=false)
        - **IMPORTANTE**: El usuario puede estar preguntando "cómo" (proceso) o confirmando que quiere empezar
        - Tu respuesta debe: (1) explicar el proceso brevemente si es relevante, (2) pedir confirmación suave

        HOW TO RESPOND (2 escenarios):

        **ESCENARIO A: Usuario pregunta "cómo" (ej: "¿Cómo puedo ${getActionVerb(intentKey, businessType).toLowerCase()}?")**
        1. Explica el proceso en 1-2 líneas (pasos simples, sin detalles técnicos)
        2. Usa lenguaje cálido: "es muy simple", "solo necesitas", "te ayudo en un momento"
        3. Cierra pidiendo confirmación para empezar

        **ESCENARIO B: Usuario ya quiere actuar (ej: "quiero ${getActionVerb(intentKey, businessType).toLowerCase()}", "ayúdame a ${getActionVerb(intentKey, businessType).toLowerCase()}")**
        1. Confirma que vas a ayudar con ${getActionVerb(intentKey, businessType)}
        2. Menciona los datos necesarios de forma resumida (NO una lista con bullets)
        3. Cierra con pregunta de confirmación suave

        RESPONSE FORMAT (obligatorio):
        - Máximo 3-4 líneas (WhatsApp mobile)
        - NO uses bullets (📅, ⏰, 👤 en líneas separadas) — eso es muy robótico
        - Integra los datos en la narrativa: "necesito fecha, hora y número de personas"
        - Termina con emoji + pregunta de confirmación

        EJEMPLOS POR MÓDULO (usar como referencia, adaptar al dominio=${businessType}):
        ${
          intentModule === "booking"
            ? `
        BOOKING (${getModuleName("booking", businessType)}):
        • Usuario: "¿Cómo puedo ${getActionVerb("booking:create", businessType).toLowerCase()}?" → "Es muy fácil 😊 Solo necesito fecha, hora y cuántas personas son. ¿Te aparto un lugar ahora? ✅"
        • Usuario: "quiero ${getActionVerb("booking:create", businessType).toLowerCase()}" → "¡Claro! Para ${getActionVerb("booking:create", businessType).toLowerCase()} solo necesito fecha, hora y número de personas. ¿Empezamos? 😊"
        • Usuario: "necesito ${getActionVerb("booking:modify", businessType).toLowerCase()}" → "Perfecto 😊 Voy a ${getActionVerb("booking:modify", businessType).toLowerCase()}. ¿Qué te gustaría cambiar? 🔄"
        • Usuario: "cómo se ${getActionVerb("booking:create", businessType).toLowerCase().split(" ")[0]}" → "El proceso es simple: me dices fecha, hora y número de personas, y yo te aparto el lugar. ¿Quieres que empiece ahora? 😊"`
            : ""
        }
        ${
          intentModule === "products"
            ? `
        PRODUCTS (${getModuleName("products", businessType)}):
        • Usuario: "¿Cómo puedo ${getActionVerb("products:view", businessType).toLowerCase()}?" → "Fácil 😊 Te muestro nuestro catálogo y me dices qué te gusta. ¿Vamos con eso? ✅"
        • Usuario: "quiero ${getActionVerb("products:view", businessType).toLowerCase()}" → "¡Perfecto! Aquí tienes nuestro catálogo. ¿Algo en particular que busques? 📋"`
            : ""
        }
        ${
          intentModule === "orders"
            ? `
        ORDERS (${getModuleName("orders", businessType)}):
        • Usuario: "¿Cómo puedo ${getActionVerb("orders:create", businessType).toLowerCase()}?" → "Es rápido 😊 Me dices qué te gustaría y coordinamos entrega o recogida. ¿Empezamos? ✅"
        • Usuario: "quiero ${getActionVerb("orders:create", businessType).toLowerCase()}" → "¡Excelente! ¿Qué te gustaría pedir hoy? 🍽️"`
            : ""
        }

        RULES:
        - **NO listes datos con bullets en líneas separadas** (se ve robótico)
        - Explica el proceso SOLO si el usuario preguntó "cómo" o parece tener dudas
        - Usa confirmación suave: "¿Te aparto...?", "¿Empezamos?", "¿Vamos con eso?"
        - NO uses "¿Estás seguro?" (genera ansiedad)
        - El usuario debe responder: "sí" (isConfirmed) | "no" (isRejected) | "no sé" (isUncertain)
        - Varía los conectores: "Es muy fácil", "El proceso es simple", "Te ayudo en un momento"
        - **Adapta el vocabulario al dominio** (${businessType} + ${activeModules.join(", ")})
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
        - Módulo: ${getModuleName(intentModule, businessType)}
        - Dominio: ${businessType || "general"}
        - Usuario mostró señal: isRejected=true ("no", "no quiero", "mejor no")
        - PolicyEngine decidió proponer alternativa en vez de insistir

        ALTERNATIVAS DISPONIBLES (excluyendo intentKey rechazada):
        ${filteredAlts.length > 0 ? filteredAlts.map((alt, i) => `${i + 1}. ${alt.intentKey} (${getModuleName(alt.module, businessType)}) - score: ${alt.score.toFixed(2)}`).join("\n        ") : "No hay alternativas en BeliefState — usa tu criterio"}

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

        EJEMPLOS POR ESCENARIO (dominio=${businessType}):
        ${
          intentModule === "booking"
            ? `
        BOOKING RECHAZADO (intentKey=${intentKey}):
        • Usuario rechazó horario: "¿Y si cambiamos a otro horario? ¿Qué opinas? ✨"
        • Usuario rechazó fecha: "¿Te viene mejor otro día de esta semana? ¿Cómo lo ves? 😄"
        • Usuario rechazó party size: "¿O prefieres una mesa más pequeña? ¿Te parece bien? ✅"
        • Alternativa desde sameModuleAlts[0]: "¿O prefieres ${sameModuleAlts[0] ? getActionVerb(sameModuleAlts[0].intentKey, businessType) : "otra opción"}? ¿Te late? 👋"`
            : ""
        }
        ${
          intentModule === "products" || intentModule === "orders"
            ? `
        ${intentModule === "products" ? "PRODUCTOS" : "PEDIDOS"} RECHAZADO (intentKey=${intentKey}):
        • Usuario rechazó producto/plato: "¿O probamos con otro ${intentModule === "products" ? "plato" : "producto"} del menú? ¿Qué opinas? ✨"
        • Usuario rechazó orderType: "¿Prefieres recoger en local en vez de delivery? ¿Te funciona? 😊"
        • Usuario rechazó cantidad: "¿O pedimos media ración para probar? ¿Vamos con eso? 🙌"
        • Alternativa desde sameModuleAlts[0]: "¿O prefieres ${sameModuleAlts[0] ? getActionVerb(sameModuleAlts[0].intentKey, businessType) : "otra opción"}? ¿Cómo lo ves? 😄"`
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
        - Módulo: ${getModuleName(intentModule, businessType)}
        - Dominio: ${businessType || "general"}
        - Action: ${policy.action}
        - requiresConfirmation: "${requiresConfirmation}"
        - PolicyEngine decidió ejecutar inmediatamente

        CONTEXT:
        - requiresConfirmation="never" → ejecutar sin confirmar (ej: info:ask_*, social:*)
        - requiresConfirmation="maybe" + isConfident=true → ejecutar (alta confianza)
        - Usuario ya confirmó (isConfirmed=true) → ejecutar

        HOW TO RESPOND (por módulo):
        ${
          intentModule === "informational"
            ? `
        INFORMACIÓN (no requiere acción del usuario):
        1. Responde directamente con la información solicitada
        2. Sé conciso y útil
        3. Cierra con oferta de ayuda adicional (variar naturalmente)

        EJEMPLOS:
        • intentKey="info:ask_business_hours": "Abrimos de Lunes a Domingo de 12:00 a 23:00. ¿Te ayudo con algo más? 😊"
        • intentKey="info:ask_location": "Estamos en Calle Principal 123, Centro. ¿Necesitas indicaciones para llegar? 📍"
        • intentKey="info:ask_payment_methods": "Aceptamos efectivo, débito y crédito. ¿Algo más en lo que te ayude? ✅"

        RULES:
        - NO des información que no está en el contexto
        - Si no hay datos: "Lo siento, no tengo esa información. ¿Hay algo más en lo que pueda ayudarte?"
        - Varía el cierre: "¿Te ayudo con algo más?", "¿Necesitas indicaciones?", "¿Algo más?"`
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

        EJEMPLOS:
        • intentKey="social:greeting": "¡Hola! ¿Cómo estás? ¿En qué te ayudo hoy? 😊"
        • intentKey="social:farewell": "¡Hasta pronto! Vuelve cuando quieras ✨"
        • intentKey="signal:affirmation": "¡Perfecto! Vamos con ello 👍"
        • intentKey="signal:negation": "Entiendo, sin problema. ¿Otra cosa en la que te ayude? 😊"

        RULES:
        - Matchea el tono del usuario (casual/formal)
        - NO conviertas saludos/despedidas en ventas
        - Responde y deja espacio para que el usuario continúe`
            : ""
        }
        ${
          intentModule === "booking"
            ? `
        BOOKING (acción confirmada — proceder directamente):
        1. Confirma que vas a ayudar con ${getActionVerb(intentKey, businessType)}
        2. Pide SOLO el primer dato necesario (NO todos de una vez)
        3. NO pidas confirmación adicional (ya fue confirmada por PolicyEngine)

        EJEMPLOS (adaptar a ${businessType} + ${getModuleName("booking", businessType)}):
        • intentKey="booking:create": "¡Excelente! Voy a ${getActionVerb("booking:create", businessType).toLowerCase()}. ¿Para qué fecha te lo aparto? 📅"
        • intentKey="booking:modify": "¡Claro! Voy a ${getActionVerb("booking:modify", businessType).toLowerCase()}. ¿Qué te gustaría cambiar? 🔄"
        • intentKey="booking:cancel": "Entiendo. Voy a ${getActionVerb("booking:cancel", businessType).toLowerCase()}. ¿Me confirmas cuál es? ❌"
        • intentKey="booking:check_availability": "¡Perfecto! Voy a ${getActionVerb("booking:check_availability", businessType).toLowerCase()}. ¿Para qué fecha? 📅"

        RULES:
        - Pide UN dato a la vez (no abrumes con lista de preguntas)
        - NO vuelvas a pedir confirmación de la acción principal
        - **Adapta el vocabulario**: "reserva" (restaurant), "cita" (medical), "visita" (real-estate)`
            : ""
        }
        ${
          intentModule === "products"
            ? `
        PRODUCTS (acción confirmada — proceder directamente):
        1. Confirma que vas a ayudar con ${getActionVerb(intentKey, businessType)}
        2. Menciona el siguiente paso concreto
        3. NO pidas confirmación adicional

        EJEMPLOS (adaptar a ${businessType} + ${getModuleName("products", businessType)}):
        • intentKey="products:view": "¡Perfecto! Aquí tienes nuestro catálogo. ¿Algo en particular que te llame la atención? 📋"
        • intentKey="products:find": "¡Claro! ¿Qué tipo de producto estás buscando? 🔍"
        • intentKey="products:recommend": "¡Con gusto! ¿Para cuántas personas es? Así te recomiendo lo ideal 😊"

        RULES:
        - Si hay catálogo: menciónalo y ofrece ayuda específica
        - NO listes todos los productos (abruma)
        - Guía hacia una decisión
        - **Adapta el vocabulario**: "menú/plato" (restaurant), "catálogo/producto" (retail)`
            : ""
        }
        ${
          intentModule === "orders"
            ? `
        ORDERS (acción confirmada — proceder directamente):
        1. Confirma que vas a ayudar con ${getActionVerb(intentKey, businessType)}
        2. Pide el primer dato (qué producto o tipo de orden)
        3. NO pidas confirmación adicional

        EJEMPLOS (adaptar a ${businessType} + ${getModuleName("orders", businessType)}):
        • intentKey="orders:create": "¡Excelente! Voy a ${getActionVerb("orders:create", businessType).toLowerCase()}. ¿Qué te gustaría pedir hoy? 🍽️"
        • intentKey="orders:modify": "¡Sin problema! Voy a ${getActionVerb("orders:modify", businessType).toLowerCase()}. ¿Qué necesitas cambiar? 🔄"
        • intentKey="orders:cancel": "Entiendo. Voy a ${getActionVerb("orders:cancel", businessType).toLowerCase()}. ¿Me confirmas cuál pedido es? ❌"

        RULES:
        - Pide UN dato a la vez
        - NO vuelvas a pedir confirmación de la acción principal
        - Usa emojis específicos: 🍽️ (pedido), 🔄 (modificar), ❌ (cancelar)
        - **Adapta el vocabulario**: "pedido de comida" (restaurant), "pedido" (retail)`
            : ""
        }

        RULES GENERALES:
        - NO pidas confirmación (PolicyEngine ya la gestionó)
        - Procede directamente con la acción
        - Sé útil y orientado a la tarea
        - Usa vocabulario específico del dominio (${businessType})
        - Usa intentKey para saber QUÉ acción ejecutar
        - **Pide un dato a la vez** (no abrumes con múltiples preguntas)
        - **Adapta el vocabulario** según businessType (${businessType}) + activeModules (${activeModules.join(", ")})
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
        - Usa vocabulario específico del dominio (${businessType})
        - NO menciones el error técnico

        EJEMPLO:
        "Soy ${assistantName} de ${businessName}. Puedo ayudarte con ${activeModules
          .filter(
            (m) =>
              m !== "informational" &&
              m !== "social-protocol" &&
              m !== "conversational-signal",
          )
          .map((m) => getModuleName(m, businessType))
          .join(", ")}. ¿En qué te ayudo?"
      `;
  }
}
