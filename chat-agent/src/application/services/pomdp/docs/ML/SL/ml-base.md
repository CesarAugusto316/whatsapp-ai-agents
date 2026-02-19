
---

## 🧱 **Base actual del sistema**

Tu arquitectura actual es un **agente conversacional controlado, modular y con estado explícito**, diseñado para WhatsApp y adaptable a múltiples negocios (restaurantes, ropa, etc.). Está compuesto por:

### 1. **Belief State**
- Representa el **estado de conocimiento del sistema** sobre la intención del usuario.
- Contiene:
  - `current`: intención más reciente (con score, módulo, señales).
  - `previous`: intención anterior (para comparar cambios).
  - `signals`: metadatos de confirmación (`isConfirmed`, `isRejected`, `isUncertain`).
  - `executedIntents`: historial de intenciones ya ejecutadas.
  - `intentJumps`, `lastUpdate`, etc.

> ✅ **Ventaja**: estado serializable, depurable y listo para análisis.

---

### 2. **BeliefStateUpdater**
- Actualiza el belief state usando **lógica condicional simple**.
- Maneja:
  - Nuevas intenciones (desde RAG).
  - Señales conversacionales (`sí`, `no`, `no sé`) → las aplica a la intención pendiente.
- No usa modelos complejos: solo reglas claras y deterministas.

> ✅ **Ventaja**: predecible, fácil de testear, sin alucinaciones.

---

### 3. **Policy Engine**
- Toma decisiones basadas en el belief state.
- Tipos de decisiones:
  - `ask_clarification`
  - `ask_confirmation`
  - `execute` (con saga workflow)
- Usa reglas explícitas basadas en:
  - `requiresConfirmation` (`never`, `maybe`, `always`)
  - `signals` (confirmación explícita)
  - `score` (confianza del RAG)

> ✅ **Ventaja**: política separada del resto → reemplazable en el futuro.

---

### 4. **RAG + Intent Examples**
- Base de ejemplos semánticos genéricos (menú, reservas, horarios, etc.).
- Organizados por dominio y nivel de riesgo.
- Soportan múltiples negocios sin reentrenamiento.

> ✅ **Ventaja**: conocimiento estructurado, reusable, escalable.

---

### 5. **Registro y persistencia**
- Todo el flujo se guarda en caché/base de datos:
  - Belief states
  - Decisiones del policy engine
  - Intenciones detectadas
  - Resultados de RAG

> ✅ **Ventaja**: generas **datos etiquetados de calidad** automáticamente.

---
