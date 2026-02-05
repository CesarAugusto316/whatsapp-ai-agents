import type { CollectionConfig } from "payload";

export const QuestionsForReview: CollectionConfig = {
  slug: "questions-for-review",
  labels: {
    singular: { en: "Failed Question", es: "Pregunta Fallida" },
    plural: { en: "Failed Questions", es: "Preguntas Fallidas" },
  },
  access: {
    create: ({ req }) => {
      if (req.user?.collection === "users") {
        return req?.user?.role === "admin";
      }
      if (req.user?.collection === "third-party-access") {
        return true;
      }
    },
    read: async ({ req }) => {
      if (req.user?.collection === "third-party-access") {
        return true;
      }
      // Si el usuario es un administrador, permite el acceso a todos los documentos.
      if (req?.user?.role === "admin") {
        return true;
      }
      // Para usuarios con rol "business", deben poder ver sus negocios
      // Incluso si actualmente no tienen ninguno
      if (req?.user?.role === "business") {
        return {
          or: [
            {
              "general.user": {
                equals: req?.user?.id,
              },
            },
            // Esto asegura que puedan ver la interfaz para crear nuevos
            // cuando no tienen documentos existentes
            {
              id: {
                exists: false, // Condición siempre falsa, pero necesaria para estructura
              },
            },
          ],
        };
      }
      // Para otros roles o usuarios no autenticados
      return false; // o false, según lo que necesites
    },
  },
  timestamps: true,
  fields: [
    {
      name: "customerMessage",
      type: "textarea",
      required: true,
      label: { en: "Customer Message", es: "Mensaje del Cliente" },
    },
    {
      name: "inferredIntent",
      type: "text",
      required: false,
      label: { en: "Inferred Intent", es: "Intent Inferido" },
    },
    {
      name: "inferredAnswer",
      type: "text",
      required: false,
      label: { en: "Inferred Answer", es: "Respuesta Inferida" },
    },
    {
      name: "correctIntent",
      type: "text",
      required: false,
      label: { en: "Correct Intent", es: "Intent Correcto" },
    },
    {
      name: "correctAnswer",
      type: "text",
      required: false,
      label: { en: "Correct Answer", es: "Respuesta Correcta" },
    },
    {
      name: "business",
      type: "relationship",
      relationTo: "businesses",
      required: true,
      label: { en: "Business", es: "Negocio" },
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "customers",
      required: false,
      label: { en: "Customer ID", es: "ID del Cliente" },
    },
    {
      name: "context",
      type: "json",
      required: false,
      label: { en: "Context Info", es: "Información Contextual" },
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Pending Review", value: "pending" },
        { label: "Resolved", value: "resolved" },
      ],
      defaultValue: "pending",
      label: { en: "Status", es: "Estado" },
    },
  ],
  admin: {
    group: { en: "Logs", es: "Registros" },
    useAsTitle: "customerMessage",
  },
};
