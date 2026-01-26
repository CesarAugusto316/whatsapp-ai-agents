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
import { getPayload } from "payload";
import config from "@payload-config";

/**
 *
 * @param req
 * @returns
 */
export const appointmentService = async (req: PayloadRequest) => {
  const { where } = req.query as unknown as AvailabilityRequest;

  const business = await validateBusiness(where);

  const { startDate, endDate, numberOfPeople, ...rest } = validateDates(
    where,
    business.schedule.averageTime,
  );

  if (!rest.success) return rest;

  const { daySchedule, weekDay } = getDayScheduleForDate(business, startDate); // 2 slots: morning, afternoon
  if (!daySchedule.length) {
    return {
      success: false,
      message: "Business does not work on this day",
    };
  }

  const utcSchedules = daySchedule.map((schedule) => {
    const openTime = fromZonedTime(
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, // hours
        schedule.open, // minutes
      ),
      business.general.timezone,
    );
    const closeTime = fromZonedTime(
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0, // hours
        schedule.close, // minutes
      ),
      business.general.timezone,
    );
    return {
      openTime,
      closeTime,
    };
  });

  const utcScheduleRange = utcSchedules.find(
    ({ closeTime: utcCloseTime, openTime: utcOpenTime }) => {
      return (
        startDate.getTime() >= utcOpenTime.getTime() &&
        endDate.getTime() <= utcCloseTime.getTime()
      );
    },
  );

  if (!utcScheduleRange) {
    return {
      success: false,
      message: "Reservation date is out of business hours",
    };
  }

  const utcOpenTime = utcScheduleRange.openTime.toISOString();
  const utcCloseTime = utcScheduleRange.closeTime.toISOString();

  const appointmentsWindow: AppointmentSlot[] = (
    await req.payload.find({
      collection: "appointments",
      depth: 0,
      sort: "startDateTime",
      where: {
        business: { equals: business.id },
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

  const maxCapacityPerHour = business.general.tables || 20;
  const response: AvailabilityResponse = {
    success: true,
    businessId: business.id,
    requestedStart: startDate.toISOString(),
    requestedEnd: endDate.toISOString(),
    requestedPeople: numberOfPeople,
    totalCapacityPerHour: maxCapacityPerHour,
    requestedDay: weekDay,
    scheduleForTheRequestedDay: utcSchedules,
    isRequestedDateTimeAvailable: overlappingSlots.every(
      (slot) => maxCapacityPerHour - slot.totalPeople >= numberOfPeople,
    ),
    timeWindow,
    neededSlots: overlappingSlots,
  };
  return response;
};

/**
 *
 * @param where
 * @returns
 */
export const validateBusiness = async (where: AvailabilityRequest["where"]) => {
  //
  const payload = await getPayload({ config });
  const { business } = where;

  // Validar parámetros requeridos
  if (!business.equals) {
    throw new Error("Se requiere businessId");
  }

  // Obtener el negocio
  let businessFound: IBusiness | null = null;
  try {
    businessFound = await payload.findByID({
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

  return businessFound;
};

/**
 *
 * @param where
 * @param averageTime
 * @returns
 */
export const validateDates = (
  where: AvailabilityRequest["where"],
  averageTime?: number,
) => {
  const { endDateTime, numberOfPeople, startDateTime } = where;
  if (!startDateTime?.equals) {
    throw new Error("startDateTime is required");
  }
  const numbOfpeople = Number(numberOfPeople?.equals ?? 0);

  // Parsear fechas (Payload usa UTC)
  const startDate = new Date(startDateTime.equals);
  const endDate = endDateTime
    ? new Date(endDateTime.equals)
    : new Date(startDate.getTime() + (averageTime || 60) * 60 * 1000); // +1 hora por defecto

  if (startDate >= endDate) {
    return {
      success: false,
      message: "StartDateTime must be before EndDateTime",
    };
  }

  return {
    startDate,
    endDate,
    numberOfPeople: numbOfpeople,
    success: true,
    message: "",
  };
};
