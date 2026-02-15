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

  for (let i = 0; i < 40; i++) {
    const c = await payload.create({
      collection: "customers",
      data: {
        name: `Customer ${i + 1}`,
        phoneNumber: `+349999999${i}`,
        email: `customer${i}@demo.com`,
        business: businesses[i % 5].id,
      },
    });

    customers.push(c);
  }

  // ---- APPOINTMENTS ----
  let day = 0;
  let toggle = true;

  for (let i = 0; i < 120; i++) {
    const business = businesses[i % 5];
    const customer = customers[i % 40];

    const block = toggle ? MORNING_BLOCK : AFTERNOON_BLOCK;
    toggle = !toggle;

    const start = makeTime(day, block.open);
    const end = nextSlot(start, APPOINTMENT_DEFAULT);

    if (i % 2 === 0) day++;

    await payload.create({
      collection: "appointments",
      data: {
        business: business.id,
        customer: customer.id,
        customerName: customer.name,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        status: i % 3 === 0 ? "pending" : "confirmed",
        numberOfPeople: (i % 4) + 1,
        notes: "Seeded appointment",
        timezone: "Europe/Madrid",
      },
    });
  }

  payload.logger.info("✅ Seed complete");
  process.exit(0);
};
