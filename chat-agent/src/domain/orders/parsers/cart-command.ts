interface CartCommand {
  action: "ADD" | "REMOVE";
  optionNumbers: number[]; // Opciones mostradas (1, 2, 3...)
}

export function parseCartCommand(message: string): CartCommand | null {
  const text = message.toLowerCase().trim();

  // Sinónimos para AGREGAR
  const addPatterns = [
    /\b(agrega?|añade|suma|pon|mete|incluye|quiero|necesito|dame|pásame|envíame|súmale|agrégame)\b/i,
  ];

  // Sinónimos para QUITAR
  const removePatterns = [
    /\b(quita|elimina|saca|borra|remueve|cancela|quite|sácame|no\s+quiero)\b/i,
  ];

  // Detectar acción
  const isAdd = addPatterns.some((p) => p.test(text));
  const isRemove = removePatterns.some((p) => p.test(text));

  if (!isAdd && !isRemove) return null;

  // Extraer números de opciones (1, 2, 3, 4...)
  // Patrones: "opción 1", "la 2", "el 3", "1, 2, 3", "primero", "segundo"
  const optionPatterns = [
    // "opción 1", "opciones 1, 2, 3"
    /opciones?\s*(\d+(?:\s*,\s*\d+)*)/i,

    // "la 1", "el 2", "las 1, 2, 3"
    /(?:la|el|las|los)\s+(\d+(?:\s*,\s*\d+)*)/i,

    // Solo números: "1, 2, 3" o "1 y 2"
    /(\d+(?:\s*,\s*\d+)*(?:\s+y\s+\d+)?)/i,

    // Ordinales: "primero", "segundo", etc.
    /(primero|segundo|tercero|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo)/i,
  ];

  for (const pattern of optionPatterns) {
    const match = text.match(pattern);
    if (match) {
      let numbers: number[] = [];

      if (match[1]) {
        // Caso: números con comas o "y"
        if (match[1].includes(",") || match[1].includes("y")) {
          numbers = match[1]
            .replace(/y/g, ",")
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n));
        } else {
          // Caso: un solo número
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) numbers = [num];
        }
      }

      // Caso: ordinales
      if (match[1] && isNaN(parseInt(match[1], 10))) {
        const ordinals: Record<string, number> = {
          primero: 1,
          segundo: 2,
          tercero: 3,
          cuarto: 4,
          quinto: 5,
          sexto: 6,
          séptimo: 7,
          octavo: 8,
          noveno: 9,
          décimo: 10,
        };
        const num = ordinals[match[1].toLowerCase()];
        if (num) numbers = [num];
      }

      if (numbers.length > 0) {
        return {
          action: isAdd ? "ADD" : "REMOVE",
          optionNumbers: numbers,
        };
      }
    }
  }

  return null;
}
