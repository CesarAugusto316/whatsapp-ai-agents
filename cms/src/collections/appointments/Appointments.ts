import type { CollectionConfig, CollectionSlug } from "payload";
import { Business } from "../Businesses";
import { Customers } from "../Costumers";
import { Appointment, Business as IBusiness } from "@/payload-types";
import {
  AppointmentSlot,
  AvailabilityRequest,
  AvailabilityResponse,
  calculateAvailability,
  suggestAlternativeTimes,
} from "./check-availability";

// TODO: NORMALIZE DATES
export const Appointments: CollectionConfig = {
  slug: "appointments",
  labels: {
    singular: {
      en: "Reservation",
      es: "Reservación",
    },
    plural: {
      en: "Reservations",
      es: "Reservaciones",
    },
  },
  admin: {
    useAsTitle: "customerName", // header title is taken from "name" field
  },
  timestamps: true,
  access: {
    create: ({ req }) => {
      if (req.user?.collection === "third-party-access") {
        return true;
      }
      if (req?.user?.collection === "users") {
        return req?.user?.role === "admin";
      }
    }, // bot
    // Función read corregida:
    read: async ({ req }) => {
      if (req?.user?.collection === "third-party-access") {
        return true;
      }
      const { user } = req;
      if (user?.collection === "users") {
        if (user?.role === "admin") {
          return true;
        }
        if (user?.role === "business") {
          // En lugar de hacer una consulta, filtramos por "negocios del usuario actual"
          // Esto requiere que la relación "business" esté configurada correctamente
          return {
            or: [
              {
                // Filtra por negocios que tengan este usuario como propietario
                // (Requiere que Payload pueda hacer joins en las queries)
                "business.general.user": {
                  equals: user.id,
                },
              },
              // Permite ver interfaz aunque no tenga citas
              {
                id: {
                  exists: false,
                },
              },
            ],
          };
        }
      }
      return false;
    },
  },
  endpoints: [
    {
      path: "/check-availability",
      method: "get",
      handler: async (req) => {
        try {
          const { businessId, startDateTime, endDateTime, numberOfPeople } =
            req.query as unknown as AvailabilityRequest;

          // Validar parámetros requeridos
          if (!businessId || !startDateTime) {
            return Response.json(
              {
                success: false,
                message: "Se requiere businessId y startDateTime",
              },
              { status: 400 },
            );
          }

          // Obtener el negocio
          const business: IBusiness = await req.payload.findByID({
            collection: "businesses",
            id: businessId,
          });

          if (!business) {
            return Response.json(
              {
                success: false,
                message: "Negocio no encontrado",
              },
              { status: 404 },
            );
          }

          const maxCapacityPerHour = business.general.tables || 20;

          // Parsear fechas (Payload usa UTC)
          const startDate = new Date(startDateTime);
          const endDate = endDateTime
            ? new Date(endDateTime)
            : new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora por defecto

          // Obtener reservas existentes para el rango solicitado
          // Necesitamos un rango más amplio para calcular superposiciones correctamente
          const searchStart = new Date(startDate);
          searchStart.setHours(searchStart.getHours() - 1); // Incluir 1 hora antes
          searchStart.setMinutes(0, 0, 0);

          const searchEnd = new Date(endDate);
          searchEnd.setHours(searchEnd.getHours() + 1); // Incluir 1 hora después
          searchEnd.setMinutes(0, 0, 0);

          const existingAppointments: { docs: Appointment[] } =
            await req.payload.find({
              collection: "appointments",
              where: {
                and: [
                  {
                    business: {
                      equals: businessId,
                    },
                  },
                  {
                    status: {
                      in: ["confirmed", "pending"],
                    },
                  },
                  {
                    startDateTime: {
                      // less_than_equal: searchEnd.toISOString(), // UTC
                      greater_than_equal: searchStart.toISOString(), // UTC
                    },
                  },
                  {
                    or: [
                      {
                        endDateTime: {
                          // greater_than_equal: searchStart.toISOString(), // UTC
                          less_than_equal: searchEnd.toISOString(), // UTC
                        },
                      },
                      {
                        endDateTime: {
                          equals: null,
                        },
                      },
                    ],
                  },
                ],
              },
              limit: 1000,
            });

          // Convertir a formato AppointmentSlot para usar la lógica pura
          const appointmentSlots: AppointmentSlot[] =
            existingAppointments.docs.map((doc) => ({
              startDateTime: doc.startDateTime,
              endDateTime: doc.endDateTime || undefined,
              numberOfPeople: doc.numberOfPeople || 0,
              status: doc.status,
            }));

          // Calcular disponibilidad usando la función pura
          const { timeSlots, isFullyAvailable } = calculateAvailability(
            appointmentSlots,
            maxCapacityPerHour,
            startDate,
            endDate,
            numberOfPeople,
          );

          // Si no hay disponibilidad, obtener más datos para sugerencias
          let suggestedTimes: string[] = [];
          if (!isFullyAvailable && numberOfPeople) {
            // Obtener más reservas para las próximas horas para sugerencias
            const endDateForSuggestions = new Date(
              startDate.getTime() + 5 * 60 * 60 * 1000,
            ); // +5 horas

            const appointmentsForSuggestions: { docs: Appointment[] } =
              await req.payload.find({
                collection: "appointments",
                where: {
                  and: [
                    {
                      business: {
                        equals: businessId,
                      },
                    },
                    {
                      status: {
                        in: ["confirmed", "pending"],
                      },
                    },
                    {
                      startDateTime: {
                        greater_than_equal: startDate.toISOString(),
                      },
                    },
                    {
                      startDateTime: {
                        less_than_equal: endDateForSuggestions.toISOString(),
                      },
                    },
                  ],
                },
                limit: 1000,
              });

            const allAppointmentSlots: AppointmentSlot[] =
              appointmentsForSuggestions.docs.map((doc) => ({
                startDateTime: doc.startDateTime,
                endDateTime: doc.endDateTime || undefined,
                numberOfPeople: doc.numberOfPeople || 0,
                status: doc.status,
              }));

            // Usar función pura para sugerencias
            suggestedTimes = suggestAlternativeTimes(
              allAppointmentSlots,
              maxCapacityPerHour,
              startDate,
              numberOfPeople,
            );
          }

          const response: AvailabilityResponse = {
            success: true,
            businessId,
            requestedStart: startDate.toISOString(),
            requestedEnd: endDate.toISOString(),
            requestedPeople: numberOfPeople,
            totalCapacityPerHour: maxCapacityPerHour,
            availableSlotsPerHour: timeSlots,
            isFullyAvailable,
            suggestedTimes,
          };

          return Response.json(response, { status: 200 });
        } catch (error) {
          console.error("Error checking availability:", error);
          return Response.json(
            {
              success: false,
              message: "Error al verificar disponibilidad",
              error: (error as Error).message,
            },
            { status: 500 },
          );
        }
      },
    },
  ],
  fields: [
    // businessId
    {
      name: "business",
      type: "relationship",
      index: true,
      label: {
        en: "Business",
        es: "Negocio",
      },
      admin: {
        readOnly: true,
      },
      required: true,
      relationTo: Business.slug as CollectionSlug,
      access: {
        update: ({ req }) => {
          if (req?.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" && req?.user?.role === "admin"
          );
        },
      },
    },
    // customerId
    {
      name: "customer",
      index: true,
      type: "relationship",
      admin: {
        readOnly: true,
      },
      label: {
        en: "Customer",
        es: "Cliente",
      },
      required: true,
      relationTo: Customers.slug as CollectionSlug,
      access: {
        update: ({ req }) => {
          if (req.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" && req?.user?.role === "admin"
          );
        },
      },
    },
    // customerName
    {
      name: "customerName",
      access: {
        update: ({ req }) => {
          if (req?.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" &&
            (req?.user?.role === "admin" || req?.user?.role === "business")
          );
        },
      },
      type: "text",
      label: { en: "Customer Name", es: "A nombre de" },
    },
    // time: startDateTime - endDateTime
    {
      type: "row",
      fields: [
        {
          name: "startDateTime",
          index: true,
          type: "date",
          label: {
            en: "Start Time",
            es: "Hora de inicio",
          },
          required: true,
          access: {
            update: ({ req }) => {
              if (req?.user?.collection === "third-party-access") {
                return true;
              }
              return (
                req?.user?.collection === "users" &&
                (req?.user?.role === "admin" || req?.user?.role === "business")
              );
            },
          },
          admin: {
            date: {
              pickerAppearance: "timeOnly",
              timeFormat: "HH:mm",
              displayFormat: "HH:mm",
            },
          },
        },
        {
          name: "endDateTime",
          index: true,
          type: "date",
          label: {
            en: "End Time",
            es: "Hora de fin",
          },
          required: false,
          access: {
            update: ({ req }) => {
              if (req?.user?.collection === "third-party-access") {
                return true;
              }
              return (
                req?.user?.collection === "users" &&
                (req?.user?.role === "admin" || req?.user?.role === "business")
              );
            },
          },
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
    // status
    {
      name: "status",
      type: "select",
      label: {
        en: "Status",
        es: "Estado",
      },
      required: true,
      defaultValue: "pending",
      access: {
        update: ({ req }) => {
          if (req?.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" &&
            (req?.user?.role === "admin" || req?.user?.role === "business")
          );
        },
      },
      options: [
        { value: "pending", label: { en: "Pending", es: "Pendiente" } },
        { value: "confirmed", label: { en: "Confirmed", es: "Confirmada" } },
        { value: "cancelled", label: { en: "Cancelled", es: "Cancelada" } },
        { value: "completed", label: { en: "Completed", es: "Completada" } },
      ],
    },
    // number of people
    {
      type: "number",
      name: "numberOfPeople",
      defaultValue: 1,
      admin: {
        readOnly: true,
        // condition: (data) => {
        //   console.log({ data });
        //   // data: {
        //   //    id: 'c948628b-02d0-4088-84df-b1c8b91b1c9d',
        //   //    business: '71358eb4-b61e-418d-a2fe-e34b8e5c5e6c',
        //   //    customer: '1cf18943-2a2b-46de-b9fb-5407afce47ae',
        //   //    customerName: 'Cesar',
        //   //    day: '2025-12-31T00:00:00.000Z',
        //   //    startDateTime: '2025-12-31T16:00:00.000Z',
        //   //    endDateTime: '2025-12-31T17:00:00.000Z',
        //   //    status: 'confirmed',
        //   //    numberOfPeople: 3,
        //   //    notes: null,
        //   //    updatedAt: '2025-12-26T18:57:52.198Z',
        //   //    createdAt: '2025-12-26T18:57:52.197Z'
        //   //  }
        //   return true;
        // },
      },
      label: { en: "Number of People", es: "Número de Personas" },
      min: 1,
      max: 100,
    },
    // notes
    {
      name: "notes",
      type: "textarea",
      label: { en: "Notes", es: "Observaciones" },
    },
  ],
};
