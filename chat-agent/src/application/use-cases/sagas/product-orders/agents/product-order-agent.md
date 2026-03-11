Mi recomendación para tu caso

Dado que:
- ✅ Ya tenés tool calling funcionando
- ✅ Usás Granite 3B (modelo chico, pero efectivo para tareas concretas)
- ✅ Buscás simplicidad
- ✅ El dominio es acotado (restaurante, no e-commerce general)

**Iría con una variante de la Opción 3:**

### **Propuesta concreta:**

1. **Una sola herramienta**: `manage_cart(action, items)`
   - `action`: "add" | "remove" | "update" | "view" | "clear"
   - `items`: `[{ product_id, quantity, notes }]`

2. **El LLM detecta la acción** y extrae los productos mencionados
   - "agregame 2 pizzas" → `manage_cart("add", [{ product: "pizza", qty: 2 }])`
   - "sacame la ensalada" → `manage_cart("remove", [{ product: "ensalada" }])`
   - "mostrame mi pedido" → `manage_cart("view", [])`

3. **La herramienta resuelve los productos** con fuzzy matching
   - Si el LLM dice `product: "pizza"` → buscás en tu DB qué pizzas hay
   - Si hay múltiples → preguntás "¿qué pizza querés? Tenemos X, Y, Z"
   - Si hay una sola → la agregás directamente

4. **Redis para el carrito:**
   ```
   Key: cart:{businessId}:{customerId}
   Value: { items: [{ productId, name, qty, price, notes }], total, updatedAt }
   TTL: 30-60 minutos (abandona el carrito si no confirma)
   ```

5. **Flujo de confirmación:**
   ```
   Usuario: "agregame 2 pizzas"
   → Agrega al carrito
   → Responde: "✅ 2 pizzas agregadas. Tu pedido lleva: 2 pizzas, 1 ensalada. ¿Algo más o confirmamos?"
   
   Usuario: "confirmo"
   → Muestra resumen final con total
   → Crea la orden en la DB
   → Limpia el carrito
   ```

---

## ¿Por qué no solo regex?

Porque perdés flexibilidad:
- Regex: `/agrega(r|me)?\s+(pizza|ensalada|pasta)/` → Tenés que listar **todos** los platos
- LLM: Entiende "quiero eso", "dame la primera", "la de pollo", "la más barata"

## ¿Por qué no solo tool calling?

Porque con modelos chicos (3B), cada herramienta extra es una oportunidad de fallar. Si tenés 5 herramientas de carrito + 2 de búsqueda, el modelo puede confundirse.

---

## Resumen

**Camino recomendado:**
1. Una herramienta `manage_cart` con acción + items
2. LLM extrae la intención y los productos
3. Fuzzy matching para resolver productos ambiguos
4. Redis para estado del carrito
5. Confirmación implícita después de cada acción
6. Resumen final antes de confirmar la orden

📄 Archivos creados

### 1. `router-agent-prompt.ts` 
**Función:** Router que decide a qué agente derivar

**Output:** Solo responde `"search"` o `"cart"`

**Lógica de decisión:**
| Usuario dice... | Router deriva a... |
|----------------|-------------------|
| "Quiero ver el menú" | search |
| "¿Qué postres tienen?" | search |
| "Busco pizzas" | search |
| "Quiero una pizza" | search (primero explora) |
| "Agregame 2 pizzas" | cart |
| "Poneme una ensalada" | cart |
| "Quitame la pizza" | cart |
| "Mostrame mi carrito" | cart |
| "Confirmo" | cart |

---

### 2. `cart-agent-prompt.ts`
**Función:** Gestionar el carrito (agregar, quitar, modificar, ver, confirmar)

**Herramienta:** `manage_cart(action, items)`

**Acciones:**
- `add` → "agregame 2 pizzas"
- `remove` → "quitame la ensalada"
- `update` → "cambiame a 4 en vez de 2"
- `view` → "mostrame mi pedido"
- `confirm` → "confirmo"

**Características clave:**
- Extrae producto, cantidad y notas
- Maneja pronombres ("eso", "esto")
- Pide aclaración si hay ambigüedad
- Confirma cada acción

---

## 🏗️ Arquitectura propuesta

```
      ┌─────────────┐
      │   Usuario   │
      └──────┬──────┘
            │
            ▼
      ┌─────────────────┐
      │  Router Agent   │ ──→ "search" o "cart"
      └────────┬────────┘
              │
          ┌────┴────┐
          │         │
          ▼         ▼
      ┌─────────┐ ┌──────────┐
      │ Search  │ │  Cart    │
      │ Agent   │ │  Agent   │
      │         │ │          │
      │ - search│ │ -manage_ │
      │ _products│ │  cart    │
      │ -get_menu│ │          │
      └─────────┘ └──────────┘
```

---

## 🔍 Diferencia clave entre agentes

| Frase | Router → | Agente | Herramienta |
|-------|----------|--------|-------------|
| "Quiero una pizza" | search | Search | `search_products` |
| "Agregame una pizza" | cart | Cart | `manage_cart` |
| "¿Tienen pizzas?" | search | Search | `search_products` |
| "Dame esa pizza" | cart | Cart | `manage_cart` |

La diferencia está en la **intención**: ¿está explorando o está agregando?
