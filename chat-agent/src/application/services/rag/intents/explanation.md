## Respondiendo tus preguntas

### 1. ¿"Observation" es lo que tú llamas "intents"?

**No exactamente**. Hay una confusión de terminología aquí:

```typescript
// TUS "intents" son PLANTILLAS/EJEMPLOS para el RAG
export const bookingIntents: SemanticIntent<BookingIntentKey>[] = [
  {
    intent: "create_booking",  // ← Esta es la ETIQUETA/CLASE
    examples: ["quiero hacer una reserva", ...]  // ← Ejemplos para vectorizar
  }
];

// "Observation" es lo que OBSERVAS del usuario en RUNTIME
type Observation = {
  text: "quiero reservar mesa",           // ← Mensaje real del usuario
  vectorResults: [                         // ← Resultado de buscar en tu RAG
    { intent: "create_booking", score: 0.82 }
  ],
  hasOrderInProgress: false,              // ← Contexto del sistema
  isNegation: false                       // ← Señales conversacionales
};
```

**En POMDP:**
- Tus `intents` = **vocabulary/clases** (lo que el sistema puede reconocer)
- `Observation` = **lo que percibes** del usuario en cada turno (incluye intents detectados + contexto)

---

### 2. ¿Necesitan mejora tus intents?

**SÍ, pero no por las razones que piensas**. El problema no es el código, sino la **estructura semántica**. Déjame mostrarte:

## Problemas Actuales

### Problema 1: Ambigüedad entre dominios

```typescript
// COLISIÓN: "start_order" existe en 2 dominios
restaurantIntents: [
  { intent: "start_order", ... }  // ← Pedir comida
]

eroticIntents: [
  { intent: "start_order", ... }  // ← Comprar contenido
]
```

**¿Qué pasa en runtime?**
```typescript
// Usuario dice: "quiero hacer un pedido"
ragResults = [
  { intent: "start_order", domain: "restaurant", score: 0.78 },
  { intent: "start_order", domain: "erotic", score: 0.76 }
]
// ❌ ¿Cuál es? Tu belief no puede distinguir
```

### Problema 2: Granularidad inconsistente

```typescript
// TRANSVERSAL: Muy específico
transversalIntents: [
  { intent: "ask_pricing" },      // Solo precios
  { intent: "ask_location" },     // Solo ubicación
  { intent: "ask_business_hours" } // Solo horarios
]

// RESTAURANT: Muy amplio
restaurantIntents: [
  { intent: "ask_information" }   // ¿TODO? (tiempo, entrega, estado...)
]
```

**Esto causa:**
```typescript
// Usuario: "¿cuánto cuesta la pizza?"
ragResults = [
  { intent: "ask_pricing", domain: "transversal", score: 0.85 },
  { intent: "ask_information", domain: "restaurant", score: 0.72 }
]
// ❌ Dos intenciones para lo mismo
```

### Problema 3: Intents que son señales, no intenciones

```typescript
transversalIntents: [
  { intent: "confirm" },   // "sí", "ok", "dale"
  { intent: "reject" }     // "no", "no quiero"
]
```

**Estos NO son intenciones**, son **señales conversacionales** que modifican el belief:

```typescript
// Usuario en un flujo: "quiero reservar mesa"
// Sistema: "¿Para cuántas personas?"
// Usuario: "no, mejor cancelar"

// "no" NO es una intención nueva
// "no" modifica la creencia sobre "create_booking"
```

---

## Refactorización Propuesta

