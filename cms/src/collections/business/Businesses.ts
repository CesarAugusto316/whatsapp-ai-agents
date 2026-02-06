import { CollectionConfig, Field } from "payload";
import { Users } from "../Users";
import { extractPreciseCoordsFromGoogleLink } from "./geo-location";
import { Business as IBusiness } from "@/payload-types";
// ===== TIME DOMAIN =====

// Un día abstracto
export const DAY_START = 0; // 00:00
export const DAY_END = 23 * 60 + 59; // 1439

// Resolución del sistema (15 min)
export const TIME_STEP = 15;

// Horarios comunes
export const MORNING_BLOCK = {
  open: 8 * 60, // 08:00
  close: 12 * 60, // 12:00
};

export const AFTERNOON_BLOCK = {
  open: 14 * 60, // 14:00
  close: 20 * 60, // 20:00
};

// Sábado típico
export const SATURDAY_BLOCK = {
  open: 8 * 60,
  close: 12 * 60,
};

// Duración de citas (en minutos)
export const APPOINTMENT_MIN = 15;
export const APPOINTMENT_MAX = 8 * 60; // 8 horas
export const APPOINTMENT_DEFAULT = 60; // 1 hora

const timeBlockFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        name: "open",
        type: "number",
        required: true,
        min: DAY_START,
        max: DAY_END,
        admin: {
          step: TIME_STEP,
        },
        label: {
          en: "Open Time",
          es: "Hora de apertura",
        },
      },
      {
        name: "close",
        type: "number",
        required: true,
        min: DAY_START,
        max: DAY_END,
        admin: {
          step: TIME_STEP,
        },
        label: {
          en: "End Time",
          es: "Hora de cierre",
        },
      },
    ],
  },
];

const workDay = (
  name: string,
  label: { en: string; es: string },
  defaultBlocks: { open: number; close: number }[] = [],
): Field => ({
  type: "array",
  name,
  label,
  labels: {
    singular: { en: "Block", es: "Bloque" },
    plural: { en: "Blocks", es: "Bloques" },
  },
  minRows: 0,
  maxRows: 2,
  defaultValue: () => defaultBlocks,
  fields: timeBlockFields,
});

