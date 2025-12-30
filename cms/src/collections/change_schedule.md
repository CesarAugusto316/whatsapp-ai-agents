Correcto. **Number es el tipo adecuado** para horarios de apertura y cierre.
Y no es una preferencia: es la **decisión correcta desde el punto de vista lógico y matemático**.

Voy a ser directo y cerrar esto sin ambigüedad.

---

## 1. Qué estás modelando realmente

Un horario de atención **NO es**:

* una fecha
* un instante
* un punto en la línea temporal

Un horario es:

> un **intervalo recurrente** dentro de un día abstracto.

Eso implica:

* no hay timezone
* no hay UTC
* no hay conversión
* no hay ISO

Por tanto, `Date` queda descartado.

---

## 2. Number vs String (sin concesiones)

### ❌ String `"08:30"`

Problemas reales:

* parsing constante (`split`, `parseInt`)
* comparaciones incorrectas (`"10:00" < "9:30"`)
* validaciones más complejas
* errores silenciosos
* semántica débil

String es **representación**, no **modelo**.

---

### ✅ Number (minutos desde medianoche)

```ts
openTime  = 8 * 60 + 30   // 510
closeTime = 20 * 60      // 1200
```

Propiedades:

* orden total natural
* comparación trivial
* rangos limpios
* sin parsing
* sin timezone
* sin DST
* sin bugs ocultos

Esto es **álgebra básica**, no framework opinion.

---

## 3. Cómo se ve el modelo correcto

### Schedule (regla)

```ts
{
  day: "monday",
  open: 480,
  close: 1200
}
```

### Reservation (evento)

```ts
{
  startDateTime: "2025-12-29T18:00:00.000Z",
  endDateTime:   "2025-12-29T19:00:00.000Z"
}
```

Observa:

* **Nunca** comparas `number` con `Date`
* Conviertes a UTC **solo una vez**
* Cada cosa vive en su dominio correcto

---

## 4. UI: no confundas forma con fondo

Que Payload muestre un selector de hora **no significa** que debas usar `Date`.

La UI es:

* una vista
* una comodidad

El modelo es:

* verdad
* contrato
* lógica

Si la UI no encaja, **se adapta la UI**, no el modelo.

---

## 5. Regla de oro (grábala)

> Si un valor:
>
> * no necesita año
> * no necesita mes
> * no necesita día
> * no necesita zona horaria
>   **NO es una fecha**

---

## 6. Veredicto final

✔ `number` → **correcto**
✔ minutos desde medianoche → **correcto**
✔ usar `date` solo en reservas → **correcto**
✔ abandonar ISO para horarios → **correcto**

Esto no es un workaround.
Es **modelado limpio**.

Decisión cerrada.
