### Arquitectura Detallada (ASCII)

```

      ┌─────────────────────────────────────────────────────────────────────────────┐
      │                         TYPE SCRIPT (Runtime - Producción)                  │
      │  ┌───────────────────────────────────────────────────────────────────────┐ │
      │  │                         POLICY ENGINE                                 │ │
      │  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │ │
      │  │  │ Reglas          │  │ Contexto         │  │ ONNX Runtime        │  │ │
      │  │  │ Deterministas   │  │ Usuario          │  │ (inferencia)        │  │ │
      │  │  │ (control)       │◄─┤ + Contexto       │◄─┤ - intent_classifier │  │ │
      │  │  │                 │  │ Agregado         │  │ - product_recommender│  │ │
      │  │  │                 │  │ (temporada)      │  │ - action_scorer     │  │ │
      │  │  └─────────────────┘  └──────────────────┘  └─────────────────────┘  │ │
      │  └───────────────────────────────────────────────────────────────────────┘ │
      │           │                  │                   │                          │
      │           ▼                  ▼                   ▼                          │
      │  ┌───────────────────────────────────────────────────────────────────────┐ │
      │  │                      BELIEF STATE UPDATER                             │ │
      │  │  - Umbrales de confianza                                              │ │
      │  │  - Señales (confirmado/rechazado/incierto)                            │ │
      │  │  - Historial de intenciones                                           │ │
      │  └───────────────────────────────────────────────────────────────────────┘ │
      └─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ (lectura/escritura)
                                          ▼
      ┌─────────────────────────────────────────────────────────────────────────────┐
      │                              POSTGRESQL                                     │
      │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
      │  │ user_profiles    │  │ interaction_logs │  │ seasonal_patterns        │  │
      │  │ - preferences    │  │ - belief_snapshot│  │ - season                 │  │
      │  │ - history_summary│  │ - decision       │  │ - segment                │  │
      │  │ - segment        │  │ - outcome        │  │ - likely_intent          │  │
      │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
      │  ┌──────────────────┐  ┌──────────────────┐                                │
      │  │ user_segments    │  │ product_catalog  │                                │
      │  │ - user_id        │  │ - category       │                                │
      │  │ - segment        │  │ - seasonal_tags  │                                │
      │  └──────────────────┘  └──────────────────┘                                │
      └─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ (ETL offline - diario/semanal)
                                          ▼
      ┌─────────────────────────────────────────────────────────────────────────────┐
      │                         PYTHON (Offline - Entrenamiento)                    │
      │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
      │  │ pandas           │  │ scikit-learn     │  │ sklearn-onnx             │  │
      │  │ (carga/limpieza) │  │ (entrenamiento)  │  │ (exportación)            │  │
      │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
      │                                    │                                        │
      │                                    ▼                                        │
      │  ┌───────────────────────────────────────────────────────────────────────┐ │
      │  │                      MODELOS EXPORTADOS (.onnx)                       │ │
      │  │  - intent_classifier.onnx                                             │ │
      │  │  - product_recommender.onnx                                           │ │
      │  │  - action_scorer.onnx                                                 │ │
      │  └───────────────────────────────────────────────────────────────────────┘ │
      │                                    │                                        │
      │                                    ▼                                        │
      │  ┌───────────────────────────────────────────────────────────────────────┐ │
      │  │                      DESPLIEGUE A PRODUCCIÓN                          │ │
      │  │  - Copia archivos .onnx al agente TypeScript                          │ │
      │  │  - Opcional: versionado con hash (v1.2.3.onnx)                        │ │
      │  └───────────────────────────────────────────────────────────────────────┘ │
      └─────────────────────────────────────────────────────────────────────────────┘

```

---

### ¿Por qué scikit-learn y NO PyTorch/TensorFlow?

| Criterio | scikit-learn | PyTorch / TensorFlow |
|----------|--------------|---------------------|
| **Curva de aprendizaje** | ✅ Horas (API intuitiva) | ❌ Semanas/meses (tensores, GPUs, debugging) |
| **Documentación** | ✅ Referencia mundial, ejemplos para todo | ✅ Buena, pero más dispersa |
| **Interpretabilidad** | ✅ Árboles, reglas, coeficientes visibles | ❌ Caja negra (redes neuronales) |
| **Auditabilidad** | ✅ Puedes explicar cada predicción | ❌ Difícil de auditar en producción |
| **Requisitos de datos** | ✅ Funciona con cientos/miles de filas | ❌ Necesita miles/millones para brillar |
| **Exportación a ONNX** | ✅ `sklearn-onnx` maduro y estable | ✅ Disponible, pero más complejo |
| **Soporte/comunidad** | ✅ 60k+ stars, estándar en industria | ✅ 70k+ stars, más académico/research |
| **Mantenimiento** | ✅ Estable, sin breaking changes frecuentes | ❌ Cambios rápidos, versiones incompatibles |
| **Tu caso de uso** | ✅ Clasificación, regresión, clustering | ❌ Overkill (deep learning no necesario) |

---

### Stack Completo Recomendado (Librerías con Soporte Masivo)