// TODO: NORMALIZE DATES
export const Business: CollectionConfig = {
  slug: "businesses",
  labels: {
    singular: {
      en: "Business",
      es: "Negocio",
    },
    plural: {
      en: "Businesses",
      es: "Negocios",
    },
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
  admin: {
    // livePreview: {
    //   url: "http://localhost:3001/admin/collections/businesses/f66f4929-72b0-4a49-8b48-7b19eb784aaa",
    // },
    group: {
      en: "My businesses",
      es: "Mis negocios",
    },
    enableRichTextLink: true,
    defaultColumns: [
      "name",
      "assistantName",
      "general.maxCapacity",
      "general.nextHoliday",
    ],
    hideAPIURL: true,
    useAsTitle: "name",
  },
  timestamps: true,
  disableDuplicate: true,
  trash: false,
  hooks: process.env.IS_CLI
    ? undefined
    : {
        beforeChange: [
          async ({ data }) => {
            // lets process coordinates here
            const url = data.general.shortUrlVirtual;
            if (!url) return data;
            const coords = await extractPreciseCoordsFromGoogleLink(url);
            if (!coords) return data;
            return {
              ...data,
              general: {
                ...data.general,
                location: [coords.longitude, coords.latitude],
              },
            } satisfies Partial<IBusiness>;
          },
        ],
        afterChange: [
          async ({ doc, operation, req }) => {
            await req.payload.jobs.queue({
              task: "semanticSync",
              input: {
                docId: doc.id,
                collection: "businesses",
                businessId: doc.id,
                operation: operation, // create | update
              },
              queue: "oneMinute",
            });
            return doc;
          },
        ],
        afterDelete: [
          async ({ doc, req }) => {
            await req.payload.jobs.queue({
              task: "semanticSync",
              input: {
                docId: doc.id,
                collection: "businesses",
                businessId: doc.id,
                operation: "delete",
              },
              queue: "oneMinute",
            });
            return doc;
          },
        ],
      },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: { en: "Business Name", es: "Nombre del Negocio" },
    },
    {
      name: "assistantName",
      type: "text",
      required: true,
      label: { en: "AI Assistant's Name", es: "Nombre del Asistente de IA" },
      admin: {
        placeholder: {
          en: "Enter AI Assistant's Name",
          es: "Ingrese el nombre del Asistente de IA",
        },
      },
    },

    {
      type: "row",
      fields: [
        {
          name: "currency",
          type: "select",
          options: [
            { label: "USD", value: "USD" },
            { label: "EUR", value: "EUR" },
            { label: "GBP", value: "GBP" },
            { label: "JPY", value: "JPY" },
            { label: "CAD", value: "CAD" },
            { label: "MXN", value: "MXN" },
            { label: "COL", value: "COL" },
            { label: "PEN", value: "PEN" },
          ],
          label: {
            en: "Currency",
            es: "Moneda",
          },
        },
        {
          name: "taxes",
          type: "number",
          label: {
            en: "Taxes",
            es: "Impuestos/IVA",
          },
        },
      ],
    },

    {
      type: "tabs",
      tabs: [
        {
          name: "general",
          label: {
            en: "General Information",
            es: "Información General",
          },
          fields: [
            {
              name: "phoneNumber",
              type: "text",
              defaultValue: "+34",
              minLength: 7,
              maxLength: 20,
              label: {
                en: "Phone Number",
                es: "Número de teléfono",
              },
            },
            {
              type: "checkbox",
              name: "requireAppointmentApproval",
              label: {
                en: "Require Appointment Approval",
                es: "Requiere Aprobación de Citas",
              },
              defaultValue: true,
              admin: {
                description: {
                  en: "Use this field to indicate whether the business requires appointment approval or not. Tell the chatbot to disable it or do it manually here.",
                  es: "Usa este campo para indicar si el negocio requiere aprobación de citas o no. Dile al chatbot que te lo desabilite o hazlo aqui manualmente.",
                },
              },
            },
            {
              name: "businessType",
              type: "select",
              required: true,
              label: { en: "Business Type", es: "Tipo de Negocio" },
              defaultValue: "restaurant",
              options: [
                {
                  label: { en: "Restaurant", es: "Restaurante" },
                  value: "restaurant",
                },
                { label: { en: "Medical", es: "Médico" }, value: "medical" },
                { label: { en: "Legal", es: "Legal" }, value: "legal" },
                {
                  label: { en: "Real Estate", es: "Bienes Raíces" },
                  value: "real_estate",
                },
              ],
            },
            {
              type: "number",
              name: "maxCapacity",
              defaultValue: 10,
              required: true,
              admin: {
                condition: (data) =>
                  data?.general?.businessType === "restaurant",
              },
              label: {
                en: "Maximum capacity",
                es: "Capacidad máxima de asistentes",
              },
              min: 1,
              max: 500,
            },
            {
              type: "textarea",
              name: "description",
              label: { en: "Description", es: "Descripción" },
              admin: {
                placeholder: {
                  en: "Enter a description",
                  es: "Ingrese una descripción",
                },
              },
              minLength: 0,
              maxLength: 5000,
            },
            {
              name: "user",
              type: "relationship",
              label: {
                en: "Owner",
                es: "Propietario",
              },
              relationTo: "users",
              filterOptions: ({ relationTo }) => {
                if (relationTo === Users.slug) {
                  return {
                    role: {
                      equals: "business", // only users with role "business" are allowed
                    },
                  };
                }
              },
              admin: {
                allowEdit: false,
                allowCreate: true,
              },
              access: {
                update: () => false,
              },
              required: true,
            },
            {
              name: "timezone",
              type: "select",
              required: true,
              label: { en: "Timezone", es: "Zona Horaria" },
              defaultValue: "Europe/Madrid",
              options: [
                {
                  label: { en: "Madrid (UTC+1)", es: "Madrid (UTC+1)" },
                  value: "Europe/Madrid",
                },
                {
                  label: { en: "Paris (UTC+1)", es: "París (UTC+1)" },
                  value: "Europe/Paris",
                },
                {
                  label: { en: "London (UTC+0)", es: "Londres (UTC+0)" },
                  value: "Europe/London",
                },
                {
                  label: { en: "Lima (UTC-5)", es: "Lima (UTC-5)" },
                  value: "America/Lima",
                },
                {
                  label: { en: "New York (UTC-5)", es: "Nueva York (UTC-5)" },
                  value: "America/New_York",
                },
                {
                  label: { en: "Tokyo (UTC+9)", es: "Tokio (UTC+9)" },
                  value: "Asia/Tokyo",
                },
              ],
            },
            {
              type: "checkbox",
              name: "isActive",
              label: { en: "Active", es: "Activo" },
              defaultValue: true,
              admin: {
                description: {
                  en: "Use this field to mark the business as active or inactive. Tell the chatbot to disable it or do it manually here. Use it for holidays, etc.",
                  es: "Indica si el negocio está activo o no. Dile al chatbot que te lo desabilite o hazlo aqui manualmente. Usalo para vaciones de ultimo minuto, etc.",
                },
              },
            },

            /**
             *
             * @todo PARA VENDER PORDUCTOS O SERVICIOS, SE DEBE AGREGAR LA MONEDA Y PAIS MINIMO
             */
            {
              name: "country",
              type: "select",
              admin: {
                hidden: true,
              },
              label: {
                en: "Country",
                es: "País",
              },
              options: [
                { label: "España", value: "ES" },
                { label: "Colombia", value: "COL" },
                { label: "México", value: "MEX" },
                { label: "Perú", value: "PE" },
                { label: "Ecuador", value: "EC" },
                { label: "EEUU", value: "US" },
                { label: "Canada", value: "CA" },
              ],
            },
            {
              name: "address",
              type: "text",
              label: {
                en: "Address",
                es: "Dirección",
              },
              admin: {
                placeholder: {
                  en: "Write your business address",
                  es: "Escribe tu dirección de negocio",
                },
              },
            },
            {
              name: "embedMap",
              type: "text",
              label: {
                en: "Embed Google Map",
                es: "Mapa de Google embebido",
              },
              admin: {
                hidden: true,
                placeholder: {
                  en: "Write your embed map code",
                  es: "Pega tu código de google maps aquí",
                },
              },
            },

            {
              virtual: true,
              name: "shortUrlVirtual", // required
              type: "text", // required
              label: {
                en: "Short URL from Google Maps",
                es: "URL de Google Maps",
              },
              admin: {
                placeholder: {
                  en: "Paste your google map url to generate coordinates",
                  es: "Pega tu url de google maps aquí para generar coordenadas",
                },
              },
            },
            {
              // EXAMPLE TO USE IT
              // POST /api/sendLocation
              // {
              //   "chatId": "11111111111@c.us",
              //   "latitude": 38.8937255,
              //   "longitude": -77.0969763,
              //   "title": "Our office",
              //   "session": "default"
              // }
              name: "location",
              type: "point", // need to install postgres gis extension
              label: {
                en: "Location",
                es: "Ubicación",
              },
              admin: {
                readOnly: true,
                placeholder: {
                  en: "Write your business location",
                  es: "Escribe tu ubicación de negocio",
                },
              },
            },
            {
              name: "map", // required
              type: "ui", // required
              admin: {
                components: {
                  Field: "./components/map.tsx",
                  // Cell: "/path/to/MyCustomUICell", how is rendered in the table
                },
              },
            },

            {
              type: "array",
              name: "nextHoliday",
              label: {
                en: "Next Holiday",
                es: "Vacaciones próximas",
              },
              labels: {
                singular: {
                  en: "Holiday",
                  es: "Vacaciones",
                },
                plural: {
                  en: "Holidays",
                  es: "Vacaciones",
                },
              },
              minRows: 0,
              maxRows: 2,
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "startDate",
                      type: "date",
                      label: {
                        en: "Start Date",
                        es: "Fecha de inicio",
                      },
                      required: true,
                      defaultValue: () => new Date().toISOString(),
                      admin: {
                        date: {
                          pickerAppearance: "dayOnly",
                        },
                      },
                    },
                    {
                      name: "endDate",
                      type: "date",
                      label: {
                        en: "End Date",
                        es: "Fech de fin",
                      },
                      required: true,
                      defaultValue: () => new Date().toISOString(),
                      admin: {
                        date: {
                          pickerAppearance: "dayOnly",
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "schedule",
          label: {
            en: "Working Hours",
            es: "Horario de trabajo",
          },
          fields: [
            {
              name: "averageTime",
              type: "number",
              required: true,
              defaultValue: APPOINTMENT_DEFAULT,
              min: APPOINTMENT_MIN,
              max: APPOINTMENT_MAX,
              label: {
                en: "Minimal appointment duration (minutes)",
                es: "Duración mínima de la reserva (minutos)",
              },
            },
            {
              type: "group",
              fields: [
                workDay("monday", { en: "Monday", es: "Lunes" }, [
                  MORNING_BLOCK,
                  AFTERNOON_BLOCK,
                ]),
                workDay("tuesday", { en: "Tuesday", es: "Martes" }, [
                  MORNING_BLOCK,
                  AFTERNOON_BLOCK,
                ]),
                workDay("wednesday", { en: "Wednesday", es: "Miércoles" }, [
                  MORNING_BLOCK,
                  AFTERNOON_BLOCK,
                ]),
                workDay("thursday", { en: "Thursday", es: "Jueves" }, [
                  MORNING_BLOCK,
                  AFTERNOON_BLOCK,
                ]),
                workDay("friday", { en: "Friday", es: "Viernes" }, [
                  MORNING_BLOCK,
                  AFTERNOON_BLOCK,
                ]),
                workDay("saturday", { en: "Saturday", es: "Sábado" }, [
                  SATURDAY_BLOCK,
                ]),
                workDay("sunday", { en: "Sunday", es: "Domingo" }),
              ],
            },
          ],
        },
        {
          name: "faq",
          label: {
            en: "FAQ",
            es: "Preguntas Frecuentes",
          },
          fields: [
            {
              name: "forFaq",
              label: { en: "Add Question", es: "Agregar Pregunta" },
              type: "array",
              admin: {
                description: {
                  en: "FAQ questions",
                  es: "Preguntas frecuentes",
                },
              },
              fields: [
                {
                  name: "question",
                  label: { en: "Question", es: "Pregunta" },
                  type: "text",
                },
                {
                  name: "answer",
                  label: { en: "Answer", es: "Respuesta" },
                  type: "text",
                },
              ],
            },
          ],
        },
        // questions-for-review
        {
          name: "questions-for-review",
          admin: {
            description: {
              en: "Questions that need to be reviewed by an admin",
              es: "Preguntas que necesitan ser revisadas por un administrador",
            },
          },
          label: {
            en: "Questions for Review",
            es: "Preguntas para Revisión",
          },
          fields: [
            {
              name: "toReview",
              label: { en: "Question", es: "Pregunta" },
              type: "array",
              fields: [
                {
                  name: "customerRealquestion",
                  label: {
                    en: "Question from Customer",
                    es: "Pregunta del cliente",
                  },
                  type: "text",
                  admin: {
                    description: {
                      en: "The question asked by the customer",
                      es: "La pregunta realizada por el cliente",
                    },
                    readOnly: true,
                  },
                },
                {
                  name: "agentAnswer",
                  label: { en: "Agent Answer", es: "Respuesta del agente" },
                  type: "text",
                  admin: {
                    description: {
                      en: "The answer provided by the agent",
                      es: "La respuesta proporcionada por el agente",
                    },
                    readOnly: true,
                  },
                },
                {
                  name: "correctAnswer",
                  label: { en: "Correct Answer", es: "Respuesta correcta" },
                  type: "text",
                  admin: {
                    description: {
                      en: "The correct answer to the question",
                      es: "La respuesta correcta a la pregunta",
                    },
                  },
                },
                {
                  name: "approved",
                  label: { en: "Approved", es: "Aprobada" },
                  type: "checkbox",
                  defaultValue: false,
                  admin: {
                    description: {
                      en: "Mark this question as approved. Upon saving, it will move to the FAQ tab.",
                      es: "Marca esta pregunta como aprobada. Al guardar, se moverá a la pestaña FAQ.",
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
