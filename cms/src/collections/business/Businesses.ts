import { CollectionConfig, Field } from "payload";
import { Users } from "../Users";
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
    // preview: (doc, { req, locale, token }) =>
    //   `${req.protocol}//${req.host}/${doc.slug}`,
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
              // waitUntil: new Date(Date.now() + 60 * 60 * 1_000), // 1 hours from now
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
    /**
     *
     * @todo PARA VENDER PORDUCTOS O SERVICIOS, SE DEBE AGREGAR LA MONEDA Y PAIS MINIMO
     */
    {
      name: "country",
      type: "select",
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
      name: "taxes",
      type: "number",
      label: {
        en: "Taxes",
        es: "Impuestos",
      },
    },
    {
      name: "currency",
      type: "select",
      options: [
        { label: "USD", value: "USD" },
        { label: "MXN", value: "MXN" },
        { label: "PEN", value: "PEN" },
        { label: "EUR", value: "EUR" },
        { label: "GBP", value: "GBP" },
      ],
      label: {
        en: "Currency",
        es: "Moneda",
      },
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
      ],
    },
  ],
};
