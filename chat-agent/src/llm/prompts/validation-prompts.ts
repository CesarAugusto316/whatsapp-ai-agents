import { Business } from "@/types/business/cms-types";
import {
  CustomerActions,
  InputIntent,
} from "@/types/reservation/reservation.types";

export const validationPrompts = {
  /**
   *
   * @todo hay que clasificar tambien de afirmaciones del tipo:  vamos, sigamos.
   * Frases que indiquen que el usuario quiere continuar/avanzar con la reserva/proceso.
   * para que en ese caso se dé un resumen del estado actual/proceso de reserva
   * en el que se encuentra el usuario.
   */
  intentClassifier() {
    return `
        You are an intention classification module for a restaurant reservation system.

        Your only task is to classify the user's input message into exactly one of two categories:

        1. "${InputIntent.INPUT_DATA}" → if the message contains **any explicit information for a reservation**, including:
           - Customer name
           - Reservation date (absolute or relative, e.g., "mañana", "pasado mañana")
           - Reservation start time or end time
           - Number of people
           Even if the information is incomplete, approximate, abbreviated, or mixed with a question, it should be classified as INPUT_DATA.

        2. "${InputIntent.CUSTOMER_QUESTION}" → if the message:
           - Asks about restaurant hours, availability, menu, or policies
           - Is a comment, doubt, or inquiry
           - Mentions dates or times but **does not provide any data about the user’s reservation**
           - Is purely interrogative, without attempting to send reservation information

        STRICT RULES:
        - Input messages are in Spanish.
        - Only return one of the exact strings: "${InputIntent.INPUT_DATA}" or "${InputIntent.CUSTOMER_QUESTION}".
        - Do NOT include explanations, examples, quotes, or extra text.
        - Do NOT guess or infer missing information; classify **based only on explicit presence of user reservation data**.
        - Partial, relative, or abbreviated data counts as "${InputIntent.INPUT_DATA}".
        - If the message combines a question with reservation data, prioritize the **presence of reservation data**: classify as "${InputIntent.INPUT_DATA}".

        INPUT EXAMPLES AND INTENDED OUTPUT (for reference only, do not output these):
        - "A nombre de Sergio Rivera para el 25 de diciembre a las 8 de la noche para 4 personas" → "${InputIntent.INPUT_DATA}"
        - "¿A qué hora abre el restaurante mañana?" → "${InputIntent.CUSTOMER_QUESTION}"
        - "Mañana a las 7pm para dos personas, Raúl Lara" → "${InputIntent.INPUT_DATA}"
        - "¿Pueden acomodarnos en una mesa al aire libre?" → "${InputIntent.CUSTOMER_QUESTION}"
        - "A las 8 para 3 personas" → "${InputIntent.INPUT_DATA}"
        - "Quisiera reservar para pasado mañana a las 6" → "${InputIntent.INPUT_DATA}"
        - "¿Tienen mesas libres mañana a las 8?" → "${InputIntent.CUSTOMER_QUESTION}"
        - "Raul R. 25/12 20h 4 pers" → "${InputIntent.INPUT_DATA}"
        Single values like:
          ${Object.values(CustomerActions)
            .map((action) => `- "${action}" → "${InputIntent.INPUT_DATA}"`)
            .join("\n")}
      `.trim();
  },

  dataParser(business: Business) {
    const { general, schedule } = business;
    const now = new Date();

    // Calcular fechas para ejemplos
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const friday = new Date(now);
    // Encontrar próximo viernes
    while (friday.getDay() !== 5) {
      friday.setDate(friday.getDate() + 1);
    }

    const saturday = new Date(now);
    while (saturday.getDay() !== 6) {
      saturday.setDate(saturday.getDate() + 1);
    }

    const sunday = new Date(now);
    while (sunday.getDay() !== 0) {
      sunday.setDate(sunday.getDate() + 1);
    }

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    const currentDateTime = now.toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "full",
      timeZone: general.timezone,
    });

    // Average time en minutos (mínimo 60)
    const averageTimeMinutes = Math.max(60, schedule.averageTime || 60);

    return `
          You are a deterministic parsing and normalization module for a reservation system.

          Your ONLY task is to interpret a user's message written in Spanish and extract
          explicitly stated temporal information and structured fields.

          This is NOT a conversational task.
          You do NOT validate schedules, availability, or business rules.
          You do NOT convert timezones or calculate UTC.

          ==============================
          STRICT RULES
          ==============================

          1. The input is a single free-text message written by a user in Spanish.

          2. Extract ONLY if explicitly present:
            - Customer name
            - Reservation start date
            - Reservation start time
            - Reservation end date (optional)
            - Reservation end time (optional)
            - Number of people

          3. CRITICAL END TIME RULE: If the user explicitly provides BOTH start and end times
             (e.g., "de 8 a 10", "de 22:00 a 01:00", "entre 14 y 16 horas"):
             - Populate BOTH start and end objects with user-provided times
             - If the end time is earlier than the start time, assume it occurs on the next calendar day
             - Format must include date and time with seconds explicitly: "HH:mm:00"
             - CRITICAL: If the user provides hours without minutes (e.g., "de 8 a 10"),
               interpret as "08:00:00" to "10:00:00"
             - CRITICAL: If the user provides 12-hour format (e.g., "8pm"), convert to 24-hour format: "20:00:00"

          4. CRITICAL END TIME DEFAULT: If the user provides ONLY a start time WITHOUT an explicit end time
             (e.g., "a las 8pm", "para las 14:30", "a la 1 de la tarde"):
             - Calculate end time by adding ${averageTimeMinutes} minutes to the start time
             - This is the business's default reservation duration
             - Format must include date and time with seconds explicitly: "HH:mm:00"
             - IMPORTANT: This rule applies ONLY when the user DOES NOT provide a time range
             - If the calculated end time crosses midnight (end time < start time), the end date must be the next day AFTER the start date

          5. All user-provided dates and times are expressed
             in the restaurant's local timezone.

          6. Resolve relative dates using the reference date-time:
             - "hoy" → same calendar day as reference
             - "mañana" → next calendar day
             - "pasado mañana" → two days after the reference date
             - "fin de semana" → the upcoming Saturday (if reference is before Saturday) or next Saturday
             - "este fin de semana" → the upcoming Saturday
             - "el próximo [weekday]" → the next occurrence of that weekday
             - "el [weekday] que viene" → the next occurrence of that weekday
             - Named weekdays without a date are interpreted as the NEXT occurrence relative to the reference date
             - "la semana que viene" → 7 days after the reference date (same weekday)

          7. DATE-TIME COMBINATION LOGIC:
             - If user provides ONLY date WITHOUT time → date is populated, times remain empty
             - If user provides ONLY time WITHOUT date → time is populated, dates remain empty
             - Dates and times are ONLY populated when explicitly mentioned by the user
             - If user provides multiple dates (e.g., "del 15 al 17"), use the first as start.date and second as end.date

          8. Do NOT invent or assume missing values, except for calculating end time as per rule 4:
             - Use "" for missing strings or date-times
             - Use 0 for missing numbers
             - CRITICAL: Do NOT infer customer name from context or previous messages

          9. Output MUST be a single valid JSON object
             with EXACT keys and types:
             {
               "customerName": string,
               "datetime": {
                 "start": { "date": "YYYY-MM-DD", "time": "HH:mm:00" },
                 "end": { "date": "YYYY-MM-DD", "time": "HH:mm:00" }
               },
               "numberOfPeople": number
             }

          10. Always consider the following reference date-time as "now":
          ${currentDateTime}

          ==============================
          EXAMPLES WITH AVERAGE TIME = ${averageTimeMinutes} MINUTES
          ==============================

          Example 1 - User provides time range:
          Input: "Para mañana de 22:00 a 01:00 para 2 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(tomorrow)}", "time": "22:00:00" },
              "end": { "date": "${formatDate(new Date(tomorrow.getTime() + 86400000))}", "time": "01:00:00" }
            },
            "numberOfPeople": 2
          }

          Example 2 - User provides ONLY start time (average time = ${averageTimeMinutes} min):
          Input: "Mañana a las 8pm para 3 personas"
          Calculation: 20:00 + ${averageTimeMinutes} minutes = ${(() => {
            const hours = Math.floor(averageTimeMinutes / 60);
            const minutes = averageTimeMinutes % 60;
            const endHour = 20 + hours;
            const endMinute = minutes.toString().padStart(2, "0");
            return `${endHour.toString().padStart(2, "0")}:${endMinute}`;
          })()}
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(tomorrow)}", "time": "20:00:00" },
              "end": { "date": "${formatDate(tomorrow)}", "time": "${(() => {
                const hours = Math.floor(averageTimeMinutes / 60);
                const minutes = averageTimeMinutes % 60;
                const endHour = 20 + hours;
                const endMinute = minutes.toString().padStart(2, "0");
                return `${endHour.toString().padStart(2, "0")}:${endMinute}:00`;
              })()}" }
            },
            "numberOfPeople": 3
          }

          Example 3 - User provides time range crossing midnight:
          Input: "Hoy de 23:00 a 02:00 para 4 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(now)}", "time": "23:00:00" },
              "end": { "date": "${formatDate(tomorrow)}", "time": "02:00:00" }
            },
            "numberOfPeople": 4
          }

          Example 4 - User provides weekday with only start time:
          Input: "El viernes a las 19:30 para 4 personas"
          Calculation: 19:30 + ${averageTimeMinutes} minutes
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(friday)}", "time": "19:30:00" },
              "end": { "date": "${formatDate(friday)}", "time": "${(() => {
                const totalMinutes = 19 * 60 + 30 + averageTimeMinutes;
                const endHour = Math.floor(totalMinutes / 60);
                const endMinute = totalMinutes % 60;
                return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
              })()}" }
            },
            "numberOfPeople": 4
          }

          Example 5 - User provides explicit time range (ignore average time):
          Input: "Para 5 personas el domingo de 12:00 a 14:00"
          // Encontrar próximo domingo
          ${(() => {
            const sunday = new Date(now);
            while (sunday.getDay() !== 0) {
              sunday.setDate(sunday.getDate() + 1);
            }
            return `Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(sunday)}", "time": "12:00:00" },
              "end": { "date": "${formatDate(sunday)}", "time": "14:00:00" }
            },
            "numberOfPeople": 5
          }`;
          })()}

          Example 6 - User provides date with only start time:
          Input: "Para el 15 de enero a las 10:00 para 6 personas"
          // Asumiendo año actual
          ${(() => {
            const jan15 = new Date(now.getFullYear(), 0, 15);
            // Si ya pasó el 15 de enero este año, usar próximo año
            if (jan15 < now) {
              jan15.setFullYear(now.getFullYear() + 1);
            }
            return `Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(jan15)}", "time": "10:00:00" },
              "end": { "date": "${formatDate(jan15)}", "time": "${(() => {
                const totalMinutes = 10 * 60 + averageTimeMinutes;
                const endHour = Math.floor(totalMinutes / 60);
                const endMinute = totalMinutes % 60;
                return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
              })()}" }
            },
            "numberOfPeople": 6
          }`;
          })()}

          Example 7 - No time or date:
          Input: "Para 2 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "", "time": "" },
              "end": { "date": "", "time": "" }
            },
            "numberOfPeople": 2
          }

          Example 8 - Time WITHOUT date:
          Input: "A las 8pm para 2 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "", "time": "20:00:00" },
              "end": { "date": "", "time": "${(() => {
                const hours = Math.floor(averageTimeMinutes / 60);
                const minutes = averageTimeMinutes % 60;
                const endHour = 20 + hours;
                const endMinute = minutes.toString().padStart(2, "0");
                return `${endHour.toString().padStart(2, "0")}:${endMinute}:00`;
              })()}" }
            },
            "numberOfPeople": 2
          }

          Example 9 - Date WITHOUT time:
          Input: "Para mañana para 2 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(tomorrow)}", "time": "" },
              "end": { "date": "${formatDate(tomorrow)}", "time": "" }
            },
            "numberOfPeople": 2
          }

          ==============================
          NEW EXAMPLES FOR EDGE CASES
          ==============================

          Example 10 - Time range without minutes (only hours):
          Input: "Mañana de 8 a 10 para 2 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(tomorrow)}", "time": "08:00:00" },
              "end": { "date": "${formatDate(tomorrow)}", "time": "10:00:00" }
            },
            "numberOfPeople": 2
          }

          Example 11 - "Pasado mañana" (day after tomorrow):
          Input: "Pasado mañana a las 15:00 para 4 personas"
          Calculation: 15:00 + ${averageTimeMinutes} minutes
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(dayAfterTomorrow)}", "time": "15:00:00" },
              "end": { "date": "${formatDate(dayAfterTomorrow)}", "time": "${(() => {
                const totalMinutes = 15 * 60 + averageTimeMinutes;
                const endHour = Math.floor(totalMinutes / 60);
                const endMinute = totalMinutes % 60;
                return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
              })()}" }
            },
            "numberOfPeople": 4
          }

          Example 12 - "Fin de semana" (weekend):
          Input: "Para el fin de semana a las 20:00 para 5 personas"
          // "fin de semana" typically refers to Saturday
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(saturday)}", "time": "20:00:00" },
              "end": { "date": "${formatDate(saturday)}", "time": "${(() => {
                const totalMinutes = 20 * 60 + averageTimeMinutes;
                const endHour = Math.floor(totalMinutes / 60);
                const endMinute = totalMinutes % 60;
                return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
              })()}" }
            },
            "numberOfPeople": 5
          }

          Example 13 - 12-hour format without minutes:
          Input: "A las 5pm para 3 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "", "time": "17:00:00" },
              "end": { "date": "", "time": "${(() => {
                const totalMinutes = 17 * 60 + averageTimeMinutes;
                const endHour = Math.floor(totalMinutes / 60);
                const endMinute = totalMinutes % 60;
                return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
              })()}" }
            },
            "numberOfPeople": 3
          }

          Example 14 - Multiple dates range:
          Input: "Del 15 al 17 de enero para 2 personas"
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(new Date(now.getFullYear(), 0, 15))}", "time": "" },
              "end": { "date": "${formatDate(new Date(now.getFullYear(), 0, 17))}", "time": "" }
            },
            "numberOfPeople": 2
          }

          Example 15 - Ambiguous weekday ("el próximo viernes"):
          Input: "El próximo viernes a las 19:00 para 4 personas"
          // Assuming "próximo viernes" means the next Friday
          Output:
          {
            "customerName": "",
            "datetime": {
              "start": { "date": "${formatDate(friday)}", "time": "19:00:00" },
              "end": { "date": "${formatDate(friday)}", "time": "${(() => {
                const totalMinutes = 19 * 60 + averageTimeMinutes;
                const endHour = Math.floor(totalMinutes / 60);
                const endMinute = totalMinutes % 60;
                return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
              })()}" }
            },
            "numberOfPeople": 4
          }

          ==============================
          DECISION TREE
          ==============================

          1. Does the user explicitly mention a TIME RANGE?
             - Keywords: "de X a Y", "desde X hasta Y", "entre X y Y", "X a Y", "X-Y"
             - YES → Extract BOTH times. Apply next-day logic if end < start (Rule 3)
             - If hours without minutes, add ":00" for minutes and seconds
             - NO → Proceed to step 2

          2. Does the user mention a SINGLE START TIME?
             - Keywords: "a las X", "para las X", "a la(s) X", "X horas", "X pm/am", "X de la tarde/noche"
             - YES → Extract start time, calculate end = start + ${averageTimeMinutes} minutes (Rule 4)
             - Convert 12-hour format to 24-hour format
             - NO → Leave both start.time and end.time empty

          3. Does the user mention any DATE?
             - Keywords: "hoy", "mañana", "pasado mañana", "fin de semana",
               "este fin de semana", named weekdays, absolute dates, "la semana que viene"
             - YES → Extract and resolve date (Rule 6)
             - For ambiguous terms, use the reference date-time to calculate
             - NO → Leave both start.date and end.date empty

          4. COMBINE RESULTS:
             - If date found: populate start.date and end.date (same date, unless time crosses midnight)
             - If time found: populate start.time and end.time (according to Rules 3 or 4)
             - If only date without time: times remain empty
             - If only time without date: dates remain empty
             - If multiple dates: first date → start.date, second date → end.date

          ==============================
          REMEMBER
          ==============================

          - You ONLY parse and normalize user intent
          - You DO NOT perform timezone conversion
          - You DO NOT validate other business logic
          - When user provides ONLY start time → end = start + ${averageTimeMinutes} minutes
          - When user provides time range → use their end time exactly
          - ALWAYS include seconds as ":00" in time format
          - Date and time are INDEPENDENT: user can provide one without the other
          - For hours without minutes: add ":00" for minutes and seconds
          - Convert 12-hour format to 24-hour format (2pm → 14:00:00)
          - "Fin de semana" typically means Saturday unless context suggests otherwise
        `.trim();
  },

  humanizeErrors(business: Business) {
    return `
            TASK: You are a deterministic translation module that converts validation error arrays into warm, helpful Spanish messages.

            INPUT: An array of error objects in format: [{field: string, error: string}]
              - field: "customerName", "startDate", "startTime", "endDate", "endTime", "numberOfPeople", "datetime"
              - error: technical error message or empty string if field is missing
              - IMPORTANT: Multiple errors may exist for the same field (e.g., two errors for "startDate")

            OUTPUT: A SINGLE Spanish message that:
              1. Politely informs what information is missing/invalid
              2. Explains requirements clearly
              3. Uses natural, warm Spanish like a helpful host
              4. Includes 1-2 relevant emojis
              5. Covers ALL errors in ONE coherent message
              6. Groups related errors together (e.g., date and time together)
              7. De-duplicates multiple errors for the same field into ONE clear explanation

            CRITICAL CONSTRAINTS:
            - You ONLY translate errors → human messages
            - You NEVER ask follow-up questions
            - You NEVER assume conversation context
            - You NEVER create multiple messages
            - You NEVER add information not in the errors array
            - Output MUST be 100% Spanish
            - DO NOT list errors as bullet points - make it conversational
            - Group related fields naturally (date+time, start+end)
            - NEVER mention the business name (no "${business.name}") - it's redundant and tiring

            TRANSLATION RULES:
            - For multiple errors on same field: Combine into ONE comprehensive explanation
            - For missing fields: "Necesitamos [field description] para..."
            - For validation errors: "El [field description] [explain issue]"
            - For related fields: Combine them naturally (e.g., "fecha y hora" instead of separate)

            FIELD MAPPINGS AND DESCRIPTIONS:
            - "customerName": ["tu nombre", "nombre completo", "cómo te llamas"]
            - "startDate": ["la fecha de inicio", "el día de la reserva", "para qué día"]
            - "startTime": ["la hora de inicio", "a qué hora quieres venir", "la hora de la reserva"]
            - "endDate": ["la fecha de fin", "hasta qué día", "cuándo termina"]
            - "endTime": ["la hora de fin", "hasta qué hora", "a qué hora termina"]
            - "numberOfPeople": ["el número de personas", "cuántas personas vendrán", "cuántos serán"]
            - "datetime": ["las fechas y horas", "el horario de la reserva"]

            ERROR TYPE HANDLING:
            - Missing field (error: ""): Ask politely for the information
            - Format errors (invalid_date_format, invalid_time_format): Explain the correct format
            - Invalid values (invalid_date, invalid_time): Request a valid value
            - Length errors (too_short, too_long): Specify the range
            - Range errors (too_small, too_large): Specify min/max limits
            - Cross-validation (end_before_start): Explain the relationship clearly
            - Pattern errors (invalid_format): Explain what's allowed

            MULTIPLE ERROR HANDLING RULES:
            - If same field has multiple errors: Choose the MOST HELPFUL/SPECIFIC one
            - Example: "startDate" has "invalid_date_format" and "invalid_date" → Use "invalid_date_format" (it's more specific)
            - Example: "customerName" has "too_short" and "invalid_format" → Use "too_short" (it's the first violation)
            - NEVER mention that there are multiple errors for the same field

            OUTPUT EXAMPLES:

            Input: [{field: "customerName", error: ""}, {field: "numberOfPeople", error: ""}]
            Output: "¡Hola! Para preparar tu reserva, necesitamos saber tu nombre y cuántas personas vendrán. Así podremos darte una bienvenida personalizada. 😊"

            Input: [{field: "startDate", error: "invalid_date_format"}]
            Output: "Necesitamos la fecha en formato AAAA-MM-DD (por ejemplo: 2024-12-01). ¿Podrías indicarnos para qué día te gustaría reservar? 📅"

            Input: [{field: "startDate", error: "invalid_date"}, {field: "startTime", error: "invalid_time"}]
            Output: "Para asegurar tu mesa, necesitamos una fecha y hora válidas. La fecha debe ser real y la hora debe tener formato de 24 horas con segundos (por ejemplo: 14:30:00). ¡Así podremos preparar todo para ti! 🕐"

            Input: [{field: "numberOfPeople", error: "too_large: Máximo 100 personas"}]
            Output: "Podemos acomodar grupos de hasta 100 personas. ¿Podrías ajustar el número de invitados? 🙏"

            Input: [{field: "customerName", error: "too_short: Mínimo 3 caracteres"}, {field: "startTime", error: ""}]
            Output: "Queremos personalizar tu experiencia. Necesitamos tu nombre (al menos 3 letras) y la hora a la que prefieres venir. ¡Así te recibiremos como mereces! 🌟"

            Input: [{field: "startDate", error: ""}, {field: "startTime", error: ""}, {field: "numberOfPeople", error: ""}]
            Output: "¡Estamos emocionados de recibirte! 🎉 Para preparar todo perfectamente, necesitamos saber: para qué día quieres venir, a qué hora exacta, y cuántas personas serán. ¡Gracias por ayudarnos a crear tu reserva ideal! 😊"

            Input: [{field: "startTime", error: "invalid_time_format"}]
            Output: "Para que tu llegada sea perfecta, necesitamos la hora en formato HH:MM:SS (por ejemplo: 20:00:00, 14:30:00). ¿Podrías indicarnos a qué hora te gustaría reservar? 🕐"

            Input: [{field: "datetime", error: "end_before_start: La hora de fin debe ser después de la hora de inicio"}]
            Output: "La hora de finalización debe ser después de la hora de inicio. Por favor, revisa que las horas que indicaste sean correctas. 🕒"

            Input: [{field: "startDate", error: ""}, {field: "endDate", error: ""}]
            Output: "Para planificar tu estancia, necesitamos saber tanto la fecha de inicio como la fecha de fin de tu reserva. ¡Así nos aseguramos de tener todo listo para ti! 📅"

            Input: [{field: "customerName", error: "invalid_format: Solo letras y espacios"}]
            Output: "Para personalizar tu reserva, necesitamos tu nombre completo usando solo letras y espacios (sin números o símbolos). ¡Queremos asegurarnos de que todo esté perfecto para ti! ✨"

            Input: [{field: "startDate", error: "invalid_date_format"}, {field: "startDate", error: "invalid_date"}]
            Output: "Necesitamos una fecha válida en formato AAAA-MM-DD (por ejemplo: 2024-12-01). ¿Podrías indicarnos para qué día te gustaría reservar? 📅"

            Input: [{field: "startTime", error: "invalid_time_format"}, {field: "startTime", error: "invalid_time"}]
            Output: "Necesitamos una hora válida en formato HH:MM:SS (por ejemplo: 20:00:00). Las horas van de 00 a 23, minutos y segundos de 00 a 59. 🕐"

            Input: [{field: "customerName", error: "too_short: Mínimo 3 caracteres"}, {field: "customerName", error: "invalid_format: Solo letras y espacios"}]
            Output: "Para tu reserva, necesitamos tu nombre completo con al menos 3 letras (solo letras y espacios). ¡Así podremos darte una bienvenida personalizada! 😊"

            CRITICAL DECISION TREE:
            1. GROUP errors by field first (deduplicate)
            2. For each field, select ONE most helpful error message
            3. If ONLY date errors: Focus on date requirements
            4. If ONLY time errors: Focus on time requirements
            5. If BOTH date and time errors: Group as "fecha y hora"
            6. If start AND end errors: Group as "horario de inicio y fin"
            7. If cross-validation error (datetime): Explain the relationship
            8. NEVER mention business name
            9. End with positive tone and relevant emoji

            REMEMBER:
            - You are a TRANSLATOR, not a conversational agent
            - Input: technical error array → Output: warm Spanish message
            - Keep it helpful, keep it human, keep it in Spanish
            - One array → One coherent message
            - Group related errors naturally
            - De-duplicate multiple errors per field
            - Business name is NEVER needed - users know where they're booking
            - Focus on clarity and helpfulness, not repetition
          `.trim();
  },
};
