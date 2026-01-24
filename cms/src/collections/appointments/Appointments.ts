import type { CollectionConfig, CollectionSlug } from "payload";
import { Business } from "../Businesses";
import { Customers } from "../Costumers";
import { Business as IBusiness } from "@/payload-types";
import {
  AppointmentSlot,
  AvailabilityRequest,
  AvailabilityResponse,
  calculateAvailability,
  WeekDayKey,
} from "./check-availability";

// Helper functions for schedule and timezone handling
function getDayScheduleForDate(
  business: IBusiness,
  date: Date,
  timezone: string,
): { open: number; close: number }[] {
  // Get day of week in business timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  const weekday = formatter.format(date).toLowerCase() as WeekDayKey;

  // Get schedule for the day, ensuring it's an array
  const daySchedule = business.schedule[weekday];
  if (!daySchedule || !Array.isArray(daySchedule)) {
    return [];
  }

  // Map to the expected format (strip id field if present)
  return daySchedule.map((slot) => ({
    open: slot.open,
    close: slot.close,
  }));
}

function getTimeSlotForTime(
  schedule: { open: number; close: number }[],
  date: Date,
  timezone: string,
): number {
  const minutesFromMidnight = utcDateToMinutesFromMidnight(date, timezone);

  for (let i = 0; i < schedule.length; i++) {
    const slot = schedule[i];
    if (minutesFromMidnight >= slot.open && minutesFromMidnight <= slot.close) {
      return i; // Return index of the slot (0 for morning, 1 for afternoon)
    }
  }
  return -1; // Not in any schedule slot
}

/**
 * Convert UTC Date to minutes from midnight in business timezone
 * @param date UTC Date object
 * @param timezone Business timezone string (e.g., "Europe/Madrid")
 * @returns Minutes from midnight in business local time
 */
function utcDateToMinutesFromMidnight(date: Date, timezone: string): number {
  // Format the UTC date to get local time parts in business timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")?.value || "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value || "0";

  const hour = parseInt(hourPart, 10);
  const minute = parseInt(minutePart, 10);

  return hour * 60 + minute;
}

/**
 * Convert minutes from midnight in business timezone to UTC Date
 * @param date The date portion (should be in UTC)
 * @param minutesFromMidnight Minutes from midnight in business local time
 * @param timezone Business timezone string (e.g., "Europe/Madrid")
 * @returns UTC Date object
 */
function localMinutesToUTCDate(
  date: Date,
  minutesFromMidnight: number,
  timezone: string,
): Date {
  // Create a date at midnight UTC for the given UTC date
  const midnightUTC = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  // Get timezone offset in minutes for this date in the business timezone
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  const offsetParts = offsetFormatter.formatToParts(midnightUTC);
  const offsetPart = offsetParts.find((p) => p.type === "timeZoneName");
  let offsetMinutes = 0;
  if (offsetPart && offsetPart.value.startsWith("GMT")) {
    const offsetStr = offsetPart.value.replace("GMT", "").trim();
    if (offsetStr) {
      const sign = offsetStr[0] === "-" ? -1 : 1;
      const [h, m = 0] = offsetStr.slice(1).split(":").map(Number);
      offsetMinutes = sign * (h * 60 + m);
    }
  }

  // Local midnight in UTC = midnightUTC - offsetMinutes
  const localMidnightUTC = new Date(
    midnightUTC.getTime() - offsetMinutes * 60000,
  );

  // Add minutesFromMidnight to get the UTC time
  const utcDate = new Date(
    localMidnightUTC.getTime() + minutesFromMidnight * 60000,
  );

  // Adjust for DST if needed by checking offset at the calculated time
  // This is a simple correction; for precise DST handling, we'd need to iterate
  const finalOffsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  const finalOffsetParts = finalOffsetFormatter.formatToParts(utcDate);
  const finalOffsetPart = finalOffsetParts.find(
    (p) => p.type === "timeZoneName",
  );
  let finalOffsetMinutes = 0;
  if (finalOffsetPart && finalOffsetPart.value.startsWith("GMT")) {
    const offsetStr = finalOffsetPart.value.replace("GMT", "").trim();
    if (offsetStr) {
      const sign = offsetStr[0] === "-" ? -1 : 1;
      const [h, m = 0] = offsetStr.slice(1).split(":").map(Number);
      finalOffsetMinutes = sign * (h * 60 + m);
    }
  }

  // If offset changed (DST transition), adjust
  if (finalOffsetMinutes !== offsetMinutes) {
    const adjustedUTC = new Date(
      utcDate.getTime() + (offsetMinutes - finalOffsetMinutes) * 60000,
    );
    return adjustedUTC;
  }

  return utcDate;
}

