export function extractCustomerName(message: string): string {
  const namePattern =
    /[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,})*/g;
  const matches = message.match(namePattern) || [];

  const commonWords = [
    "Hola",
    "Buen",
    "Buenos",
    "Buenas",
    "Gracias",
    "Por",
    "Para",
    "Con",
    "De",
    "La",
    "El",
    "Las",
    "Los",
    "Del",
    "Al",
    "A",
    "En",
    "Y",
    "O",
    "Si",
    "No",
    "Que",
    "Es",
    "Se",
    "Te",
    "Me",
    "Le",
    "Les",
    "Da",
    "Dan",
    "Doy",
    "Dio",
    "Dieron",
    "Hoy",
    "Mañana",
    "Tarde",
    "Noche",
    "Mesa",
    "Reserva",
    "Personas",
    "Para",
    "Ellos",
    "Ellas",
    "Usted",
    "Ustedes",
    "Vos",
    "Vosotros",
    "Os",
  ];

  const names = matches.filter((n) => !commonWords.includes(n));
  return names.length > 0 ? names[0] : "";
}
