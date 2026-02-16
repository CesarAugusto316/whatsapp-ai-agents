Sí — y aquí voy a ser muy preciso, porque este punto es clave:

### tus sagas ya son semánticas

aunque todavía no las estés usando como memoria semántica.

Voy a explicarte exactamente por qué, usando TU código.

---

# 1. Qué significa “pasos semánticos” (en tu caso)

Un paso es semántico cuando:

* representa un **acto del dominio**
* tiene un **significado explícito**
* transforma el **estado del mundo**
* produce **hechos**

No cuando solo ejecuta lógica.

Veamos:

---

## earlyConditions

```ts
"CUSTOMER_EXITED_FLOW"
"MAX_ATTEMPTS_REACHED"
"INPUT_CLASSIFICATION_RESULT"
```

Esto NO es control flow.

Esto es:

### eventos de negocio:

* CustomerExitedFlow
* MaxAttemptsReached
* InputClassifiedAsQuestion

Son *domain events*.

---

## collect_and_validate

Aquí haces:

```ts
const agentResult = await validatorAgent.parseData(...)
```

produces:

```ts
mergedData
parsedData
errors
```

Esto genera:

* ReservationDataCollected
* ReservationDataInvalid
* MissingFieldsDetected

Otra vez:

### semántica pura.

---

## check_availability

Mira tus branches:

```ts
IS_OUT_OF_BUSINESS_HOURS
IS_WITHIN_HOLIDAY
RESERVATION_NOT_AVAILABLE
DATA_VALIDATED
```

Eso es literalmente:

### reglas del mundo.

No código.

---

# 2. Lo importante

Cada `metadata.description` que tú produces es:

> una etiqueta semántica.

Ejemplo:

```ts
metadata: {
  description: "RESERVATION_NOT_AVAILABLE"
}
```

Eso debería vivir en una tabla de eventos:

```json
{
  "event": "RESERVATION_NOT_AVAILABLE",
  "datetime": "...",
  "payload": {
    start,
    end,
    people
  }
}
```

No solo en logs.

---

# 3. Por qué esto importa

Porque ahora mismo estás haciendo esto:

### semántica → texto → olvido

Flujo actual:

1. LLM extrae datos
2. tú produces estado
3. guardas en Redis
4. luego vuelves a texto
5. vuelves a pedir inferencia

Estás degradando información.

---

# 4. Lo correcto

Es:

### semántica → memoria semántica → razonamiento

---

# 5. Ejemplo directo en tu saga

Después de este punto:

```ts
await cacheAdapter.save(reservationKey, {...})
```

deberías añadir:

---

## semantic upsert

```ts
await semanticMemory.upsert({
  chatId: reservationKey,
  type: "reservation_state",
  payload: {
    status: transition.nextState,
    datetime: data.datetime,
    people: data.numberOfPeople
  }
});
```

---

Y cuando ocurre:

```ts
description: "RESERVATION_NOT_AVAILABLE"
```

registras:

```ts
await semanticMemory.insert({
  chatId,
  type: "event",
  payload: {
    name: "RESERVATION_NOT_AVAILABLE",
    availability
  }
});
```

---

# 6. Esto te permite después:

Antes del intentClassifier:

```ts
const memory = await semanticMemory.search({
  chatId,
  embedding: embed(customerMessage)
});
```

Y pasas eso al LLM.

---

# 7. Resultado inmediato

Tu sistema pasa de:

### stateless-ish chatbot

a

### stateful reasoning system.

---

# 8. Punto importante

No necesitas RAG de PDFs.

No necesitas documentos.

Tu “documentos” son:

* saga steps
* reservation states
* domain events

Eso es mucho mejor que PDFs.

---

# 9. Arquitectura real que ya tienes

Sin exagerar:

Ya tienes:

✅ FSM
✅ Saga
✅ Domain Events
✅ Determinismo
✅ State transitions
✅ Validation layer

Solo te falta:

### vectorizar tu propio estado.

---

# 10. Frase clave (guárdala)

> Tu sistema ya piensa.
> Solo no recuerda.

---

# Conclusión

Sí:

Tus pasos son semánticos.
Tu saga es una ontología implícita.
Tu metadata ya es un knowledge graph rudimentario.

Lo único que falta es:

### persistirlo como memoria consultable.

Eso es literalmente 1–2 días de trabajo para ti.

---

Si quieres, próximo mensaje puedo darte:

### esquema exacto de semantic_memory

### adapter TS

### integración directa en `startedSteps`

### retrieval hook antes del LLM

todo alineado con tu arquitectura actual.

Solo dime.
