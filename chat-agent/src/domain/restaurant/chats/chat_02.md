Started development server: http://localhost:3000
╭─ 08:37:01
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.21s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "hola"
│ Trace ID: 9c3e0176
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"¡Hola Cesar Rivera! 😊 Soy Lua, aquí para ayudarte con cualquier pregunta que tengas sobre el sistema de reservas de Pizzeria El Hornero. \n\nPara hacer una reserva es super fácil:\n\n1️⃣ *Crear una reserva* 🍕✨\nPara iniciar, simplemente escribe **1** y luego el sistema te guiará paso a paso para ingresar tu nombre, la fecha, la hora y el número de personas. Luego te asistiré en cada detalle, ¡no te preocupes! 🚀","metadata":{"description":"INITIALIZATION, chatHistoryCache.length = 0","internal":"isFirstMessage=true"}}}}
│ Duration: 5206.17
╰─
╭─ 08:37:10
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (3.05s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "solo escribo el numero 1? nada mas?"
│ Trace ID: 6ca70336
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"Sí, Cesar Rivera, solo tienes que escribir el número **1** y el sistema te guiará a través del proceso de reserva sin necesidad de proporcionar más información. 🎉","metadata":{"description":"WHAT_IS_THE_SYSTEM, option selected","internal":"customerMessage=WHAT"}}}}
│ Duration: 3054.87
╰─
╭─ 08:37:25
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (3.80s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "1"
│ Trace ID: c0566be6
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"🌟 ¡Perfecto! Para reservar en nuestro restaurante es muy fácil, solo dime:\n\n📅 *El día* que te gustaría cenar  \n⏰ *La hora* preferida  \n👥 *Cuántas personas* serán\n\nPor ejemplo:\n- \"El 25 de diciembre a las 7pm para 2 personas\"\n- \"Mañana a las 8pm para 4 personas\"\n\nEstoy aquí para ayudarte a encontrar la opción ideal. 🍽️✨","metadata":{"description":"MAKE_RESERVATION, option selected","internal":"customerMessage=1"}}}}
│ Duration: 3804.22
╰─
[DEBUG] Zod failed to parse customer data {
  "customerMessage": "para 2 personas",
  "previousState": {
    "customerName": "Cesar Rivera",
    "datetime": {
      "start": {
        "date": "",
        "time": ""
      },
      "end": {
        "date": "",
        "time": ""
      }
    },
    "numberOfPeople": 0
  },
  "parsedData": {
    "success": false,
    "errors": [
      {
        "path": [
          "datetime",
          "start",
          "date"
        ],
        "code": "invalid_format",
        "message": "invalid_date_format"
      },
      {
        "path": [
          "datetime",
          "start",
          "date"
        ],
        "code": "custom",
        "message": "invalid_date"
      },
      {
        "path": [
          "datetime",
          "start",
          "time"
        ],
        "code": "invalid_format",
        "message": "invalid_time_format"
      },
      {
        "path": [
          "datetime",
          "start",
          "time"
        ],
        "code": "custom",
        "message": "invalid_time"
      },
      {
        "path": [
          "datetime",
          "end",
          "date"
        ],
        "code": "invalid_format",
        "message": "invalid_date_format"
      },
      {
        "path": [
          "datetime",
          "end",
          "date"
        ],
        "code": "custom",
        "message": "invalid_date"
      },
      {
        "path": [
          "datetime",
          "end",
          "time"
        ],
        "code": "invalid_format",
        "message": "invalid_time_format"
      },
      {
        "path": [
          "datetime",
          "end",
          "time"
        ],
        "code": "custom",
        "message": "invalid_time"
      }
    ]
  }
}
[DEBUG] Errors mapped completed [
  {
    "field": "startDate",
    "error": "invalid_date_format"
  },
  {
    "field": "startTime",
    "error": "invalid_time_format"
  },
  {
    "field": "endDate",
    "error": "invalid_date_format"
  },
  {
    "field": "endTime",
    "error": "invalid_time_format"
  }
]
╭─ 08:37:44
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (11.20s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "para 2 personas"
│ Trace ID: 3c068c65
│ State: [object Object]
│ Response: {"bag":{"execute:early_conditions":{"continue":true,"metadata":{"description":"NO_CONDITION_MATCH"}},"execute:collect_and_validate":{"result":"¡Hola! Parece que hay algunos problemas con la información que me has proporcionado. 🙏\n\nPrimero, ¿para qué día te gustaría reservar? Por ejemplo: mañana, el próximo viernes o el 10 de enero. 📅\n\nY si es por varios días, ¿hasta cuándo? Por ejemplo: \"mañana\" o \"del 10 al 12 de enero\". 📅\n\nA qué hora prefieres? Por ejemplo: a las 7pm, a las 14:30 o en la tarde. 🕐\n\nY por último, ¿hasta qué hora? Por ejemplo: hasta las 10pm o por 2 horas. 🕒\n\nPor último, ¿para cuántas personas sería la reserva? Por ejemplo: para 2 personas o somos 4. 😊\n\nPor favor, verifica la información y házmela saber. Estoy aquí para ayudarte a que tu reserva quede perfecta. 🎉","continue":false,"metadata":{"description":"COLLECTING_MISSING_DATA","internal":[{"path":["datetime","start","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","start","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","start","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","start","time"],"code":"custom","message":"invalid_time"},{"path":["datetime","end","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","end","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","end","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","end","time"],"code":"custom","message":"invalid_time"}]}}},"lastStepResult":{"execute":{"result":"¡Hola! Parece que hay algunos problemas con la información que me has proporcionado. 🙏\n\nPrimero, ¿para qué día te gustaría reservar? Por ejemplo: mañana, el próximo viernes o el 10 de enero. 📅\n\nY si es por varios días, ¿hasta cuándo? Por ejemplo: \"mañana\" o \"del 10 al 12 de enero\". 📅\n\nA qué hora prefieres? Por ejemplo: a las 7pm, a las 14:30 o en la tarde. 🕐\n\nY por último, ¿hasta qué hora? Por ejemplo: hasta las 10pm o por 2 horas. 🕒\n\nPor último, ¿para cuántas personas sería la reserva? Por ejemplo: para 2 personas o somos 4. 😊\n\nPor favor, verifica la información y házmela saber. Estoy aquí para ayudarte a que tu reserva quede perfecta. 🎉","continue":false,"metadata":{"description":"COLLECTING_MISSING_DATA","internal":[{"path":["datetime","start","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","start","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","start","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","start","time"],"code":"custom","message":"invalid_time"},{"path":["datetime","end","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","end","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","end","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","end","time"],"code":"custom","message":"invalid_time"}]}}}}
│ Duration: 11201.76
╰─
[DEBUG] ✅ Reservation data validated {
  "reservation": {
    "businessId": "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
    "customerId": "1cf18943-2a2b-46de-b9fb-5407afce47ae",
    "customerName": "Cesar Rivera",
    "status": "MAKE_STARTED",
    "datetime": {
      "start": {
        "date": "2026-01-26",
        "time": "18:00:00"
      },
      "end": {
        "date": "2026-01-26",
        "time": "19:00:00"
      }
    },
    "numberOfPeople": 2
  }
}
╭─ 08:39:41
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (13.01s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "para el 26 de enero a las 6pm"
│ Trace ID: fc5cd779
│ State: [object Object]
│ Response: {"bag":{"execute:early_conditions":{"continue":true,"metadata":{"description":"NO_CONDITION_MATCH"}},"execute:collect_and_validate":{"data":{"customerName":"Cesar Rivera","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2},"continue":true,"metadata":{"description":"COLLECTED_DATA"}},"execute:check_availability":{"result":"¡Hola Cesar! 🌟\n\n¡Perfecto, ya tenemos todos los datos listos para tu reserva! 🎉\n\n👤 *Nombre*: Cesar Rivera\n⏰ *Hora de entrada*: Lunes 26 de enero del 2026, 11:00 pm\n⏰ *Hora de salida*: Martes 27 de enero del 2026, 12:00 am\n👥 *Número de personas*: 2\n\n¡Perfecto? 🤔 Si todo está correcto, solo tienes que escribir:\n\n✅ **CONFIRMAR** para finalizar la reserva.\n\nSi necesitas hacer algún cambio, no dudes en decirlo y te ayudaré a corregirlo. Solo escribe:\n\n✏️ **REINGRESAR** para volver a editar los datos.\n\nY si ya no quieres continuar con la reserva, simplemente escribe:\n\n🚪 **SALIR** y te despediré.\n\nEstoy aquí para ayudarte, Cesar. ¡Que disfrutes tu experiencia en el restaurante! 😊✨","data":{"customerName":"Cesar Rivera","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2},"shouldTransition":true,"continue":false,"metadata":{"description":"DATA_VALIDATED","internal":"MAKE_VALIDATED"}}},"lastStepResult":{"execute":{"result":"¡Hola Cesar! 🌟\n\n¡Perfecto, ya tenemos todos los datos listos para tu reserva! 🎉\n\n👤 *Nombre*: Cesar Rivera\n⏰ *Hora de entrada*: Lunes 26 de enero del 2026, 11:00 pm\n⏰ *Hora de salida*: Martes 27 de enero del 2026, 12:00 am\n👥 *Número de personas*: 2\n\n¡Perfecto? 🤔 Si todo está correcto, solo tienes que escribir:\n\n✅ **CONFIRMAR** para finalizar la reserva.\n\nSi necesitas hacer algún cambio, no dudes en decirlo y te ayudaré a corregirlo. Solo escribe:\n\n✏️ **REINGRESAR** para volver a editar los datos.\n\nY si ya no quieres continuar con la reserva, simplemente escribe:\n\n🚪 **SALIR** y te despediré.\n\nEstoy aquí para ayudarte, Cesar. ¡Que disfrutes tu experiencia en el restaurante! 😊✨","data":{"customerName":"Cesar Rivera","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2},"shouldTransition":true,"continue":false,"metadata":{"description":"DATA_VALIDATED","internal":"MAKE_VALIDATED"}}}}
│ Duration: 13005.94
╰─
[DEBUG] Reservation not found
╭─ 08:40:21
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.01s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "solo escribir confirmar?"
│ Trace ID: 4047e89c
│ State: [object Object]
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"🌟 ¡Perfecto! Solo tienes que escribir **CONFIRMAR** para finalizar y confirmar tu reserva para el 26 de enero a las 6 pm, para 2 personas. 😊\n\nSi tienes alguna otra pregunta o necesitas ayuda adicional, no dudes en decírmelo. ¡Estoy aquí para ayudarte! 🍕✨\n\n✅ *Datos validados correctamente.*\n¿Quieres confirmar la reserva?\n\nPara continuar, escribe:\n• CONFIRMAR\n• REINGRESAR\n• SALIR","metadata":{"description":"HOW_SYSTEM_WORKS, option selected","internal":"customerMessage=HOW"}}}}
│ Duration: 5014.44
╰─
[DEBUG] Customer selected an option {
  "customerAction": "CONFIRMAR",
  "customerMessage": "Confirmar"
}
╭─ 08:40:53
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.92s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "Confirmar"
│ Trace ID: 14f4fa7e
│ State: [object Object]
│ Response: {"bag":{"execute:CONFIRM":{"reservation":{"id":"b66d94ae-7e25-4335-99c6-631114550bb4","business":"71358eb4-b61e-418d-a2fe-e34b8e5c5e6c","customer":"1cf18943-2a2b-46de-b9fb-5407afce47ae","customerName":"Cesar Rivera","startDateTime":"2026-01-26T22:00:00.000Z","endDateTime":"2026-01-26T23:00:00.000Z","status":"confirmed","numberOfPeople":2,"notes":null,"updatedAt":"2026-01-22T13:40:47.597Z","createdAt":"2026-01-22T13:40:47.596Z"},"continue":true},"execute:CONFIRM:SEND_MESSAGE":{"result":"Perfecto, Cesar! 🎉 Tu reserva ha sido creada con éxito. 🙌\n\n👤 Nombre: Cesar Rivera  \n⏰ Hora de entrada: Lunes 26 de enero del 2026, 11:00 pm  \n⏰ Hora de salida: Martes 27 de enero del 2026, 12:00 am  \n👥 Personas: 2  \n\n🆔 ID de reserva: b66d94ae-7e25-4335-99c6-631114550bb4  \n\n¡Recuerda guardar este ID para presentarlo en el restaurante el día de tu llegada 🍽️. Estoy aquí para ayudarte si necesitas algo más. 😊✨","continue":false}},"lastStepResult":{"execute":{"result":"Perfecto, Cesar! 🎉 Tu reserva ha sido creada con éxito. 🙌\n\n👤 Nombre: Cesar Rivera  \n⏰ Hora de entrada: Lunes 26 de enero del 2026, 11:00 pm  \n⏰ Hora de salida: Martes 27 de enero del 2026, 12:00 am  \n👥 Personas: 2  \n\n🆔 ID de reserva: b66d94ae-7e25-4335-99c6-631114550bb4  \n\n¡Recuerda guardar este ID para presentarlo en el restaurante el día de tu llegada 🍽️. Estoy aquí para ayudarte si necesitas algo más. 😊✨","continue":false}}}
│ Duration: 5917.82
╰─
