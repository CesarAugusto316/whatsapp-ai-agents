// import { Business } from "@/infraestructure/http/cms/cms-types";
// import { ReservationState } from "../reservations/reservation.types";

// // domain/reservation/services/reservation-availability.service.ts
// export class ReservationAvailabilityService {
//   constructor(
//     private readonly business: Business,
//     private readonly timezone: string
//   ) {}

//   async validateAvailability(
//     reservationData: Partial<ReservationState>
//   ): Promise<AvailabilityResult> {
//     const validation = new ReservationValidator(this.business, this.timezone);

//     // 1. Validar horario comercial
//     const scheduleCheck = validation.validateBusinessHours(reservationData);
//     if (!scheduleCheck.valid) {
//       return AvailabilityResult.outOfHours(scheduleCheck.message);
//     }

//     // 2. Validar feriados
//     const holidayCheck = validation.validateHolidays(reservationData);
//     if (!holidayCheck.valid) {
//       return AvailabilityResult.holiday(holidayCheck.message);
//     }

//     // 3. Checkear disponibilidad en CMS
//     const availability = await this.checkCMSAvailability(reservationData);
//     if (!availability.isFullyAvailable) {
//       return AvailabilityResult.unavailable(availability.message);
//     }

//     return AvailabilityResult.available();
//   }

//   private async checkCMSAvailability(
//     data: Partial<ReservationState>
//   ): Promise<CMSAvailability> {
//     // Lógica específica de CMS
//   }
// }
