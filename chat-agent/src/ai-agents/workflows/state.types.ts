export type ReservationData = {
  customerName?: string; // Nombre del cliente
  day?: string; // Día de la reserva en YYYY-MM-DD
  time?: string; // Hora de la reserva en HH:MM
};

export enum CreateReservationStep {
  START, // Confirmación de inicio del proceso de reserva
  CAPTURE_DATA, // Se recopilan datos: nombre, día y hora
  VERIFY_DATA, // Se muestra resumen al usuario para confirmar
  CONFIRM, // Usuario confirma con palabra clave
  COMPLETED, // Reserva realizada y registrada (o expiró si pasa la fecha)
}
