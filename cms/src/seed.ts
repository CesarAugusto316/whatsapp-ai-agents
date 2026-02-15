import payload, { SanitizedConfig } from "payload";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  MORNING_BLOCK,
  AFTERNOON_BLOCK,
  APPOINTMENT_DEFAULT,
} from "./collections/business/Businesses";

function nextSlot(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function makeTime(
  dayOffset: number,
  minuteOfDay: number,
  timezone: string = "Europe/Madrid",
) {
  // Get the current date in the specified timezone
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);

  // Create a new date with the offset and set the time
  const d = new Date(zonedDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(0, 0, 0, 0);

  // Add the minutes of the day to get the actual time
  const result = new Date(d.getTime() + minuteOfDay * 60 * 1000);

  // Convert back to UTC for storage
  return fromZonedTime(result, timezone);
}

export const script = async (config: SanitizedConfig) => {
  await payload.init({ config });

  // ---- USERS ----
  await payload.create({
    collection: "users",
    data: {
      email: "riveramirandac@gmail.com",
      password: "demo",
      role: "admin",
      name: "César Rivera",
      phoneNumber: "+521234567890",
    },
  });
  await payload.create({
    collection: "users",
    data: {
      email: "admin_02@example.com",
      password: "demo",
      role: "admin",
      name: "admin_02",
      phoneNumber: "+521234567891",
    },
  });
  const businessUser = await payload.create({
    collection: "users",
    data: {
      email: "business_01@example.com",
      password: "demo",
      role: "business",
      name: "Business Owner",
      phoneNumber: "+521234567888",
    },
  });

  const businessUser2 = await payload.create({
    collection: "users",
    data: {
      email: "business_02@example.com",
      password: "demo",
      role: "business",
      name: "Business Owner 2",
      phoneNumber: "+521234567222",
    },
  });

  // THIRD PARTY ACCESS
  await payload.create({
    collection: "third-party-access",
    data: {
      apiKey: "f496a8d5-138f-42c5-b9c3-e3c89bbd6b8b",
      email: "riveramirandac@gmail.com",
      password: "demo",
    },
  });

  // ---- BUSINESSES ----
  const businesses = [];

  for (let i = 0; i < 5; i++) {
    const b = await payload.create({
      showHiddenFields: true,
      collection: "businesses",
      data: {
        name: `Pizzeria Italiana ${i + 1}`,
        assistantName: i < 2 ? "Rebeca" : "Paola",
        currency: "EUR",
        general: {
          phoneNumber: `+3411111111${i}`,
          businessType: "restaurant",
          description: `
            Ristorante Bella Forno nació hace más de 25 años en el corazón de la ciudad, inspirado en la tradición culinaria italiana que atraviesa generaciones. Desde sus primeros días, su fundador, Luca Romano, un apasionado chef de Nápoles, buscó traer los auténticos sabores de Italia a cada plato, combinando recetas clásicas con un toque de creatividad contemporánea.

            Cada pizza es elaborada con masa fresca, fermentada lentamente para lograr una textura crujiente por fuera y suave por dentro. Los ingredientes son seleccionados cuidadosamente: tomates San Marzano, mozzarella de búfala, aceite de oliva virgen extra, hierbas aromáticas frescas y embutidos artesanales. La combinación de estos elementos garantiza un sabor auténtico, lleno de aromas que transportan directamente a las trattorias italianas.
          `,
          timezone: "Europe/Madrid",
          isActive: true,
          requireAppointmentApproval: false,
          maxCapacity: 40,
          user: i < 2 ? businessUser.id : businessUser2.id,
        },
        schedule: {
          minDurationTime: APPOINTMENT_DEFAULT, // 1 hour
          maxDurationTime: APPOINTMENT_DEFAULT * 3, // 3 hours
          monday: [MORNING_BLOCK, AFTERNOON_BLOCK],
          tuesday: [MORNING_BLOCK, AFTERNOON_BLOCK],
          wednesday: [MORNING_BLOCK, AFTERNOON_BLOCK],
          thursday: [MORNING_BLOCK, AFTERNOON_BLOCK],
          friday: [MORNING_BLOCK, AFTERNOON_BLOCK],
          saturday: [MORNING_BLOCK],
          sunday: [],
        },
      },
    });

    businesses.push(b);
  }

  // ---- CUSTOMERS ----
  const customers = [];
  const realisticNames = [
    "María García",
    "Juan López",
    "Ana Martínez",
    "Carlos Rodríguez",
    "Laura Fernández",
    "David Sánchez",
    "Sofía Pérez",
    "Miguel González",
    "Elena Ruiz",
    "Javier Díaz",
    "Carmen Vázquez",
    "Antonio Jiménez",
    "Isabel Mendoza",
    "Francisco Herrera",
    "Patricia Romero",
    "Roberto Silva",
    "Claudia Torres",
    "Raúl Castro",
    "Verónica Ortega",
    "Andrés Núñez",
    "Natalia Medina",
    "Hugo Aguilar",
    "Paula Cortés",
    "Ricardo Iglesias",
    "Silvia Navarro",
    "Tomás Morales",
    "Beatriz Suárez",
    "Alberto Delgado",
    "Montserrat Valdez",
    "José Ramírez",
    "Lucía Campos",
    "Manuel Peña",
    "Rosa Cabrera",
    "Pedro Flores",
    "Teresa Santos",
    "Daniel Gutiérrez",
    "Adriana Márquez",
    "Guillermo Rincón",
    "Diana León",
    "Oscar Mendoza",
    "Gabriela Blanco",
    "Enrique Villa",
    "Miriam Pacheco",
    "Felipe Rosas",
    "Carolina Meza",
    "Samuel Salazar",
    "Yolanda Bustamante",
    "Leonardo Fuentes",
  ];

  for (let i = 0; i < 40; i++) {
    const realisticName = realisticNames[i % realisticNames.length];
    const c = await payload.create({
      collection: "customers",
      data: {
        name: realisticName,
        phoneNumber: `+349999999${i}`,
        email: `customer${i}@demo.com`,
        business: businesses[i % 5].id,
      },
    });

    customers.push(c);
  }

  // ---- APPOINTMENTS ----
  // Generate appointments for the next 30 days
  const totalDays = 30;
  const appointmentsPerBusinessPerDay = 30; // 30 appointments per business per day

  // Collect all appointments to be created in batches
  const allAppointmentsToCreate = [];

  // For each business, create appointments
  for (const business of businesses) {
    // Pre-calculate all valid time slots based on the business schedule
    // @ts-ignore
    const allTimeSlots = [];
    const scheduleDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    for (const dayName of scheduleDays) {
      // @ts-ignore
      const daySchedule = business?.schedule[dayName];
      if (daySchedule && Array.isArray(daySchedule)) {
        for (const block of daySchedule) {
          // Add slots in 30-minute increments within each block
          for (let time = block.open; time < block.close; time += 30) {
            // @ts-ignore
            if (!allTimeSlots.includes(time)) {
              allTimeSlots.push(time);
            }
          }
        }
      }
    }

    const timezone = business.general.timezone;

    for (let day = 0; day < totalDays; day++) {
      // Track capacity per hour to respect maxCapacity
      const hourlyCapacityTracker: { [key: string]: number } = {};

      for (
        let apptIndex = 0;
        apptIndex < appointmentsPerBusinessPerDay;
        apptIndex++
      ) {
        // Randomly select a customer
        const customer =
          customers[Math.floor(Math.random() * customers.length)];

        // Select a time slot within business hours
        const selectedTimeSlot =
          allTimeSlots[Math.floor(Math.random() * allTimeSlots.length)];

        // Create appointment at the selected time
        const start = makeTime(day, selectedTimeSlot, timezone);
        const duration = APPOINTMENT_DEFAULT; // 1 hour duration
        const end = nextSlot(start, duration);

        // Format the hour key for capacity tracking (YYYY-MM-DD HH format)
        const hourKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")} ${String(start.getHours()).padStart(2, "0")}`;

        // Determine number of people (between 2-10)
        const numberOfPeople = Math.floor(Math.random() * 9) + 2;

        // Check if adding this appointment would exceed max capacity for this hour
        const currentHourCapacity = hourlyCapacityTracker[hourKey] || 0;
        if (
          currentHourCapacity + numberOfPeople <=
          business.general.maxCapacity
        ) {
          // Update the capacity tracker
          hourlyCapacityTracker[hourKey] = currentHourCapacity + numberOfPeople;

          // Add appointment to batch instead of creating immediately
          allAppointmentsToCreate.push({
            collection: "appointments",
            data: {
              business: business.id,
              customer: customer.id,
              customerName: customer.name,
              startDateTime: start.toISOString(),
              endDateTime: end.toISOString(),
              status: Math.random() < 0.3 ? "pending" : "confirmed", // 30% pending, 70% confirmed
              numberOfPeople: numberOfPeople, // Between 2-10 people
              notes: "Seeded appointment",
              timezone: timezone,
            },
          });
        }
      }
    }
  }

  // Create all appointments at once in parallel to maximize performance in development
  await Promise.all(
    // @ts-ignore
    allAppointmentsToCreate.map((appointment) => payload.create(appointment)),
  );

  payload.logger.info("✅ Seed complete");
  process.exit(0);
};
