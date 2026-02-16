Started development server: http://localhost:3000
╭─ 15:08:55
│ ERROR POST /test-ai/non-existent-business-id-12345 500 (3.14s)
│ Business: non-existent-business-id-12345
│ Customer: +3455555555
│ Content: "hola"
│ Trace ID: 49c94b92
│ Response: {"error":"Error 404: Not Found"}
│ Duration: 3140.52
╰─
[ERROR_DETAIL] {
  "timestamp": "2026-01-22T20:08:55.112Z",
  "level": "ERROR",
  "traceId": "49c94b92",
  "path": "/test-ai/non-existent-business-id-12345",
  "status": 500,
  "errorBody": "{\"error\":\"Error 404: Not Found\"}"
}
╭─ 15:08:55
│ WARN POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 400 (1ms)
│ Trace ID: 6428d8ae
│ Response: {"error":"Customer message not received"}
│ Duration: 0.57
╰─
[ERROR_DETAIL] {
  "timestamp": "2026-01-22T20:08:55.117Z",
  "level": "ERROR",
  "traceId": "6428d8ae",
  "path": "/test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
  "status": 400,
  "errorBody": "{\"error\":\"Customer message not received\"}"
}
╭─ 15:09:00
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.36s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "hola"
│ Trace ID: 7472b2ba
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"¡Hola Cesar Rivera! 😊 Soy Lua, aquí para ayudarte con todo lo relacionado con la reserva de tu mesa en Pizzeria El Hornero.\n\nPara comenzar es muy fácil: solo necesitas escribir el número **1** para iniciar el proceso de creación de tu reserva. 🍕✨\n\nUna vez que escribas ese número, te guiaré paso a paso para ingresar la fecha, hora y el número de personas en tu grupo. Todo es sencillo y rápido, así que no dudes en hacerlo. 🤗\n\n¿Qué te parece? ¿Estás listo para reservar tu mesa? 😄","metadata":{"description":"INITIALIZATION, chatHistoryCache.length = 0","internal":"isFirstMessage=true"}}}}
│ Duration: 5363.33
╰─
╭─ 15:09:06
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.53s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "solo escribo el numero 1? nada mas?"
│ Trace ID: ff5c2c2a
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"¡Sí Cesar! 🎉 Solo tienes que escribir el número **1** para iniciar el proceso de reserva. Después de hacerlo, te guiaré a través de los pasos para completarla con la fecha, hora y el número de personas en tu grupo. Todo muy fácil y rápido. 🍕✅\n\nEstoy aquí para ayudarte cada paso del camino, así que si tienes alguna pregunta mientras avanzas, no dudes en decírmelo. ¿Estás listo para comenzar? 😊","metadata":{"description":"WHAT_IS_THE_SYSTEM, option selected","internal":"customerMessage=WHAT"}}}}
│ Duration: 5529.85
╰─
╭─ 15:09:10
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (3.99s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "1"
│ Trace ID: 3fa5390d
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"🌟 ¡Perfecto! Para reservar en nuestro restaurante es muy fácil, solo dime:\n\n📅 *El día* que te gustaría cenar  \n⏰ *La hora* preferida  \n👥 *Cuántas personas* serán\n\nPor ejemplo:\n- \"El 25 de diciembre a las 7pm para 2 personas\"\n- \"Mañana a las 8pm para 4 personas\"\n\nEstoy aquí para ayudarte a encontrar la opción ideal. 🍽️✨","metadata":{"description":"MAKE_RESERVATION, option selected","internal":"customerMessage=1"}}}}
│ Duration: 3986.22
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
╭─ 15:09:21
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (11.98s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "para 2 personas"
│ Trace ID: dab58ff0
│ State: {"businessId":"71358eb4-b61e-418d-a2fe-e34b8e5c5e6c","customerId":"1cf18943-2a2b-46de-b9fb-5407afce47ae","customerName":"Cesar Rivera","status":"MAKE_STARTED"}
│ Response: {"bag":{"execute:early_conditions":{"continue":true,"metadata":{"description":"NO_CONDITION_MATCH"}},"execute:collect_and_validate":{"result":"¡Hola! Parece que hay algunos problemas con la información que has proporcionado. Estoy aquí para ayudarte a solucionarlos 😊. \n\n¿Podrías decirme **para qué día te gustaría reservar?** Por ejemplo: mañana, el próximo viernes o el 10 de enero. 📅\n\nY si es por varios días, ¿hasta cuándo? Por ejemplo: \"mañana\" o \"del 10 al 12 de enero\". 📅\n\nTambién me gustaría saber **a qué hora prefieres**. Por ejemplo: a las 7pm, a las 14:30 o en la tarde. 🕐\n\nFinalmente, ¿para cuántas personas sería la reserva? Por ejemplo: para 2 personas o somos 4. 😊\n\nUna vez que proporciones estos detalles, podré confirmar tu reserva sin problemas. ¿Te gustaría que revisara los datos que me has proporcionado?","continue":false,"metadata":{"description":"COLLECTING_MISSING_DATA","internal":[{"path":["datetime","start","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","start","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","start","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","start","time"],"code":"custom","message":"invalid_time"},{"path":["datetime","end","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","end","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","end","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","end","time"],"code":"custom","message":"invalid_time"}]}}},"lastStepResult":{"execute":{"result":"¡Hola! Parece que hay algunos problemas con la información que has proporcionado. Estoy aquí para ayudarte a solucionarlos 😊. \n\n¿Podrías decirme **para qué día te gustaría reservar?** Por ejemplo: mañana, el próximo viernes o el 10 de enero. 📅\n\nY si es por varios días, ¿hasta cuándo? Por ejemplo: \"mañana\" o \"del 10 al 12 de enero\". 📅\n\nTambién me gustaría saber **a qué hora prefieres**. Por ejemplo: a las 7pm, a las 14:30 o en la tarde. 🕐\n\nFinalmente, ¿para cuántas personas sería la reserva? Por ejemplo: para 2 personas o somos 4. 😊\n\nUna vez que proporciones estos detalles, podré confirmar tu reserva sin problemas. ¿Te gustaría que revisara los datos que me has proporcionado?","continue":false,"metadata":{"description":"COLLECTING_MISSING_DATA","internal":[{"path":["datetime","start","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","start","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","start","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","start","time"],"code":"custom","message":"invalid_time"},{"path":["datetime","end","date"],"code":"invalid_format","message":"invalid_date_format"},{"path":["datetime","end","date"],"code":"custom","message":"invalid_date"},{"path":["datetime","end","time"],"code":"invalid_format","message":"invalid_time_format"},{"path":["datetime","end","time"],"code":"custom","message":"invalid_time"}]}}}}
│ Duration: 11979.81
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
╭─ 15:09:33
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (11.47s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "Para el 26 de enero a las 6pm"
│ Trace ID: fc68cc4d
│ State: {"businessId":"71358eb4-b61e-418d-a2fe-e34b8e5c5e6c","customerId":"1cf18943-2a2b-46de-b9fb-5407afce47ae","customerName":"Cesar Rivera","status":"MAKE_STARTED","datetime":{"start":{"date":"","time":""},"end":{"date":"","time":""}},"numberOfPeople":2}
│ Response: {"bag":{"execute:early_conditions":{"continue":true,"metadata":{"description":"NO_CONDITION_MATCH"}},"execute:collect_and_validate":{"data":{"customerName":"Cesar Rivera","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2},"continue":true,"metadata":{"description":"COLLECTED_DATA"}},"execute:check_availability":{"result":"¡Hola Cesar! 🌟\n\nPerfecto, ya tenemos todos los datos listos para tu reserva. 🎉\n\n👤 *Nombre*: Cesar Rivera\n📆 Día : 26 de enero del 2026\n⏰ Hora de *entrada*: 18:00\n⏰ Hora de *salida*: 19:00\n👥 *Número de personas*: 2\n\nSi todo está correcto, solo tienes que escribir:\n✅ *CONFIRMAR*\n\nSi necesitas hacer algún cambio, no dudes en decirlo y te ayudaré a corregirlo. Simplemente escribe:\n✏️ *REINGRESAR*\n\nY si por el momento no deseas continuar con la reserva, puedes decir:\n🚪 *SALIR*\n\nEstoy aquí para ayudarte y asegurarme de que tengas una experiencia maravillosa en nuestro restaurante. 😊✨","data":{"customerName":"Cesar Rivera","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2},"shouldTransition":true,"continue":false,"metadata":{"description":"DATA_VALIDATED","internal":"MAKE_VALIDATED"}}},"lastStepResult":{"execute":{"result":"¡Hola Cesar! 🌟\n\nPerfecto, ya tenemos todos los datos listos para tu reserva. 🎉\n\n👤 *Nombre*: Cesar Rivera\n📆 Día : 26 de enero del 2026\n⏰ Hora de *entrada*: 18:00\n⏰ Hora de *salida*: 19:00\n👥 *Número de personas*: 2\n\nSi todo está correcto, solo tienes que escribir:\n✅ *CONFIRMAR*\n\nSi necesitas hacer algún cambio, no dudes en decirlo y te ayudaré a corregirlo. Simplemente escribe:\n✏️ *REINGRESAR*\n\nY si por el momento no deseas continuar con la reserva, puedes decir:\n🚪 *SALIR*\n\nEstoy aquí para ayudarte y asegurarme de que tengas una experiencia maravillosa en nuestro restaurante. 😊✨","data":{"customerName":"Cesar Rivera","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2},"shouldTransition":true,"continue":false,"metadata":{"description":"DATA_VALIDATED","internal":"MAKE_VALIDATED"}}}}
│ Duration: 11465.39
╰─
[DEBUG] Reservation not found
╭─ 15:09:38
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.02s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "solo escribir confirmar?"
│ Trace ID: 23724a7b
│ State: {"businessId":"71358eb4-b61e-418d-a2fe-e34b8e5c5e6c","customerId":"1cf18943-2a2b-46de-b9fb-5407afce47ae","customerName":"Cesar Rivera","status":"MAKE_VALIDATED","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2}
│ Response: {"bag":{},"lastStepResult":{"execute":{"result":"🎉 ¡Perfecto! Solo tienes que escribir **\"CONFIRMAR\"** para proceder con tu reserva. 😊\n\nUna vez que lo hagas, te confirmaré que tu mesa está lista para el 26 de enero a las 6pm para 2 personas. 🍕✨\n\nEstoy aquí para asegurar que todo salga perfecto. ¡Espero contarte pronto! 🍕👨‍🍳\n\n✅ *Datos validados correctamente.*\n¿Quieres confirmar la reserva?\n\nPara continuar, escribe:\n• CONFIRMAR\n• REINGRESAR\n• SALIR","metadata":{"description":"WHAT_IS_THE_SYSTEM, option selected","internal":"intent=WHAT"}}}}
│ Duration: 5015.46
╰─
[DEBUG] ✨Creating reservation, payload {
  "business": "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
  "customer": "1cf18943-2a2b-46de-b9fb-5407afce47ae",
  "startDateTime": "2026-01-26T17:00:00.000Z",
  "endDateTime": "2026-01-26T18:00:00.000Z",
  "customerName": "Cesar Rivera",
  "numberOfPeople": 2,
  "status": "confirmed"
}
[DEBUG] ✨Reservation created, response {
  "id": "f659290a-1851-48f2-b8c2-5c6f6c45d221",
  "business": "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c",
  "customer": "1cf18943-2a2b-46de-b9fb-5407afce47ae",
  "customerName": "Cesar Rivera",
  "startDateTime": "2026-01-26T17:00:00.000Z",
  "endDateTime": "2026-01-26T18:00:00.000Z",
  "status": "confirmed",
  "numberOfPeople": 2,
  "notes": null,
  "updatedAt": "2026-01-22T20:09:38.530Z",
  "createdAt": "2026-01-22T20:09:38.529Z"
}
[DEBUG] Customer selected an option {
  "customerAction": "CONFIRMAR",
  "customerMessage": "Confirmar"
}
╭─ 15:09:43
│ INFO POST /test-ai/71358eb4-b61e-418d-a2fe-e34b8e5c5e6c 200 (5.42s)
│ Business: 71358eb4-b61e-418d-a2fe-e34b8e5c5e6c
│ Customer: +3455555555
│ Content: "Confirmar"
│ Trace ID: 0f0efa30
│ State: {"businessId":"71358eb4-b61e-418d-a2fe-e34b8e5c5e6c","customerId":"1cf18943-2a2b-46de-b9fb-5407afce47ae","customerName":"Cesar Rivera","status":"MAKE_VALIDATED","datetime":{"start":{"date":"2026-01-26","time":"18:00:00"},"end":{"date":"2026-01-26","time":"19:00:00"}},"numberOfPeople":2}
│ Response: {"bag":{"execute:CONFIRM":{"reservation":{"id":"f659290a-1851-48f2-b8c2-5c6f6c45d221","business":"71358eb4-b61e-418d-a2fe-e34b8e5c5e6c","customer":"1cf18943-2a2b-46de-b9fb-5407afce47ae","customerName":"Cesar Rivera","startDateTime":"2026-01-26T17:00:00.000Z","endDateTime":"2026-01-26T18:00:00.000Z","status":"confirmed","numberOfPeople":2,"notes":null,"updatedAt":"2026-01-22T20:09:38.530Z","createdAt":"2026-01-22T20:09:38.529Z"},"continue":true},"execute:CONFIRM:SEND_MESSAGE":{"result":"Perfecto, Cesar! 🎉 Tu reserva ha sido creada con éxito. 🙌\n\nAquí tienes los detalles de tu reserva:\n\n👤 Nombre: Cesar Rivera  \n📆 Fecha: 26 de enero del 2026  \n⏰ Hora de entrada: 18:00  \n⏰ Hora de salida: 19:00  \n👥 Personas: 2  \n\n🆔 ID de reserva: f659290a-1851-48f2-b8c2-5c6f6c45d221\n\n¡No olvides guardar este ID para presentarlo en el restaurante el día de tu llegada 🍽️. Estamos esperando verte! 😊✨","continue":false}},"lastStepResult":{"execute":{"result":"Perfecto, Cesar! 🎉 Tu reserva ha sido creada con éxito. 🙌\n\nAquí tienes los detalles de tu reserva:\n\n👤 Nombre: Cesar Rivera  \n📆 Fecha: 26 de enero del 2026  \n⏰ Hora de entrada: 18:00  \n⏰ Hora de salida: 19:00  \n👥 Personas: 2  \n\n🆔 ID de reserva: f659290a-1851-48f2-b8c2-5c6f6c45d221\n\n¡No olvides guardar este ID para presentarlo en el restaurante el día de tu llegada 🍽️. Estamos esperando verte! 😊✨","continue":false}}}
│ Duration: 5424.84
╰─
