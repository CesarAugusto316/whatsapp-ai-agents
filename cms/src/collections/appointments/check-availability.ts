export interface AvailabilityRequest {
  depth: string;
  where: {
    business: { equals: string };
    startDateTime: { equals: string };
    endDateTime: { equals: string };
    numberOfPeople: { equals: string };
  };
}

interface TimeSlot {
  hour: string;
  availableSlots: number;
  isAvailable: boolean;
}

export interface AvailabilityResponse {
  success: boolean;
  message?: string;
  businessId: string;
  requestedStart: string;
  requestedEnd: string;
  requestedPeople?: number;
  totalCapacityPerHour: number;
  availableSlotsPerHour: TimeSlot[];
  isFullyAvailable: boolean;
  suggestedTimes?: string[];
}

export interface AppointmentSlot {
  startDateTime: string;
  endDateTime?: string;
  numberOfPeople: number;
  status?: string;
}

export interface AvailabilityResult {
  timeSlots: TimeSlot[];
  isFullyAvailable: boolean;
}

/**
 * Calcula la disponibilidad puramente basado en datos existentes
 * Esta función NO hace llamadas a la base de datos
 */
export function calculateAvailability(
  existingAppointments: AppointmentSlot[],
  maxCapacityPerHour: number,
  startDate: Date,
  endDate: Date,
  numberOfPeople: number = 1,
): AvailabilityResult {
  // Filtramos solo reservas confirmadas o pendientes
  const relevantAppointments = existingAppointments.filter(
    (appt) => appt.status === "confirmed" || appt.status === "pending",
  );

  const timeSlots: TimeSlot[] = [];

  // Normalizar fechas: inicio hacia abajo, fin hacia arriba
  const normalizedStart = new Date(startDate);
  normalizedStart.setMinutes(0, 0, 0);

  const normalizedEnd = new Date(endDate);
  // Redondear fin hacia arriba si no es hora exacta
  if (
    normalizedEnd.getMinutes() > 0 ||
    normalizedEnd.getSeconds() > 0 ||
    normalizedEnd.getMilliseconds() > 0
  ) {
    normalizedEnd.setHours(normalizedEnd.getHours() + 1);
  }
  normalizedEnd.setMinutes(0, 0, 0);

  let currentHour = new Date(normalizedStart);

  while (currentHour < normalizedEnd) {
    const hourStart = new Date(currentHour);
    const hourEnd = new Date(currentHour.getTime() + 60 * 60 * 1000);

    // Encontrar reservas que se superponen con esta hora
    const overlappingAppointments = relevantAppointments.filter(
      (appointment) => {
        const apptStart = new Date(appointment.startDateTime);
        const apptEnd = appointment.endDateTime
          ? new Date(appointment.endDateTime)
          : new Date(apptStart.getTime() + 60 * 60 * 1000); // 1 hora por defecto

        // Verificar si la reserva se superpone con esta hora
        return apptStart < hourEnd && apptEnd > hourStart;
      },
    );

    // Sumar personas ya reservadas en esta hora
    const reservedPeople = overlappingAppointments.reduce(
      (sum, appt) => sum + (appt.numberOfPeople || 0),
      0,
    );

    const availableSlots = maxCapacityPerHour - reservedPeople;
    const isAvailable = availableSlots >= numberOfPeople;

    timeSlots.push({
      hour: hourStart.toISOString(),
      availableSlots,
      isAvailable,
    });

    // Avanzar a la siguiente hora
    currentHour = hourEnd;
  }

  const isFullyAvailable = timeSlots.every((slot) => slot.isAvailable);

  return { timeSlots, isFullyAvailable };
}

/**
 * Genera sugerencias de horarios alternativos (pura)
 * Esta versión NO hace llamadas a la base de datos
 */
export function suggestAlternativeTimes(
  existingAppointments: AppointmentSlot[],
  maxCapacityPerHour: number,
  originalStart: Date,
  numberOfPeople: number,
  hoursToCheck: number = 4,
  intervalMinutes: number = 30,
): string[] {
  const suggestedTimes: string[] = [];
  const now = new Date();

  // Convertir horas a verificar a milisegundos
  const endSearchTime = originalStart.getTime() + hoursToCheck * 60 * 60 * 1000;

  // Empezar desde el primer intervalo después del horario original
  let checkTime = new Date(
    originalStart.getTime() + intervalMinutes * 60 * 1000,
  );

  while (checkTime.getTime() <= endSearchTime) {
    // No sugerir tiempos en el pasado
    if (checkTime < now) {
      checkTime = new Date(checkTime.getTime() + intervalMinutes * 60 * 1000);
      continue;
    }

    // Para cada hora de verificación, calcular disponibilidad para esa hora específica
    const hourStart = new Date(checkTime);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // Filtrar solo reservas relevantes (confirmed o pending)
    const relevantAppointments = existingAppointments.filter(
      (appt) => appt.status === "confirmed" || appt.status === "pending",
    );

    // Encontrar reservas que se superponen con esta hora
    const overlappingAppointments = relevantAppointments.filter(
      (appointment) => {
        const apptStart = new Date(appointment.startDateTime);
        const apptEnd = appointment.endDateTime
          ? new Date(appointment.endDateTime)
          : new Date(apptStart.getTime() + 60 * 60 * 1000);

        // Verificar superposición
        return apptStart < hourEnd && apptEnd > hourStart;
      },
    );

    // Calcular personas ya reservadas en esta hora
    const reservedPeople = overlappingAppointments.reduce(
      (sum, appt) => sum + (appt.numberOfPeople || 0),
      0,
    );

    // Verificar si hay disponibilidad
    if (maxCapacityPerHour - reservedPeople >= numberOfPeople) {
      suggestedTimes.push(checkTime.toISOString());

      // Limitar a 3 sugerencias
      if (suggestedTimes.length >= 3) break;
    }

    // Avanzar al siguiente intervalo
    checkTime = new Date(checkTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return suggestedTimes;
}
