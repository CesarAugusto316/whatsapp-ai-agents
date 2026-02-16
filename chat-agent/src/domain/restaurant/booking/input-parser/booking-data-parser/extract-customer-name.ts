export function extractCustomerName(message: string): string {
  const namePattern =
    /[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,})*/g;
  const matches = message.match(namePattern) || [];

  const commonWords = [
    // Basic greetings and common words
    "Hol[ae]?", // "Hola", "Hole", "Holla"
    "Buen[aeo]s?", // "Buen", "Buena", "Bueno", "Buenos", "Buenas"
    "Graci[ae]s?", // "Gracias", "Gracie", "Gracia"
    "Por",
    "Par[ae]?", // "Para", "Pare", "Para"
    "C[oó]n?", // "Con", "Con", "Coon"
    "D[ei]?", // "De", "Di", "Dee"
    "L[aeo]?", // "La", "Le", "Lo", "Laa"
    "D[el]?", // "Del", "De", "El"
    "Al",
    "A",
    "En",
    "Y",
    "O",
    "S[ií]?", // "Si", "Sí", "Sii"
    "N[oó]?", // "No", "Nó", "Noo"
    "Qu[ei]?", // "Que", "Qui", "Quee"
    "E[sś]?", // "Es", "Ess", "És"
    "S[ei]?", // "Se", "Si", "See"
    "T[ei]?", // "Te", "Ti", "Tee"
    "M[eé]?", // "Me", "Mé", "Mee"
    "L[ei]?", // "Le", "Li", "Lee"
    "L[ei]s?", // "Les", "Lis", "Lees"
    "D[ae]?", // "Da", "De", "Daa"
    "D[ae]n?", // "Dan", "Dann", "Daa"
    "Doy?",
    "D[ií][oó]?", // "Dio", "Dío", "Dioo"
    "Dier[ae]n?", // "Dieron", "Dieron", "Dieeron"
    "Hoy",
    "Mañan[ae]?", // "Mañana", "Mañane", "Mañana"
    "Tard[ei]?", // "Tarde", "Tardi", "Tardee"
    "Noc[he]?", // "Noche", "Noch", "Nochee"
    "Mes[ae]?", // "Mesa", "Mese", "Mesa"
    "Reserv[ae]?", // "Reserva", "Reserve", "Reservaa"
    "Person[ae]s?", // "Personas", "Personas", "Persoas"
    "Ellos?",
    "Ell[ae]s?", // "Ellas", "Ellos", "Ellas"
    "Usted",
    "Ustedes",
    "V[oe]s?", // "Vos", "Vos", "Voss"
    "Vosotr[oe]s?", // "Vosotros", "Vosotras"
    "O[sz]?", // "Os", "Oss", "Oz"

    // Additional common words for LatAm and Spain
    "Much[ae]s?", // "Muchas", "Muchos", "Muchae"
    "Poc[ae]s?", // "Pocas", "Pocos"
    "Est[ae]y?", // "Estoy", "Esta", "Estay"
    "Est[ae]mos?", // "Estamos", "Estamas"
    "S[ou]y?", // "Soy", "Soyy", "Sou"
    "Somos?",
    "Ir[ei]mos?", // "Iremos", "Ireimos"
    "V[ae]mos?", // "Vamos", "Vamos", "Vaamos"
    "Quier[oe]s?", // "Quieres", "Quieros"
    "Necesit[ae]s?", // "Necesitas", "Necesito"
    "Pued[eo]s?", // "Puedes", "Puedos"
    "H[ae]cer?", // "Hacer", "Hazer", "Haer"
    "S[ei]r?", // "Ser", "Sir", "Seer"
    "Tener?", // "Tener", "Tener"
    "Tien[es]?", // "Tienes", "Tieno"
    "H[ae]b[lr]ar?", // "Hablar", "Hablar", "Hablarr"
    "Llam[ae]r?", // "Llamar", "Llamar"
    "Nombr[ae]?", // "Nombre", "Nombree"
    "Apellido[s]?", // "Apellidos", "Apellido"
    "Reservaci[oó]n?", // "Reservación", "Reservacion"
    "Cita[s]?", // "Citas", "Cita"
    "Evento[s]?", // "Eventos", "Evento"
    "Restaurante?", // "Restaurante", "Restaurant"
    "Hotel?", // "Hotel", "Hotell"
    "Alojamiento?", // "Alojamiento", "Alojamientoo"
    "Confirm[ae]r?", // "Confirmar", "Confirme"
    "Cancelar?", // "Cancelar", "Cancelarr"
    "Modific[ae]r?", // "Modificar", "Modifique"
    "Agend[ae]r?", // "Agendar", "Agende"
    "Atenci[oó]n?", // "Atención", "Atencion"
    "Cliente[s]?", // "Clientes", "Cliente"
    "Servici[oó]s?", // "Servicios", "Servicio"
    "Calidad?", // "Calidad", "Calidadd"
    "Preci[oe]s?", // "Precios", "Precio"
    "Disponibilidad?", // "Disponibilidad", "Disponibilidadd"
    "Fecha[s]?", // "Fechas", "Fecha"
    "Hor[ae]s?", // "Horas", "Hora"
    "Tarjet[ae]s?", // "Tarjetas", "Tarjeta"
    "Pag[oe]s?", // "Pagos", "Pago"
    "Reseñas?", // "Reseñas", "Resenas"
    "Coment[ae]rios?", // "Comentarios", "Comentario"
    "Opini[oó]n?", // "Opinión", "Opinion"
    "Recomend[ae]r?", // "Recomendar", "Recomiende"
    "Encant[ae]d[oe]s?", // "Encantados", "Encantadas"
    "Gust[ae]r[ií]a?", // "Gustaría", "Gustaria"
    "Encarg[ae]d[oe]s?", // "Encargados", "Encargadas"
    "Atender?", // "Atender", "Attender"
    "Asist[ei]r?", // "Asistir", "Asistir"
    "Asist[ei]r[ei]r[ae]n?", // "Asistiremos", "Asistiran"
    "Lleg[ae]r[ae]n?", // "Llegaremos", "Llegaran"
    "Agradec[ei]d[oe]s?", // "Agradecidos", "Agradecidas"
  ];

  const names = matches.filter((n) => !commonWords.includes(n));
  return names.length > 0 ? names[0] : "";
}
