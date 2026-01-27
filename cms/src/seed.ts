import payload, { SanitizedConfig } from "payload";
import {
  MORNING_BLOCK,
  AFTERNOON_BLOCK,
  APPOINTMENT_DEFAULT,
} from "./collections/Businesses";

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
        general: {
          phoneNumber: `+3411111111${i}`,
          businessType: "restaurant",
          description: `
            MENÚ DE PIZZAS
            Pizzas Clásicas (Masa tradicional, 8 porciones):
            Margherita: Tomate, muzzarella, albahaca, aceite de oliva - $12,500
            Napolitana: Tomate, muzzarella, ajo, orégano, aceite - $13,200
            Fugazza: Cebolla caramelizada, muzzarella, orégano - $13,800 (Vegetariana. Opción con provolone +$1,500)
            Calabresa: Muzzarella, longaniza calabresa, cebolla - $15,500 (Picante leve)
            Pizzas Gourmet (Masa madre, 8 porciones):
            Prosciutto e Rúcula: Muzzarella, jamón crudo, rúcula, tomates cherry, parmesano - $18,900
            Champiñones Trufados: Muzzarella, champiñones portobello, crema de trufa, nueces - $19,500
            BBQ Pulled Pork: Muzzarella, pulled pork, salsa BBQ casera, cebolla morada - $17,800
            Pizzas Veganas (Masa sin queso animal, queso vegano):
            Vegana Clásica: Tomate, queso vegano, albahaca, champiñones - $14,500
            Vegana Picante: Queso vegano, tomate, cebolla, jalapeños, maíz - $15,200
            PERSONALIZACIÓN:
            Tipos de masa: Tradicional, Madre, Sin gluten
            Tamaños: Chica (4p), Mediana (6p), Grande (8p), Familiar (12p)
            Bordes: Normal, Relleno de queso (+$3,000), Relleno de provolone (+$4,000)
            Extra queso: +$2,500
            Ingredientes extra: $1,500 c/u (Opciones: jamón, morrones, aceitunas, pimiento, anchoas, bacon)
            TIEMPOS Y COSTOS DE DELIVERY:
            Standard: 45-60 minutos
            Express (+$3,000): 25-35 minutos (solo zonas cercanas)
            Pickup (Retiro): 20 minutos
            Pedido mínimo delivery: $10,000
            Recargo delivery: $2,000 (fijo en toda CABA)
            Delivery GRATIS en pedidos >$25,000
          `,
          timezone: "Europe/Madrid",
          isActive: true,
          requireAppointmentApproval: false,
          maxCapacity: 40,
          user: i < 2 ? businessUser.id : businessUser2.id,
        },
        schedule: {
          averageTime: APPOINTMENT_DEFAULT,
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
      },
    });
  }

  payload.logger.info("✅ Seed complete");
  process.exit(0);
};
