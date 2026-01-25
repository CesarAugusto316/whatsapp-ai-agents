import { PayloadRequest } from "payload";
import {
  AppointmentSlot,
  AvailabilityRequest,
  AvailabilityResponse,
  bucketByHour,
  getDayScheduleForDate,
} from "./check-availability";
import { fromZonedTime } from "date-fns-tz";
import { Business as IBusiness } from "@/payload-types";

/**
 *
 * @param req
 * @returns
 */
export const appointmentService = async (req: PayloadRequest) => {
  const { where } = req.query as unknown as AvailabilityRequest;
  // Validar que where y sus propiedades existan
  if (!where || !where.business || !where.startDateTime) {
    throw new Error(
      "Se requiere businessId y startDateTime en el parámetro where",
    );
  }

  const { business, endDateTime, numberOfPeople, startDateTime } = where;

  const numbOfpeople = Number(numberOfPeople?.equals ?? 1);

  // Validar parámetros requeridos
  if (!business.equals || !startDateTime.equals) {
    throw new Error("Se requiere businessId y startDateTime");
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
    console.warn(`Business not found or error: ${business.equals}`, error);
    throw new Error("businessNotFound");
  }

  if (!businessFound) {
    throw new Error("businessNotFound");
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

  const { schedule: schedules, weekDay } = getDayScheduleForDate(
    businessFound,
    startDate,
  ); // 2 slots: morning, afternoon

  if (!schedules.length) {
    return {
      success: false,
      message: "Business does not work on this day",
    };
  }

  const utcSchedules = schedules.map((schedule) => {
    const openTime = fromZonedTime(
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, // hours
        schedule.open, // minutes
      ),
      businessFound.general.timezone,
    );
    const closeTime = fromZonedTime(
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0, // hours
        schedule.close, // minutes
      ),
      businessFound.general.timezone,
    );
    return {
      openTime,
      closeTime,
    };
  });

  if (startDate >= endDate) {
    return {
      success: false,
      message: "StartDateTime must be before EndDateTime",
    };
  }

  const utcSchedule = utcSchedules.find(
    ({ closeTime: utcCloseTime, openTime: utcOpenTime }) => {
      return (
        startDate.getTime() >= utcOpenTime.getTime() &&
        endDate.getTime() <= utcCloseTime.getTime()
      );
    },
  );

  if (!utcSchedule) {
    return {
      success: false,
      message: "Reservation date is out of business hours",
    };
  }

  const utcOpenTime = utcSchedule.openTime.toISOString();
  const utcCloseTime = utcSchedule.closeTime.toISOString();

  const appointmentsWindow: AppointmentSlot[] = (
    await req.payload.find({
      collection: "appointments",
      depth: 0,
      sort: "startDateTime",
      where: {
        business,
        status: {
          in: ["confirmed", "pending"],
        },
        startDateTime: {
          less_than: utcCloseTime,
          // greater_than_equal: utcOpenTime,
        },
        endDateTime: {
          greater_than: utcOpenTime,
          // less_than_equal: utcCloseTime,
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

  const timeWindow = bucketByHour(
    utcOpenTime,
    utcCloseTime,
    appointmentsWindow,
  );

  const reqStart = startDate.getTime();
  const reqEnd = endDate.getTime();

  const overlappingSlots = timeWindow.filter((slot) => {
    const slotStart = new Date(slot.from).getTime();
    const slotEnd = new Date(slot.to).getTime();

    return reqStart < slotEnd && reqEnd > slotStart;
  });

  const response: AvailabilityResponse = {
    success: true,
    businessId: business.equals,
    requestedStart: startDate.toISOString(),
    requestedEnd: endDate.toISOString(),
    requestedPeople: numbOfpeople,
    totalCapacityPerHour: maxCapacityPerHour,
    requestedDay: weekDay,
    scheduleForTheRequestedDay: utcSchedules,
    isRequestedDateTimeAvailable: overlappingSlots.every(
      (slot) => maxCapacityPerHour - slot.totalPeople >= numbOfpeople,
    ),
    timeWindow,
    neededSlots: overlappingSlots,
  };

  return response;
};
