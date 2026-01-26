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
export const checkAvailabilityService = async (
  req: PayloadRequest,
  checkOverlapping: boolean = true,
) => {
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
  const { availableSlots, slotsByTimeRange } = await generateSlots({
    business,
    startDate: checkOverlapping ? startDate : undefined,
    endDate: checkOverlapping ? endDate : undefined,
    open,
    close,
  });

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

/**
 *
 * @param req
 * @returns
 */
export const suggestSlotsService = async (
  where: Pick<AvailabilityRequest["where"], "business">,
) => {
  const business = await validateBusiness(where);

  const numberOfPeople = 0;

  const {
    startDate,
    endDate,
    availabilityRanges,
    matchedAvailabilityRange,
    weekDay,
    ...rest2
  } = generateScheduleAvailability(business);

  if (!rest2.success) return rest2;

  const { open, close } = matchedAvailabilityRange;
  const { availableSlots, slotsByTimeRange } = await generateSlots({
    business,
    startDate,
    endDate,
    open,
    close,
  });

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

type GenerateSlots = {
  business: IBusiness;
  open: string;
  close: string;
  startDate?: Date;
  endDate?: Date;
};

async function generateSlots({
  business,
  open,
  close,
  startDate,
  endDate,
}: GenerateSlots) {
  //
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

  if (!startDate || !endDate) {
    return { availableSlots: [], slotsByTimeRange };
  }
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
async function validateBusiness(
  where: Pick<AvailabilityRequest["where"], "business">,
) {
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
  where: Pick<
    AvailabilityRequest["where"],
    "startDateTime" | "numberOfPeople" | "endDateTime"
  >,
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

/**
 *
 * @todo handle day after holiday {business.general.nextHoliday}
 * @param business
 * @param startDate
 * @param endDate
 * @returns
 */
function generateScheduleAvailability(
  business: IBusiness,
  startDate = new Date(),
  maxAttempts = 7, // Límite de 1 año máximo
  currentAttempt = 0,
) {
  // Protección contra recursión infinita
  if (currentAttempt >= maxAttempts) {
    return {
      startDate: new Date(),
      endDate: new Date(),
      success: false,
      message:
        "No se encontró horario disponible después de buscar en el horario",
    };
  }

  const averageTime = business.schedule.averageTime;
  const endDate = new Date(
    startDate.getTime() + (averageTime || 60) * 60 * 1000,
  ); // +1 hora por defecto

  const { daySchedule, weekDay } = getCurrentDaySchedule(business, startDate);

  // Si no hay horario o el día es feriado, buscar en el siguiente día
  if (!daySchedule.length || isHoliday(business, startDate)) {
    const nextDay = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    return generateScheduleAvailability(
      business,
      nextDay,
      maxAttempts,
      currentAttempt + 1,
    );
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

  return {
    startDate: availabilityRanges[0]?.open,
    endDate: new Date(
      availabilityRanges[0]?.open?.getTime() + (averageTime || 60) * 60 * 1000,
    ),
    weekDay,
    availabilityRanges,
    matchedAvailabilityRange: {
      open: availabilityRanges[0]?.open?.toISOString(),
      close:
        availabilityRanges[1]?.close?.toISOString() ||
        availabilityRanges[0]?.close?.toISOString(),
    },
    success: true,
    message: "",
  };
}

/**
 * Función helper para verificar si un día es feriado
 * Busca en el array de nextHoliday la fecha más cercana que coincida
 */
function isHoliday(business: IBusiness, date: Date): boolean {
  const holidays = business.general?.nextHoliday;
  if (!holidays || holidays.length === 0) return false;

  // Convertir la fecha actual a string en formato YYYY-MM-DD para comparación
  const dateString = date.toISOString().split("T")[0];

  // Buscar si la fecha está dentro de algún rango de feriado
  for (const holiday of holidays) {
    const holidayStart = new Date(holiday.startDate);
    const holidayEnd = new Date(holiday.endDate);

    // Verificar si la fecha está dentro del rango [inicio, fin]
    if (date >= holidayStart && date <= holidayEnd) {
      return true;
    }

    // Comparación adicional por si las fechas son del mismo día
    const holidayStartString = holidayStart.toISOString().split("T")[0];
    const holidayEndString = holidayEnd.toISOString().split("T")[0];

    if (dateString === holidayStartString || dateString === holidayEndString) {
      return true;
    }
  }

  return false;
}

/**
 * Función auxiliar para encontrar el próximo feriado (opcional)
 * Puede ser útil para optimizar la búsqueda de días laborales
 */
export function getNextHoliday(
  holidays: Array<{ startDate: string; endDate: string }>,
  fromDate: Date,
): Date | null {
  let closestHoliday: Date | null = null;

  for (const holiday of holidays) {
    const holidayStart = new Date(holiday.startDate);

    // Solo considerar feriados futuros
    if (holidayStart >= fromDate) {
      if (!closestHoliday || holidayStart < closestHoliday) {
        closestHoliday = holidayStart;
      }
    }
  }

  return closestHoliday;
}
