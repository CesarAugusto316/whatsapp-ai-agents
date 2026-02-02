
---

# 🧭 Vista general del sistema (de afuera hacia adentro)

```
┌───────────────┐
│   Landing     │
│  (marketing)  │
└───────┬───────┘
        │
        ▼
┌─────────────────────────┐
│      Onboarding         │
│  Preguntas + Upload     │
└───────┬────────────────┘
        │
        ▼
┌─────────────────────────┐
│   Ingesta de datos      │
│ PDF / Excel / Imagen   │
└───────┬────────────────┘
        │
        ▼
┌─────────────────────────┐
│ Inferencia de dominio  │
│ JSON estructurado      │
└───────┬────────────────┘
        │
        ▼
┌─────────────────────────┐
│ Creación del negocio   │
│ tablas / servicios     │
└───────┬────────────────┘
        │
        ▼
┌──────────────┬──────────────┐
│   WhatsApp   │   Dashboard  │
│   (WAHA QR)  │   Operativo  │
└──────┬───────┴──────┬───────┘
       │              │
       ▼              ▼
  Conversaciones   Eventos + BI
```

---

# 🧭 Onboarding (lo primero que ve el cliente)

```
┌────────────────────────────────────┐
│ Bienvenido                        │
│ ¿Qué tipo de negocio tienes?     │
│                                  │
│ ( ) Restaurante                  │
│ ( ) Clínica                      │
│ ( ) Barbería                     │
│ ( ) Otro                         │
│                                  │
│ [ Continuar ]                    │
└────────────────────────────────────┘


┌────────────────────────────────────┐
│ ¿Tienes menú / precios?          │
│                                  │
│ [ Subir PDF ]                    │
│ [ Subir Excel ]                  │
│ [ Tomar foto ]                   │
│                                  │
│ o completar manualmente          │
└────────────────────────────────────┘
```

---

# 📄 Ingesta → Dominio → JSON

Lo que ocurre detrás:

```
PDF / Imagen / Excel
        │
        ▼
┌─────────────────┐
│  Parser OCR     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Entity Extract  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Domain Infer    │
└────────┬────────┘
         ▼
     JSON estructurado
```

Ejemplo mental:

```
[
  { "category": "Bebidas", "name": "Café", "price": 1.50 },
  { "category": "Platos", "name": "Ceviche", "price": 4.00 }
]
```

Eso entra directo al CMS.

---

# 🔗 Conexión WhatsApp

Dentro del dashboard:

```
┌───────────────────────────────┐
│ Conectar WhatsApp            │
│                               │
│   ████████  QR CODE  ██████  │
│                               │
│ Escanea con tu celular        │
│                               │
│ Estado: ⏳ esperando...       │
└───────────────────────────────┘
```

Luego:

```
Estado: ✅ Conectado
Número: +593xxxxxx
```

WhatsApp ya es canal nativo del sistema.

---

# 🧠 Dashboard principal (operación)

```
┌──────────────────────────────────────────────────┐
│  Dashboard                                      │
├──────────────┬──────────────────────────────────┤
│              │  Hoy                            │
│   Menú       │  ┌───────────────┐              │
│              │  │ 12 citas      │              │
│ - Citas      │  │ 85% ocupación│              │
│ - Servicios  │  └───────────────┘              │
│ - Clientes   │                                  │
│ - BI         │  Próximas citas                  │
│              │  10:00 Juan / Corte              │
│              │  11:00 Ana / Color               │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

---

# 📊 BI (observabilidad)

```
┌───────────────────────────────┐
│ Ocupación por hora           │
│                               │
│ ████▇▇▇▆▅                     │
│ 9 10 11 12 13 14 15           │
└───────────────────────────────┘


┌───────────────────────────────┐
│ Heatmap semanal              │
│                               │
│ Lun ███                      │
│ Mar ██████                   │
│ Mie ██                       │
│ Jue █████                    │
│ Vie ████████                 │
└───────────────────────────────┘
```

Aquí el negocio empieza a verse.

---

# 🧠 Asistente interno (Payload CMS)

No chat decorativo.

Panel operativo:

```
┌────────────────────────────────┐
│ Asistente                     │
│                               │
│ > cambia horario viernes      │
│                               │
│ Resultado:                    │
│ Viernes ahora 9am – 7pm       │
│                               │
│ [ Confirmar ]                 │
└────────────────────────────────┘
```

O:

```
> agrega servicio manicure $10

✓ Servicio creado
✓ Duración estimada: 45 min
✓ Visible en WhatsApp
```

Lenguaje → operación directa.

---

# 🔁 Loop completo del producto

```
Cliente escribe WhatsApp
        │
        ▼
Reserva creada
        │
        ▼
Evento guardado
        │
        ▼
BI actualizado
        │
        ▼
ML aprende patrón
        │
        ▼
Recomendación aparece
```

---

# 🧩 Vista conceptual final

```
DOCUMENTOS
    ↓
ESTRUCTURA
    ↓
OPERACIÓN
    ↓
EVENTOS
    ↓
BI
    ↓
ML
    ↓
RECOMENDACIONES
```

Ese es el sistema.

---
