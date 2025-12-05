import { CollectionConfig, CollectionSlug } from "payload";
import { Users } from "./Users";

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
  // admin: {
  //   useAsTitle: "name", // header title is taken from "name" field
  // },
  access: {
    create: ({ req }) => {
      return req.user && req.user?.role === "admin";
    },
    read: ({ req }) => {
      // Si el usuario es un administrador, permite el acceso a todos los documentos.
      if (req.user?.role === "admin") {
        return true;
      }
      // Para otros usuarios, devuelve una consulta que filtra los documentos
      // donde el campo 'user' coincide con el ID del usuario actual.
      return {
        user: {
          equals: req.user?.id,
        },
      };
    },
  },
  timestamps: true,
  disableDuplicate: true,
  trash: false,
  fields: [
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
              required: false,
              defaultValue: "+34",
              unique: true,
              minLength: 7,
              maxLength: 20,
              label: {
                en: "Phone Number",
                es: "Número de teléfono",
              },
            },
            {
              type: "checkbox",
              name: "isActive",
              label: { en: "Active", es: "Activo" },
              defaultValue: true,
              admin: {
                description: {
                  en: "Use this field to mark the business as active or inactive. Tell the chatbot to disable it or do it manually here. Use it for holidays, etc.",
                  es: "Indica si el negocio está activo o no. Dile al chatbot que te lo desabilite o hazlo aqui manualmente. Usalo para feriados, etc.",
                },
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
              name: "name",
              type: "text",
              required: true,
              label: { en: "Business Name", es: "Nombre del Negocio" },
            },
            {
              name: "businessType",
              type: "select",
              required: true,
              label: { en: "Business Type", es: "Tipo de Negocio" },
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
              options: [
                {
                  label: { en: "Lima (UTC-5)", es: "Lima (UTC-5)" },
                  value: "America/Lima",
                },
                {
                  label: { en: "New York (UTC-5)", es: "Nueva York (UTC-5)" },
                  value: "America/New_York",
                },
                {
                  label: { en: "London (UTC+0)", es: "Londres (UTC+0)" },
                  value: "Europe/London",
                },
                {
                  label: { en: "Tokyo (UTC+9)", es: "Tokio (UTC+9)" },
                  value: "Asia/Tokyo",
                },
                {
                  label: { en: "Paris (UTC+1)", es: "París (UTC+1)" },
                  value: "Europe/Paris",
                },
                {
                  label: { en: "Madrid (UTC+1)", es: "Madrid (UTC+1)" },
                  value: "Europe/Madrid",
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
            // WORKING HOURS
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
              type: "array",
              name: "dates",
              maxRows: 7,
              minRows: 1,
              label: {
                en: "Working Hours",
                es: "Horario de trabajo",
              },
              labels: {
                plural: {
                  en: "Days",
                  es: "Días",
                },
                singular: {
                  en: "Day",
                  es: "Día",
                },
              },
              admin: {
                isSortable: false,
                // position: "sidebar",
              },
              defaultValue: [
                {
                  // activate: true,
                  startTime: "2000-01-01T08:00:00.000",
                  endTime: "2000-01-01T17:00:00.000",
                },
                {
                  // activate: true,
                  startTime: "2000-01-01T08:00:00.000",
                  endTime: "2000-01-01T17:00:00.000",
                },
                {
                  // activate: true,
                  startTime: "2000-01-01T08:00:00.000",
                  endTime: "2000-01-01T17:00:00.000",
                },
                {
                  // activate: true,
                  startTime: "2000-01-01T08:00:00.000",
                  endTime: "2000-01-01T17:00:00.000",
                },
                {
                  // activate: true,
                  startTime: "2000-01-01T08:00:00.000",
                  endTime: "2000-01-01T17:00:00.000",
                },
                {
                  // activate: true,
                  startTime: "2000-01-01T08:00:00.000",
                  endTime: "2000-01-01T17:00:00.000",
                },
                // {
                //   // activate: true,
                //   startTime: "2000-01-01T08:00:00.000",
                //   endTime: "2000-01-01T17:00:00.000",
                // },
              ],
              // label: () => "Probando",
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