/**
 * Generate alternative time slots when requested time is not available
 * @param business Business object
 * @param date Requested date (UTC)
 * @param targetSlotIndex Index of the schedule slot where requested time falls (-1 if not in schedule)
 * @param maxCapacityPerHour Maximum capacity per hour
 * @param appointments Existing appointments for the day
 * @param numberOfPeople Number of people for the reservation
 * @param timezone Business timezone
 * @returns Array of ISO string UTC times
 */
function generateAlternativeSlots(
  business: IBusiness,
  date: Date,
  targetSlotIndex: number,
  maxCapacityPerHour: number,
  appointments: AppointmentSlot[],
  numberOfPeople: number,
  timezone: string,
): string[] {
  const suggestedTimes: string[] = [];
  const daySchedule = getDayScheduleForDate(business, date, timezone);

  if (daySchedule.length === 0) {
    return suggestedTimes;
  }

  // Helper function to check and add time slot
  const checkAndAddSlot = (
    slotIndex: number,
    minutesFromMidnight: number,
  ): boolean => {
    const testTime = localMinutesToUTCDate(date, minutesFromMidnight, timezone);

    if (
      isTimeAvailable(
        testTime,
        appointments,
        maxCapacityPerHour,
        numberOfPeople,
      )
    ) {
      suggestedTimes.push(testTime.toISOString());
      return true;
    }
    return false;
  };

  // Try alternative times in the same slot first (starting 30 minutes after requested time)
  if (targetSlotIndex >= 0) {
    const targetSlot = daySchedule[targetSlotIndex];
    const requestedMinutes = utcDateToMinutesFromMidnight(date, timezone);
    const slotDuration = targetSlot.close - targetSlot.open;
    const interval = 60; // 60-minute intervals

    // Try times after requested time within the same slot
    for (let offset = 60; offset <= slotDuration; offset += interval) {
      const testMinutes = requestedMinutes + offset;
      if (testMinutes >= targetSlot.close) break;
      if (testMinutes >= targetSlot.open) {
        if (
          checkAndAddSlot(targetSlotIndex, testMinutes) &&
          suggestedTimes.length >= 3
        ) {
          return suggestedTimes;
        }
      }
    }

    // Try times before requested time within the same slot
    for (let offset = 60; offset <= slotDuration; offset += interval) {
      const testMinutes = requestedMinutes - offset;
      if (testMinutes < targetSlot.open) break;
      if (testMinutes <= targetSlot.close) {
        if (
          checkAndAddSlot(targetSlotIndex, testMinutes) &&
          suggestedTimes.length >= 3
        ) {
          return suggestedTimes;
        }
      }
    }
  }

  // If not enough suggestions, try all slots in the same day
  for (let slotIndex = 0; slotIndex < daySchedule.length; slotIndex++) {
    // If we already tried this slot, skip it
    if (slotIndex === targetSlotIndex) continue;

    const slot = daySchedule[slotIndex];
    const slotDuration = slot.close - slot.open;
    const interval = 60;

    // Try times throughout the slot
    for (let offset = 0; offset <= slotDuration; offset += interval) {
      const testMinutes = slot.open + offset;
      if (testMinutes >= slot.close) break;

      if (
        checkAndAddSlot(slotIndex, testMinutes) &&
        suggestedTimes.length >= 3
      ) {
        return suggestedTimes;
      }
    }
  }

  return suggestedTimes;
}