```typescript
// ============================================
// 1. NAMESPACE POR DOMINIO (sin colisiones)
// ============================================

export type BookingIntentKey =
  | "booking:create"
  | "booking:modify"
  | "booking:cancel"
  | "booking:check_availability";

export type RestaurantIntentKey =
  | "restaurant:view_menu"
  | "restaurant:place_order"
  | "restaurant:ask_delivery_time"
  | "restaurant:ask_delivery_method";

export type EroticIntentKey =
  | "erotic:view_content"
  | "erotic:purchase_content"
  | "erotic:ask_services";

export type TransversalIntentKey =
  | "general:greeting"
  | "general:goodbye"
  | "general:ask_price"
  | "general:ask_location"
  | "general:ask_hours";

// ============================================
// 2. CONVERSATIONAL SIGNALS (no son intents)
// ============================================

export type ConversationalSignal =
  | "affirmation"   // sí, ok, dale
  | "negation"      // no, no quiero
  | "uncertainty"   // no sé, tal vez
  | "request_help"  // ayuda, no entiendo
  | "request_human"; // hablar con persona

export const conversationalPatterns: Record<ConversationalSignal, RegExp> = {
  affirmation: /\b(sí|si|ok|dale|claro|perfecto|exacto|correcto|vamos)\b/i,
  negation: /\b(no|nop|nope|nel|nanai|ya no|tampoco)\b/i,
  uncertainty: /\b(no sé|tal vez|quizás|puede ser|no estoy seguro)\b/i,
  request_help: /\b(ayuda|no entiendo|explica|cómo funciona)\b/i,
  request_human: /\b(hablar con|persona|humano|operador|alguien)\b/i,
};

// ============================================
// 3. INTENTS MEJORADOS
// ============================================

export const bookingIntents: SemanticIntent<BookingIntentKey>[] = [
  {
    intent: "booking:create",
    domain: "booking",
    lang: "es",
    examples: [
      "quiero hacer una reserva",
      "me gustaría agendar una cita",
      "necesito apartar un espacio para mañana",
      "quisiera reservar para dos personas",
      "puedes ayudarme a sacar una cita",
      "quiero una habitación para el viernes",
      "busco agendar una visita",
      "necesito reservar un cupo",
      "quiero asegurar un lugar",
    ],
  },
  {
    intent: "booking:modify",
    domain: "booking",
    lang: "es",
    examples: [
      "quiero cambiar mi reserva",
      "necesito mover la cita",
      "puedo cambiar la hora",
      "quiero modificar la fecha",
      "hay forma de reprogramar",
      "quiero adelantar la cita",
      "necesito corregir mi reserva",
      "puedo moverla para mañana",
    ],
  },
  {
    intent: "booking:cancel",
    domain: "booking",
    lang: "es",
    examples: [
      "quiero cancelar",
      "ya no voy a poder asistir",
      "puedes eliminar mi reserva",
      "necesito anular la cita",
      "ya no la necesito",
      "no voy a llegar",
      "quiero cancelar lo que agendé",
    ],
  },
  {
    intent: "booking:check_availability",
    domain: "booking",
    lang: "es",
    examples: [
      "hay disponibilidad",
      "qué horarios están libres",
      "tienen espacio hoy",
      "hay cupos mañana",
      "qué días tienen disponibles",
      "hay mesas libres",
      "pueden atenderme ahora",
      "qué horas están disponibles",
    ],
  },
];

export const restaurantIntents: SemanticIntent<RestaurantIntentKey>[] = [
  {
    intent: "restaurant:view_menu",
    domain: "restaurant",
    lang: "es",
    examples: [
      "qué venden",
      "puedo ver el menú",
      "muéstrame las opciones",
      "qué platos tienen",
      "qué hay para comer",
      "quiero ver la carta",
      "qué ofrecen",
      "qué tienen disponible",
    ],
  },
  {
    intent: "restaurant:place_order",
    domain: "restaurant",
    lang: "es",
    examples: [
      "quiero hacer un pedido",
      "deseo ordenar",
      "voy a pedir",
      "quiero comprar comida",
      "quisiera ordenar",
      "listo para pedir",
      "quiero hacer mi pedido",
    ],
  },
  {
    intent: "restaurant:ask_delivery_time",
    domain: "restaurant",
    lang: "es",
    examples: [
      "cuánto tarda",
      "en cuánto tiempo llega",
      "cuánto demora la comida",
      "a qué hora estaría",
      "cuánto tiempo toma",
      "cuánto falta",
      "qué tiempo de espera hay",
      "cuándo estaría listo",
    ],
  },
  {
    intent: "restaurant:ask_delivery_method",
    domain: "restaurant",
    lang: "es",
    examples: [
      "cómo entregan",
      "hacen delivery",
      "puedo recoger",
      "llevan a domicilio",
      "cómo llega el pedido",
      "tienen envío",
      "cómo funciona la entrega",
    ],
  },
];

export const eroticIntents: SemanticIntent<EroticIntentKey>[] = [
  {
    intent: "erotic:view_content",
    domain: "erotic",
    lang: "es",
    examples: [
      "quiero ver tus fotos",
      "muéstrame tu contenido",
      "ver tus videos",
      "qué contenido ofreces",
      "ver tus packs",
      "explorar tu galería",
      "quiero ver más de ti",
    ],
  },
  {
    intent: "erotic:purchase_content",
    domain: "erotic",
    lang: "es",
    examples: [
      "quiero comprar esta foto",
      "quiero este pack",
      "me gustaría comprar un video",
      "quiero adquirir contenido",
      "quiero comprar ahora",
      "cómo compro",
      "quiero este contenido",
    ],
  },
  {
    intent: "erotic:ask_services",
    domain: "erotic",
    lang: "es",
    examples: [
      "haces videollamadas",
      "ofreces contenido personalizado",
      "qué modalidades tienes",
      "cuáles son tus horarios",
      "tienes packs especiales",
      "cuánto cuesta una sesión",
      "tienes promociones",
    ],
  },
];

export const transversalIntents: SemanticIntent<TransversalIntentKey>[] = [
  {
    intent: "general:greeting",
    domain: "transversal",
    lang: "es",
    examples: [
      "hola",
      "buenas",
      "buen día",
      "qué tal",
      "buenas noches",
      "saludos",
    ],
  },
  {
    intent: "general:goodbye",
    domain: "transversal",
    lang: "es",
    examples: [
      "hasta luego",
      "nos vemos",
      "chau",
      "adiós",
      "hasta pronto",
    ],
  },
  {
    intent: "general:ask_price",
    domain: "transversal",
    lang: "es",
    examples: [
      "cuánto cuesta",
      "precio",
      "tarifas",
      "cuánto vale",
      "cuál es el costo",
      "cuánto sale",
    ],
  },
  {
    intent: "general:ask_location",
    domain: "transversal",
    lang: "es",
    examples: [
      "dónde queda",
      "dirección",
      "ubicación",
      "cómo llegar",
      "dónde están",
      "dónde está ubicado",
    ],
  },
  {
    intent: "general:ask_hours",
    domain: "transversal",
    lang: "es",
    examples: [
      "a qué hora abren",
      "a qué hora cierran",
      "cuál es el horario",
      "están abiertos",
      "horario de atención",
      "hasta qué hora trabajan",
    ],
  },
];

// ============================================
// 4. OBSERVATION CON SIGNALS
// ============================================

export type Observation = {
  // Mensaje del usuario
  text: string;
  
  // Resultados RAG (intenciones detectadas)
  intentResults: Array<{
    intent: BookingIntentKey | RestaurantIntentKey | EroticIntentKey | TransversalIntentKey;
    domain: string;
    score: number;
  }>;
  
  // Señales conversacionales detectadas
  signals: {
    isAffirmation: boolean;
    isNegation: boolean;
    isUncertain: boolean;
    needsHelp: boolean;
    wantsHuman: boolean;
  };
  
  // Contexto del sistema
  context: {
    hasActiveBooking: boolean;
    hasOrderInProgress: boolean;
    previousDominantIntent?: string;
    conversationTurns: number;
  };
};

// ============================================
// 5. HELPER PARA CONSTRUIR OBSERVATION
// ============================================

export function buildObservation(
  userMessage: string,
  ragResults: Array<{ intent: string; score: number }>,
  systemContext: {
    hasActiveBooking: boolean;
    hasOrderInProgress: boolean;
    previousDominantIntent?: string;
    conversationTurns: number;
  }
): Observation {
  
  const msg = userMessage.toLowerCase();
  
  return {
    text: userMessage,
    
    intentResults: ragResults.map(r => ({
      intent: r.intent as any,
      domain: r.intent.split(':')[0],
      score: r.score,
    })),
    
    signals: {
      isAffirmation: conversationalPatterns.affirmation.test(msg),
      isNegation: conversationalPatterns.negation.test(msg),
      isUncertain: conversationalPatterns.uncertainty.test(msg),
      needsHelp: conversationalPatterns.request_help.test(msg),
      wantsHuman: conversationalPatterns.request_human.test(msg),
    },
    
    context: systemContext,
  };
}
```

