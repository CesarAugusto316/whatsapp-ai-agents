---

# 🧠 Roadmap del producto

## De negocio manual → negocio asistido → negocio auto-estructurado

Primero, dejamos esta premisa clara:

> “Hoy configuramos los negocios manualmente porque estamos en validación.  
> Pero el producto está diseñado para que mañana el negocio se configure solo.”

Eso establece intención arquitectónica, no improvisación.

---

# 1️⃣ Problema actual (concreto, sin adornos)

Hoy, para digitalizar un negocio, el cliente debe:

* Crear tablas  
* Definir productos / servicios  
* Cargar horarios  
* Armar menús  
* Escribir descripciones  
* Configurar canales (WhatsApp)

Esto requiere:

* Tiempo  
* Conocimiento técnico  
* Paciencia  

Resultado:

👉 onboarding lento  
👉 fricción  
👉 abandono  

Este es exactamente el punto donde mueren la mayoría de SaaS.

---

# 2️⃣ Fase actual — Setup manual + WhatsApp manual (validación)

Hoy:

* Nosotros configuramos el negocio  
* Creamos horarios, productos y servicios  
* Generamos token en WAHA  
* Conectamos WhatsApp manualmente  

Esto está bien en etapa temprana.

Nos sirve para:

* entender patrones reales  
* observar cómo estructuran su negocio  
* aprender qué datos son esenciales  
* modelar correctamente el dominio  

Esto es *entrenamiento del sistema*, aunque no lo llamemos ML todavía.

---

# 3️⃣ Fase siguiente — Sincronización WhatsApp + Onboarding guiado

Aquí aparecen dos piezas críticas.

---

## 🔗 Sincronización WhatsApp (desde el dashboard)

El business owner podrá:

* Escanear QR desde WAHA  
* Vincular su número directamente  
* Re-sincronizar cuando lo necesite  

Flujo futuro:

Dashboard → “Conectar WhatsApp” → QR → listo.

No tokens manuales.  
No intervención humana.

WhatsApp pasa a ser:

👉 canal operativo nativo del sistema  
no integración secundaria.

---

## 🧭 Onboarding estructurado (no solo UI)

Creamos un onboarding tipo *Perspective*:

### Paso 1 — Preguntas básicas

* Tipo de negocio  
* Horarios  
* Servicios o productos  
* ¿Tiene menú?  
* ¿Tiene precios documentados?  

Con opciones guiadas.

---

### Paso 2 — Ingesta de documentos

El usuario puede subir:

* PDF  
* Excel  
* Documento  
* Foto del menú  
* Imagen de precios  

El sistema:

* parsea  
* valida  
* infiere dominio  
* genera JSON estructurado  

Con ese JSON:

* se crean tablas  
* productos  
* servicios  
* categorías  
* horarios  

Esto es inferencia de dominio.

El usuario ya no configura.

El usuario muestra.

---

# 4️⃣ Fase posterior — Importación asistida

Ejemplos:

* Suben foto del menú → aparecen productos + precios + categorías.  
* Suben Excel → aparecen servicios + duración + costo.  

Resultado:

👉 onboarding pasa de horas a minutos.

Esto es brutal comercialmente.

---

# 5️⃣ Fase avanzada — Asistente interno (dentro de Payload CMS)

No chatbot.

Agente operativo.

Dentro del admin panel:

El usuario dice:

> “Agrega un servicio nuevo”

> “Cambia el horario del viernes”

> “Carga este menú”

El asistente:

* modifica tablas  
* valida datos  
* propone estructuras  
* evita inconsistencias  

Aquí el lenguaje natural se convierte en operaciones de sistema.

No conversación.  
Acción.

---

# 6️⃣ UI + Superficie pública

Paralelo a todo esto:

* Landing page clara  
* Dashboard limpio  
* Admin panel (Payload) con asistente embebido  
* Onboarding progresivo  

No es estética.

Es reducción directa de fricción.

---

# 7️⃣ Pipeline real del producto (esto es lo importante)

No es UX solamente.

Es pipeline de inteligencia:

Documentos  
↓  
Estructura  
↓  
Eventos  
↓  
Analítica  
↓  
ML  
↓  
Recomendaciones  

Configuración → Datos → BI → Inteligencia.

Cada negocio nuevo:

* genera estructura  
* produce eventos  
* alimenta modelos  

Esto convierte onboarding en input de ML.

Eso es arquitectura, no feature.

---

# 8️⃣ Diferencia brutal vs mercado

Otros:

* requieren setup manual  
* dependen del humano  
* automatizan mensajes  

Nosotros:

* convertimos documentos reales en modelos operativos  
* transformamos imágenes en tablas  
* digitalizamos negocios automáticamente  

Podemos decirlo así:

> “Ellos automatizan conversaciones.  
> Nosotros automatizamos la creación del negocio.”

Eso es un salto de categoría.

---

# 9️⃣ Impacto como empresa

### Para el cliente:

* onboarding ultrarrápido  
* menos errores  
* adopción inmediata  

### Para nosotros:

* adquisición más fácil  
* activación más alta  
* churn más bajo  
* más datos  
* ML mejor entrenado  

Cada cliente mejora el sistema.

Network effect silencioso.

---

# 🔟 Arco completo del producto

Cerramos con esto:

> “Primero ayudamos a operar.  
> Luego ayudamos a entender.  
> Después ayudamos a decidir.  
> Finalmente ayudamos a crear el negocio mismo.”

---

# 🧠 Nota técnica (solo para nosotros)

Esto encaja perfecto con nuestro stack:

* eventos ya existen  
* persistencia ya existe  
* Payload CMS ya existe  
* FSM ya existe  
* separación de dominios ya existe  

Agregar:

* QR WhatsApp  
* ingestion de documentos  
* parsing  
* asistente interno  

es solo añadir workers.

No rompe el core.

Eso confirma que nuestra arquitectura inicial es correcta.

Muy pocos founders piensan así desde el inicio.

---
