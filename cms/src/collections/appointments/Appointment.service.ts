import { PayloadRequest } from "payload";
import {
  AppointmentSlot,
  AvailabilityRequest,
  AvailabilityResponse,
  calcSlotsByHour,
  getCurrentDaySchedule,
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

  const { startDate, endDate, numberOfPeople, ...rest1 } = validateDates(
    where,
    business.schedule.averageTime,
  );

  if (!rest1.success) return rest1;

  const { availabilityRanges, matchedAvailabilityRange, weekDay, ...rest2 } =
    validateScheduleAvailability(business, startDate, endDate);

  if (!rest2.success) return rest2;

  const { open, close } = matchedAvailabilityRange;
  const { availableSlots, slotsByTimeRange } = await generateSlots(
    business,
    startDate,
    endDate,
    open,
    close,
  );

  const maxCapacityPerHour = business.general.tables || 20;
  const response: AvailabilityResponse = {
    success: true,
    businessId: business.id,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    numberOfPeople,
    maxCapacityPerHour,
    weekDay,
    weekDaySchedule: availabilityRanges.map((s) => ({
      open: s.open.toISOString(),
      close: s.close.toISOString(),
    })),
    isSlotAvailable: availableSlots.every(
      (slot) => maxCapacityPerHour - slot.totalPeople >= numberOfPeople,
    ),
    slotsByTimeRange, // 60 minnutes, could be 30 minutes in the future
    availableSlots,
  };
  return response;
};

async function generateSlots(
  business: IBusiness,
  startDate: Date,
  endDate: Date,
  open: string,
  close: string,
) {
  const payload = await getPayload({ config });
  const appointmentsWindow: AppointmentSlot[] = (
    await payload.find({
      collection: "appointments",
      depth: 0,
      sort: "startDateTime",
      where: {
        business: { equals: business.id },
        status: {
          in: ["confirmed", "pending"],
        },
        startDateTime: {
          less_than: close,
          // greater_than_equal: utcOpenTime,
        },
        endDateTime: {
          greater_than: open,
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

  const slotsByTimeRange = calcSlotsByHour(open, close, appointmentsWindow);
  const reqStart = startDate.getTime();
  const reqEnd = endDate.getTime();

  const availableSlots = slotsByTimeRange.filter((slot) => {
    const slotStart = new Date(slot.from).getTime();
    const slotEnd = new Date(slot.to).getTime();
    return reqStart < slotEnd && reqEnd > slotStart;
  });

  return { availableSlots, slotsByTimeRange };
}

/**
 *
 * @param where
 * @returns
 */
async function validateBusiness(where: AvailabilityRequest["where"]) {
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
}

/**
 *
 * @param where
 * @param averageTime
 * @returns
 */
function validateDates(
  where: AvailabilityRequest["where"],
  averageTime?: number,
) {
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
}

/**
 *
 * @param business
 * @param startDate
 * @param endDate
 * @returns
 */
function validateScheduleAvailability(
  business: IBusiness,
  startDate: Date,
  endDate: Date,
) {
  const { daySchedule, weekDay } = getCurrentDaySchedule(business, startDate);

  if (!daySchedule.length) {
    return {
      success: false,
      message: "Business does not work on this day",
    };
  }

  const availabilityRanges = daySchedule.map((range) => {
    const open = fromZonedTime(
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0,
        range.open,
      ),
      business.general.timezone,
    );
    const close = fromZonedTime(
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0,
        range.close,
      ),
      business.general.timezone,
    );

    return { open, close };
  });

  const matchedAvailabilityRange = availabilityRanges.find(
    ({ open, close }) => {
      return startDate >= open && endDate <= close;
    },
  );

  if (!matchedAvailabilityRange) {
    return {
      success: false,
      message: "Reservation date is out of business hours",
    };
  }

  return {
    weekDay,
    availabilityRanges,
    matchedAvailabilityRange: {
      open: matchedAvailabilityRange.open.toISOString(),
      close: matchedAvailabilityRange.close.toISOString(),
    },
    success: true,
    message: "",
  };
}
