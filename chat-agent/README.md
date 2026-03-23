```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

# Architecture

```

      
      ┌─────────────────────────────────────────────────────────────────┐
      │  USER INPUT (WhatsApp)                                          │
      │  "agrega la opción 1 al carrito"                                │
      └─────────────────────────────────────────────────────────────────┘
                                    ↓
      ┌─────────────────────────────────────────────────────────────────┐
      │  POLICY ENGINE (Punto de entrada)                               │
      │  → Evalúa estado actual del usuario                             │
      │  → Aplica reglas de negocio condicionales                       │
      │  → Decide: ¿A qué capa enruto este input?                       │
      │     ├─→ Si es selección de producto → Regex Cart Parser         │
      │     ├─→ Si es booking → classifyInput → parseBookingData        │
      │     └─→ Si es pregunta abierta → Embeddings Search              │
      └─────────────────────────────────────────────────────────────────┘
                                    ↓
      ┌───────────────┬───────────────────┬─────────────────────────────┐
      │  Regex Layer  │  Embeddings Layer │  LLM Layer (minimal)        │
      │  (estructura) │  (semántica)      │  (interfaz humana)          │
      │  • Fechas     │  • Búsqueda       │  • Humanizar errores        │
      │  • Personas   │    productos      │  • Copy natural             │
      │  • Opciones   │  • Recomendaciones│  • NO toma decisiones       │
      └───────────────┴───────────────────┴─────────────────────────────┘
                                    ↓
      ┌─────────────────────────────────────────────────────────────────┐
      │  VALIDACIÓN (Zod)                                               │
      │  → Contrato explícito de datos                                  │
      │  → Rechaza datos inválidos antes de persistir                   │
      └─────────────────────────────────────────────────────────────────┘
                                    ↓
      ┌─────────────────────────────────────────────────────────────────┐
      │  PERSISTENCIA + RESPUESTA                                       │
      │  → Guarda en DB                                                 │
      │  → Policy Engine decide próximo estado                          │
      │  → LLM minimal genera copy de confirmación                      │
      └─────────────────────────────────────────────────────────────────┘


```