```

      ┌─────────────────────────────────────────────────────────────────┐
      │                    PYTHON (Entrenamiento)                       │
      ├─────────────────────────────────────────────────────────────────┤
      │  Librería          │ Stars  │ Uso                              │
      ├────────────────────┼────────┼──────────────────────────────────┤
      │  scikit-learn      │ 60k+   │ Modelos ML clásicos              │
      │  pandas            │ 40k+   │ Manipulación de datos            │
      │  SQLAlchemy        │ 6k+    │ Conexión a PostgreSQL            │
      │  sklearn-onnx      │ 1k+    │ Exportar modelos a ONNX          │
      │  onnxruntime       │ 8k+    │ Validar modelos antes de exportar│
      │  pytest            │ 10k+   │ Tests del pipeline               │
      └─────────────────────────────────────────────────────────────────┘
      
      ┌─────────────────────────────────────────────────────────────────┐
      │                    TYPE SCRIPT (Producción)                     │
      ├─────────────────────────────────────────────────────────────────┤
      │  Librería          │ Stars  │ Uso                              │
      ├────────────────────┼────────┼──────────────────────────────────┤
      │  onnxruntime-node  │ 8k+    │ Inferencia de modelos .onnx      │
      │  pg / node-postgres│ 10k+   │ Conexión a PostgreSQL            │
      │  jest              │ 28k+   │ Tests del PolicyEngine           │
      └─────────────────────────────────────────────────────────────────┘

```

---

### ¿Cuándo SÍ usar PyTorch?

Solo si en el futuro necesitas:

```
❌ NO lo necesitas hoy:
   - Clasificar intenciones (scikit-learn basta)
   - Recomendar productos (filtrado colaborativo clásico funciona)
   - Predecir comportamiento temporal (regresión/series de tiempo)

✅ Considera PyTorch solo si:
   - Necesitas procesar texto crudo sin embeddings preentrenados
   - Tienes millones de interacciones y scikit-learn no escala
   - Requieres arquitecturas específicas (transformers, LSTM, etc.)
   - Tu equipo tiene expertise en deep learning
```

---

### Flujo de Trabajo Concreto (Ejemplo: Predecir Intención)

```
      ┌─────────────────────────────────────────────────────────────────────┐
      │  PASO 1: Python entrena modelo (offline, ej: diario)                │
      ├─────────────────────────────────────────────────────────────────────┤
      │  from sklearn.ensemble import RandomForestClassifier               │
      │  from skl2onnx import convert_sklearn, update_registered_converter │
      │                                                                     │
      │  # 1. Cargar datos desde PostgreSQL                                │
      │  df = pd.read_sql("SELECT * FROM interaction_logs", conn)          │
      │                                                                     │
      │  # 2. Preparar features                                            │
      │  X = df[['user_segment', 'hour_of_day', 'day_of_week', 'season']]  │
      │  y = df['likely_intent']                                           │
      │                                                                     │
      │  # 3. Entrenar                                                     │
      │  model = RandomForestClassifier(n_estimators=100)                  │
      │  model.fit(X, y)                                                   │
      │                                                                     │
      │  # 4. Exportar a ONNX                                              │
      │  onnx_model = convert_sklearn(model, 'intent_classifier', ...)     │
      │  with open('intent_classifier.onnx', 'wb') as f:                   │
      │      f.write(onnx_model.SerializeToString())                       │
      └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
      ┌─────────────────────────────────────────────────────────────────────┐
      │  PASO 2: Despliegue (CI/CD o manual)                                │
      ├─────────────────────────────────────────────────────────────────────┤
      │  cp intent_classifier.onnx /agent/models/                          │
      │  # Opcional: versionado v1.2.3.intent_classifier.onnx              │
      └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
      ┌─────────────────────────────────────────────────────────────────────┐
      │  PASO 3: TypeScript inferencia (runtime, <10ms)                     │
      ├─────────────────────────────────────────────────────────────────────┤
      │  import { InferenceSession } from 'onnxruntime-node';              │
      │                                                                     │
      │  const session = await InferenceSession.create('./model.onnx');    │
      │  const results = await session.run({                               │
      │    user_segment: [segment],                                        │
      │    hour_of_day: [hour],                                            │
      │    day_of_week: [day],                                             │
      │    season: [season]                                                │
      │  });                                                               │
      │                                                                     │
      │  // Usar resultado en PolicyEngine (ajustar scores, no decidir)    │
      └─────────────────────────────────────────────────────────────────────┘
```

---

### Conclusión Directa

| Pregunta | Respuesta |
|----------|-----------|
| **¿scikit-learn o PyTorch?** | scikit-learn (tu caso es clasificación, no deep learning) |
| **¿Por qué?** | Más simple, interpretable, auditable, suficiente para tus datos |
| **¿Cuándo cambiar?** | Solo si tienes millones de interacciones y necesitas arquitecturas complejas |
| **¿Librerías clave?** | scikit-learn + pandas + sklearn-onnx (Python) / onnxruntime-node (TS) |
| **¿Tu código actual?** | Ya está diseñado correctamente. Solo añade `userContext` + `aggregateContext` a `BeliefState` |

**Tu arquitectura es sólida.** scikit-learn es la elección pragmática: comunidad masiva, documentación excelente, y se alinea con tu filosofía de control explícito y auditabilidad.

¿Quieres que definamos el primer modelo concreto a entrenar (ej: `intent_classifier` con features temporales) y su integración en tu `PolicyEngine`? Puedo ser breve y solo mostrar la estructura, sin código innecesario.
