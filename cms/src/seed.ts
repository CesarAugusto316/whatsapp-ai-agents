import payload, { SanitizedConfig } from "payload";
import {
  MORNING_BLOCK,
  AFTERNOON_BLOCK,
  APPOINTMENT_DEFAULT,
} from "./collections/business/Businesses";

function nextSlot(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function makeTime(dayOffset: number, minuteOfDay: number) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + minuteOfDay * 60 * 1000);
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
  const minAppointmentsPerDay = 10;
  const maxAppointmentsPerDay = 20;

  // Define popular time slots to increase overlap probability
  const popularTimeSlots = [
    9 * 60, // 9:00 AM
    10 * 60, // 10:00 AM
    11 * 60, // 11:00 AM
    12 * 60, // 12:00 PM
    14.5 * 60, // 2:30 PM
    15 * 60, // 3:00 PM
    16 * 60, // 4:00 PM
    17 * 60, // 5:00 PM
    18 * 60, // 6:00 PM
    19 * 60, // 7:00 PM
  ];

  for (let day = 0; day < totalDays; day++) {
    // Determine how many appointments for this day (between 10-20)
    const appointmentsForDay =
      Math.floor(
        Math.random() * (maxAppointmentsPerDay - minAppointmentsPerDay + 1),
      ) + minAppointmentsPerDay;

    for (let apptIndex = 0; apptIndex < appointmentsForDay; apptIndex++) {
      // Randomly select a business
      const business =
        businesses[Math.floor(Math.random() * businesses.length)];

      // Randomly select a customer
      const customer = customers[Math.floor(Math.random() * customers.length)];

      // Select a time slot - with higher probability of selecting popular slots to create overlaps
      let selectedTimeSlot;
      if (Math.random() < 0.6) {
        // 60% chance of picking a popular time slot
        selectedTimeSlot =
          popularTimeSlots[Math.floor(Math.random() * popularTimeSlots.length)];
      } else {
        // Select from all possible time slots
        const allTimeSlots = [];

        // Add morning slots (every 30 mins from 8:00 to 11:30)
        for (let hour = 8; hour < 12; hour += 0.5) {
          allTimeSlots.push(Math.floor(hour * 60));
        }

        // Add afternoon slots (every 30 mins from 14:00 to 19:30)
        for (let hour = 14; hour < 20; hour += 0.5) {
          allTimeSlots.push(Math.floor(hour * 60));
        }

        selectedTimeSlot =
          allTimeSlots[Math.floor(Math.random() * allTimeSlots.length)];
      }

      // Create appointment at the selected time
      const start = makeTime(day, selectedTimeSlot);
      const duration = APPOINTMENT_DEFAULT; // 1 hour duration
      const end = nextSlot(start, duration);

      await payload.create({
        collection: "appointments",
        data: {
          business: business.id,
          customer: customer.id,
          customerName: customer.name,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          status: Math.random() < 0.3 ? "pending" : "confirmed", // 30% pending, 70% confirmed
          numberOfPeople: Math.floor(Math.random() * 9) + 2, // Between 2-10 people
          notes: "Seeded appointment",
          timezone: "Europe/Madrid",
        },
      });
    }
  }

  payload.logger.info("✅ Seed complete");
  process.exit(0);
};