---

## Ventajas de esta Refactorización

### ✅ 1. Sin colisiones
```typescript
// ANTES: Ambiguo
{ intent: "start_order", score: 0.78 }

// AHORA: Explícito
{ intent: "restaurant:place_order", domain: "restaurant", score: 0.78 }
{ intent: "erotic:purchase_content", domain: "erotic", score: 0.76 }
```

### ✅ 2. Granularidad consistente
```typescript
// Antes: "ask_information" muy amplio
// Ahora: 
"restaurant:ask_delivery_time"
"restaurant:ask_delivery_method"
```

### ✅ 3. Señales separadas de intenciones
```typescript
// ANTES: "confirm" era un intent
// AHORA: Es una señal que modifica beliefs

if (observation.signals.isAffirmation) {
  // Reforzar intención dominante
  belief.intents[dominant].score *= 1.3;
}
```

### ✅ 4. Más fácil debuggear
```typescript
// Log claro
{
  intent: "booking:create",
  domain: "booking",
  score: 0.82,
  signals: { isAffirmation: true }
}
```

---

## ¿Vale la pena refactorizar AHORA?

**Mi recomendación**: **Sí, pero solo los namespaces**

### Cambio mínimo (10 minutos)
```typescript
// Solo agregar prefijos a los intents existentes
"create_booking" → "booking:create"
"start_order" → "restaurant:place_order"  // en restaurant
"start_order" → "erotic:purchase_content"  // en erotic

// Mantener todo lo demás igual
```

### Beneficio inmediato
- ✅ Elimina colisiones
- ✅ Compatible con tu código actual
- ✅ Más claro en logs

### Dejar para después
- Separar signals (cuando implementes BeliefUpdater completo)
- Dividir `ask_information` (cuando tengas datos reales de uso)

---

¿Quieres que te ayude con el script de migración para renombrar los intents en la base de datos vectorial?
