import { CollectionConfig, CollectionSlug } from "payload";
import { Users } from "./Users";

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
    useAsTitle: "name",
  },
  timestamps: true,
  disableDuplicate: true,
  trash: false,
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: { en: "Business Name", es: "Nombre del Negocio" },
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
              required: true,
              unique: true,
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
              name: "tables",
              defaultValue: 1,
              admin: {
                condition: (data) =>
                  data?.general?.businessType === "restaurant",
              },
              label: { en: "Tables Number", es: "Número de Mesas" },
              min: 1,
              max: 50,
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
              relationTo: Users.slug as CollectionSlug,
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
                      defaultValue: new Date().toISOString(),
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
                      defaultValue: new Date().toISOString(),
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
              defaultValue: 1,
              min: 1,
              max: 3,
              label: {
                en: "Average appointment Duration (hours)",
                es: "Duración de la reserva en promedio (horas)",
              },
            },
            {
              type: "group",
              fields: [
                {
                  type: "array",
                  name: "monday",
                  label: {
                    en: "Monday",
                    es: "Lunes",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  minRows: 0,
                  maxRows: 2,
                  defaultValue: [
                    {
                      startTime: "2000-01-01T08:00:00.000",
                      endTime: "2000-01-01T12:00:00.000",
                    },
                    {
                      startTime: "2000-01-01T14:00:00.000",
                      endTime: "2000-01-01T20:00:00.000",
                    },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "array",
                  name: "tuesday",
                  minRows: 0,
                  maxRows: 2,
                  label: {
                    en: "Tuesday",
                    es: "Martes",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  defaultValue: [
                    {
                      startTime: "2000-01-01T08:00:00.000",
                      endTime: "2000-01-01T12:00:00.000",
                    },
                    {
                      startTime: "2000-01-01T14:00:00.000",
                      endTime: "2000-01-01T20:00:00.000",
                    },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "array",
                  name: "wednesday",
                  minRows: 0,
                  maxRows: 2,
                  label: {
                    en: "Wednesday",
                    es: "Miércoles",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  defaultValue: [
                    {
                      startTime: "2000-01-01T08:00:00.000",
                      endTime: "2000-01-01T12:00:00.000",
                    },
                    {
                      startTime: "2000-01-01T14:00:00.000",
                      endTime: "2000-01-01T20:00:00.000",
                    },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "array",
                  name: "thursday",
                  minRows: 0,
                  maxRows: 2,
                  label: {
                    en: "Thursday",
                    es: "Jueves",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  defaultValue: [
                    {
                      startTime: "2000-01-01T08:00:00.000",
                      endTime: "2000-01-01T12:00:00.000",
                    },
                    {
                      startTime: "2000-01-01T14:00:00.000",
                      endTime: "2000-01-01T20:00:00.000",
                    },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "array",
                  name: "friday",
                  minRows: 0,
                  maxRows: 2,
                  label: {
                    en: "Friday",
                    es: "Viernes",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  defaultValue: [
                    {
                      startTime: "2000-01-01T08:00:00.000",
                      endTime: "2000-01-01T12:00:00.000",
                    },
                    {
                      startTime: "2000-01-01T14:00:00.000",
                      endTime: "2000-01-01T20:00:00.000",
                    },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "array",
                  name: "saturday",
                  minRows: 0,
                  maxRows: 2,
                  label: {
                    en: "Saturday",
                    es: "Sábado",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  defaultValue: [
                    {
                      startTime: "2000-01-01T08:00:00.000",
                      endTime: "2000-01-01T17:00:00.000",
                    },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "array",
                  name: "sunday",
                  minRows: 0,
                  maxRows: 2,
                  label: {
                    en: "Sunday",
                    es: "Domingo",
                  },
                  labels: {
                    singular: {
                      en: "Block",
                      es: "Bloque",
                    },
                    plural: {
                      en: "Blocks",
                      es: "Bloques",
                    },
                  },
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "startTime",
                          type: "date",
                          label: {
                            en: "Start Time",
                            es: "Hora de inicio",
                          },
                          required: true,
                          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
                            },
                          },
                        },
                        {
                          name: "endTime",
                          type: "date",
                          label: {
                            en: "End Time",
                            es: "Hora de fin",
                          },
                          required: true,
                          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
                          admin: {
                            date: {
                              pickerAppearance: "timeOnly",
                              timeFormat: "HH:mm",
                              displayFormat: "HH:mm",
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
        },
      ],
    },
  ],
};

/**
 *
 * @description Obtén offset actual desde el identificador tz
 * @param timeZone
 * @returns string { 11/29/2025, 7:35:49 PM EST }
 */
export const timeOffset = (timeZone = "America/New_York") =>
  new Date().toLocaleString("en", {
    timeZone,
    timeZoneName: "short",
  });
