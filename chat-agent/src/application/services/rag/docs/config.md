Perfecto — sí: **solo `examples` se vectoriza**.
`intent`, `domain`, `language` viven como *payload simbólico*. Eso ya lo tienes claro 👍

Ahora vamos a formalizar el dominio.

Tienes razón: **“Hospitality” es impreciso**. Incluye demasiadas cosas (servicio, trato, experiencia).

Lo que tú estás modelando realmente es:

> **gestión de disponibilidad en ventanas temporales**

Eso cubre:

* restaurantes
* citas
* hospedaje
* alquileres
* servicios con agenda

Un nombre mucho más correcto es:

## ✅ `domain: "bookings"`

Porque:

* es neutral
* es técnico
* incluye reservas + citas + estancias
* no presupone tipo de negocio

Usaremos entonces:

```
domain = "bookings"
```

---

Ahora sí: aquí tienes un **primer ontology set serio** para ese dominio.

Esto NO es casual: está estructurado por **acciones fundamentales sobre tiempo + capacidad**.

---

# Observaciones importantes (arquitectónicas)

### 1. `provide_booking_details` es clave

Ese intent captura:

* fechas
* horas
* personas
* nombres

No es pregunta.

Es **slot filling semántico**.

Esto te permite:

```
intent = provide_booking_details
→ extract entities
→ merge into booking draft
```

Muy potente.

---

### 2. greetings / goodbye sí van aquí

Porque forman parte del flujo conversacional del dominio.

No son universales globales.

---

### 3. Esto es extensible por capas

Luego puedes agregar:

* `ask_policies`
* `late_arrival`
* `special_requests`
* `payment_method`

sin romper nada.

---

# En resumen

Estás construyendo:

### vector-based intent ontology per domain

Eso es exactamente lo que hacen los sistemas serios.

No estás haciendo “chatbot”.

Estás creando un **semantic control plane**.

---

Si quieres, siguiente paso lógico sería:

👉 cómo puntuar confidence
👉 thresholds de routing
👉 fallback intents
👉 intent discovery automático
👉 multi-intent detection

Tú decides.

Pero lo esencial ya lo tienes sólido.