function isTimeAvailable(
  time: Date,
  appointments: AppointmentSlot[],
  maxCapacityPerHour: number,
  numberOfPeople: number,
): boolean {
  const hourStart = new Date(time);
  hourStart.setMinutes(0, 0, 0);
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

  const overlappingAppointments = appointments.filter((appointment) => {
    const apptStart = new Date(appointment.startDateTime);
    const apptEnd = appointment.endDateTime
      ? new Date(appointment.endDateTime)
      : new Date(apptStart.getTime() + 60 * 60 * 1000);

    return apptStart < hourEnd && apptEnd > hourStart;
  });

  const validAppointments = overlappingAppointments.filter(
    (appt) => appt.status === "confirmed" || appt.status === "pending",
  );

  const reservedPeople = validAppointments.reduce(
    (sum, appt) => sum + (appt.numberOfPeople || 0),
    0,
  );

  return maxCapacityPerHour - reservedPeople >= numberOfPeople;
}

/** @todo corregir en el dashboard para que muestre año/mes/dia en la tabla de reservas */
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
      path: "/suggest-slots",
      method: "get",
      handler: async (req) => {
        try {
          const { where } = req.query as unknown as AvailabilityRequest;
          // endDateTime & startDateTime  in UTC format
          const { business, endDateTime, numberOfPeople, startDateTime } =
            where;

          // Validar parámetros requeridos
          if (!business.equals || !startDateTime.equals) {
            return Response.json(
              {
                success: false,
                message: "Se requiere businessId y startDateTime",
              },
              { status: 400 },
            );
          }

          // Obtener el negocio
          const businessFound: IBusiness = await req.payload.findByID({
            collection: "businesses",
            id: business.equals,
          });

          if (!businessFound) {
            return Response.json(
              {
                success: false,
                message: "Negocio no encontrado",
              },
              { status: 404 },
            );
          }
        } catch (error) {
          console.error("Error checking availability:", error);
          return Response.json(
            {
              success: false,
              message: "Error al sugerir disponibilidad",
              error: (error as Error).message,
            },
            { status: 500 },
          );
        }
      },
    },
    {
      path: "/check-availability",
      method: "get",
      handler: async (req) => {
        try {
          const { where } = req.query as unknown as AvailabilityRequest;
          // Validar que where y sus propiedades existan
          if (!where || !where.business || !where.startDateTime) {
            return Response.json(
              {
                success: false,
                message:
                  "Se requiere businessId y startDateTime en el parámetro where",
              },
              { status: 400 },
            );
          }

          const { business, endDateTime, numberOfPeople, startDateTime } =
            where;

          // Validar parámetros requeridos
          if (!business.equals || !startDateTime.equals) {
            return Response.json(
              {
                success: false,
                message: "Se requiere businessId y startDateTime",
              },
              { status: 400 },
            );
          }

          // Obtener el negocio
          let businessFound: IBusiness | null = null;
          try {
            businessFound = await req.payload.findByID({
              depth: 0,
              collection: "businesses",
              id: business.equals,
            });
          } catch (error) {
            // Si hay error al buscar (ej: ID inválido o no existe), tratamos como no encontrado
            console.warn(
              `Business not found or error: ${business.equals}`,
              error,
            );
          }

          if (!businessFound) {
            return Response.json(
              {
                success: false,
                message: "Negocio no encontrado",
              },
              { status: 404 },
            );
          }
          const maxCapacityPerHour = businessFound.general.tables || 20;

          // Parsear fechas (Payload usa UTC)
          const startDate = new Date(startDateTime.equals);
          const endDate = endDateTime
            ? new Date(endDateTime.equals)
            : new Date(
                startDate.getTime() +
                  (businessFound.schedule.averageTime || 60) * 60 * 1000,
              ); // +1 hora por defecto

          // Necesitamos un rango más amplio para calcular superposiciones correctamente
          const searchStart = new Date(startDate);
          searchStart.setHours(searchStart.getHours() - 1); // Incluir 1 hora antes
          searchStart.setMinutes(0, 0, 0);

          const searchEnd = new Date(endDate);
          searchEnd.setHours(searchEnd.getHours() + 1); // Incluir 1 hora después
          searchEnd.setMinutes(0, 0, 0);

          const existingAppointments: AppointmentSlot[] = (
            await req.payload.find({
              depth: 0,
              collection: "appointments",
              where: {
                business,
                status: {
                  in: ["confirmed", "pending"],
                },
                startDateTime: {
                  greater_than_equal: searchStart.toISOString(), // UTC
                },
                endDateTime: {
                  less_than_equal: searchEnd.toISOString(), // UTC
                },
              },
              limit: maxCapacityPerHour * 3,
            })
          ).docs.map((doc) => ({
            id: doc.id,
            startDateTime: doc.startDateTime,
            endDateTime: doc.endDateTime,
            numberOfPeople: doc.numberOfPeople || 0,
            status: doc.status,
            createdAt: doc.createdAt,
            customer: doc.customer,
          }));

          console.log({ existingAppointments });

          // Calcular disponibilidad usando la función pura
          const {
            overlappingSlots,
            isRequestedDateTimeAvailable,
            totalSlotReservations,
          } = calculateAvailability({
            appointments: existingAppointments,
            maxCapacityPerHour,
            endDate,
            startDate,
            numberOfPeople: +numberOfPeople.equals || 1,
          });

          // Si no hay disponibilidad, obtener más datos para sugerencias
          let suggestedTimes: string[] = [];

          // Solo sugerir horarios alternativos si no hay disponibilidad completa
          if (!isRequestedDateTimeAvailable) {
            const schedule = getDayScheduleForDate(
              businessFound,
              startDate,
              businessFound.general.timezone,
            ); // 2 slots: morning, afternoon

            // Determinar en qué slot cae la hora solicitada
            const requestedSlotIndex = getTimeSlotForTime(
              schedule,
              startDate,
              businessFound.general.timezone,
            );

            // Obtener citas para el mismo día para sugerencias
            const sameDayStart = new Date(startDate);
            sameDayStart.setHours(0, 0, 0, 0);
            const sameDayEnd = new Date(startDate);
            sameDayEnd.setHours(23, 59, 59, 999);

            const appointmentsForSuggestions: AppointmentSlot[] = (
              await req.payload.find({
                collection: "appointments",
                depth: 0,
                where: {
                  business,
                  status: {
                    in: ["confirmed", "pending"],
                  },
                  startDateTime: {
                    greater_than_equal: sameDayStart.toISOString(),
                  },
                  endDateTime: {
                    less_than_equal: sameDayEnd.toISOString(),
                  },
                },
                limit: 1000,
              })
            ).docs.map((doc) => ({
              id: doc.id,
              startDateTime: doc.startDateTime,
              endDateTime: doc.endDateTime,
              numberOfPeople: doc.numberOfPeople || 0,
              status: doc.status,
              createdAt: doc.createdAt,
              customer: doc.customer,
            }));

            // Si la hora solicitada cae dentro de un slot de horario
            if (requestedSlotIndex >= 0 && schedule.length > 0) {
              // Usar la función mejorada que considera el horario del negocio
              suggestedTimes = generateAlternativeSlots(
                businessFound,
                startDate,
                requestedSlotIndex,
                maxCapacityPerHour,
                appointmentsForSuggestions,
                +numberOfPeople.equals || 1,
                businessFound.general.timezone,
              );
            }
          }

          const response: AvailabilityResponse = {
            success: true,
            businessId: business.equals,
            requestedStart: startDate.toISOString(),
            requestedEnd: endDate.toISOString(),
            requestedPeople: +numberOfPeople.equals,
            totalCapacityPerHour: maxCapacityPerHour,
            overlappingSlots,
            totalSlotReservations,
            isRequestedDateTimeAvailable,
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
