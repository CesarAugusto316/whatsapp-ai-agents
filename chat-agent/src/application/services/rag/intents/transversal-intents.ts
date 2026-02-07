import { SemanticIntent } from "@/application/services/rag";

export type TransversalIntentKey =
  | "ask_location"
  | "ask_pricing"
  | "ask_business_hours"
  | "confirm"
  | "greeting"
  | "reject"
  | "goodbye";

/**
 * Intents globales, vectorizados una sola vez.
 * Todos los dominios pueden reutilizarlos.
 */
export const transversalIntents: SemanticIntent<TransversalIntentKey>[] = [
  {
    intent: "greeting",
    domain: "transversal",
    lang: "es",
    examples: [
      "hola",
      "buenas",
      "buen día",
      "qué tal",
      "buenas noches",
      "buenas tardes",
      "saludos",
      "hello",
      "hi",
    ],
  },
  {
    intent: "goodbye",
    domain: "transversal",
    lang: "es",
    examples: ["hasta luego", "nos vemos", "chau", "adiós", "hasta pronto"],
  },
  {
    intent: "ask_pricing",
    domain: "transversal",
    lang: "es",
    examples: [
      "cuánto cuesta",
      "precio",
      "tarifas",
      "valor",
      "cuánto vale",
      "costo",
      "costo de",
      "cual es el total",
      "total de",
    ],
  },
  {
    intent: "ask_location",
    domain: "transversal",
    lang: "es",
    examples: [
      "dónde queda",
      "dirección",
      "ubicación",
      "cómo llegar",
      "donde esta el negocio",
      "donde esta ubicado",
    ],
  },
  {
    intent: "ask_business_hours",
    domain: "transversal",
    lang: "es",
    examples: [
      "a qué hora abren",
      "a qué hora cierran",
      "cuál es el horario",
      "están abiertos hoy",
      "horario de atención",
      "denme los horarios",
      "desde que hora trabajan",
      "hasta que hora trabajan",
      "trabajan en feriados",
    ],
  },
  {
    intent: "confirm",
    domain: "transversal",
    lang: "es",
    examples: [
      "sí confirmo",
      "confirmado",
      "dale",
      "perfecto",
      "ok",
      "está bien",
      "claro que sí",
      "vamos",
      "sí por favor",
    ],
  },
  {
    intent: "reject",
    domain: "transversal",
    lang: "es",
    examples: [
      "no",
      "no deseo",
      "ya no quiero",
      "claro que no",
      "no gracias",
      "no nunca más",
    ],
  },
];
