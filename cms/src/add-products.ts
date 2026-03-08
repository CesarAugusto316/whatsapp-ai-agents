import payload, { SanitizedConfig } from "payload";
import { readFileSync } from "fs";
import { join } from "path";

export const script = async (config: SanitizedConfig) => {
  await payload.init({ config });

  // Find the first 2 businesses (Pizzeria Italiana 1 and 2)
  const businessesResult = await payload.find({
    collection: "businesses",
    where: {
      name: {
        in: ["Pizzeria Italiana 1", "Pizzeria Italiana 2"],
      },
    },
    limit: 2,
  });

  const businesses = businessesResult.docs;

  if (businesses.length === 0) {
    payload.logger.error(
      "❌ No se encontraron los negocios 'Pizzeria Italiana 1' o 'Pizzeria Italiana 2'. Ejecuta el seed primero.",
    );
    process.exit(1);
  }

  payload.logger.info(
    `✅ Negocios encontrados: ${businesses.map((b) => b.name).join(", ")}`,
  );

  // ---- PRODUCTS ----
  // Create realistic pizza restaurant products for each business
  const pizzaProducts = [
    {
      name: "Pizza Margherita",
      description:
        "La clásica italiana. Salsa de tomate San Marzano, mozzarella de búfala, albahaca fresca y aceite de oliva virgen extra.",
      price: 12.99,
      inventory: 50,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Pepperoni",
      description:
        "Pizza con abundante pepperoni crujiente, mozzarella y salsa de tomate casera. Un clásico que nunca falla.",
      price: 14.99,
      inventory: 45,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Quattro Formaggi",
      description:
        "Deliciosa combinación de cuatro quesos: mozzarella, gorgonzola, parmesano y fontina. Sin salsa de tomate.",
      price: 15.99,
      inventory: 40,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Prosciutto e Funghi",
      description:
        "Pizza con jamón italiano prosciutto, champiñones frescos, mozzarella y salsa de tomate.",
      price: 16.99,
      inventory: 35,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Vegetariana",
      description:
        "Pimientos, cebolla, champiñones, aceitunas negras, tomate cherry y rúcula sobre base de mozzarella.",
      price: 14.99,
      inventory: 40,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Diavola",
      description:
        "Para los amantes del picante. Salami picante, mozzarella, salsa de tomate y un toque de guindilla.",
      price: 15.99,
      inventory: 30,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Capricciosa",
      description:
        "Alcachofas, champiñones, jamón cocido, aceitunas, mozzarella y salsa de tomate.",
      price: 16.99,
      inventory: 35,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pizza Carbonara",
      description:
        "Pizza blanca con guanciale, yema de huevo, pecorino romano y pimienta negra. Sin salsa de tomate.",
      price: 16.99,
      inventory: 30,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Ensalada César",
      description:
        "Lechuga romana, crutones, parmesano, salsa césar y pechuga de pollo a la parrilla.",
      price: 9.99,
      inventory: 25,
      estimatedProcessingTime: { min: 10, max: 15, unit: "minutes" },
    },
    {
      name: "Ensalada Caprese",
      description:
        "Tomate fresco, mozzarella de búfala, albahaca y aceite de oliva virgen extra.",
      price: 10.99,
      inventory: 25,
      estimatedProcessingTime: { min: 10, max: 15, unit: "minutes" },
    },
    {
      name: "Pasta Carbonara",
      description:
        "Spaghetti con guanciale, yema de huevo, pecorino romano y pimienta negra. Receta tradicional romana.",
      price: 13.99,
      inventory: 30,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Pasta Bolognesa",
      description:
        "Tallarines con salsa boloñesa casera de carne de res, cerdo, tomate y hierbas italianas.",
      price: 13.99,
      inventory: 30,
      estimatedProcessingTime: { min: 15, max: 20, unit: "minutes" },
    },
    {
      name: "Tiramisú",
      description:
        "Postre italiano clásico con capas de bizcocho savoiardi, mascarpone, café espresso y cacao.",
      price: 6.99,
      inventory: 20,
      estimatedProcessingTime: { min: 5, max: 10, unit: "minutes" },
    },
    {
      name: "Panna Cotta",
      description:
        "Postre cremoso de nata con coulis de frutos rojos. Suave y delicado.",
      price: 5.99,
      inventory: 20,
      estimatedProcessingTime: { min: 5, max: 10, unit: "minutes" },
    },
    {
      name: "Coca-Cola",
      description: "Refresco de cola 330ml. Bien frío.",
      price: 2.5,
      inventory: 100,
      estimatedProcessingTime: { min: 1, max: 2, unit: "minutes" },
    },
    {
      name: "Agua Mineral",
      description: "Agua mineral natural 500ml. Sin gas.",
      price: 2.0,
      inventory: 100,
      estimatedProcessingTime: { min: 1, max: 2, unit: "minutes" },
    },
    {
      name: "Cerveza Italiana",
      description:
        "Cerveza artesanal italiana Moretti 330ml. Rubia y refrescante.",
      price: 4.5,
      inventory: 50,
      estimatedProcessingTime: { min: 1, max: 2, unit: "minutes" },
    },
    {
      name: "Vino de la Casa",
      description:
        "Vino tinto o blanco de la casa. Copa de 150ml. Consulta por la botella.",
      price: 5.5,
      inventory: 40,
      estimatedProcessingTime: { min: 1, max: 2, unit: "minutes" },
    },
  ];

  const allProductsToCreate = [];

  for (const business of businesses) {
    for (const productTemplate of pizzaProducts) {
      allProductsToCreate.push({
        collection: "products",
        data: {
          ...productTemplate,
          business: business.id,
        },
      });
    }
  }

  // Create all products in parallel
  await Promise.all(
    // @ts-ignore
    allProductsToCreate.map((product) => payload.create(product)),
  );

  payload.logger.info(`✅ ${allProductsToCreate.length} productos creados`);

  // ---- BUSINESSES MEDIA (MENUS) ----
  // Read the menu image from local file
  const menuPath = join(process.cwd(), "src", "assets", "pizza_menu.webp");

  payload.logger.info(`📄 Leyendo archivo local: ${menuPath}`);

  let imageBuffer: Buffer;
  try {
    imageBuffer = readFileSync(menuPath);
  } catch (error) {
    payload.logger.error(`❌ Error al leer el archivo: ${menuPath}`);
    payload.logger.error(error);
    process.exit(1);
  }

  const imageBlob = new Blob([imageBuffer], { type: "image/webp" });

  // Add menu images for each business
  const allMediaToCreate = [];

  for (const business of businesses) {
    allMediaToCreate.push({
      collection: "businesses-media",
      data: {
        alt: "Menú de Pizzeria Italiana - Pizza, Pasta, Postres y Bebidas",
        business: business.id,
      },
      file: {
        data: imageBlob,
        name: "pizza_menu.webp",
        mimetype: "image/webp",
        size: imageBuffer.length,
      },
    });
  }

  // Create all media items in parallel
  await Promise.all(
    // @ts-ignore
    allMediaToCreate.map((media) => payload.create(media)),
  );

  payload.logger.info(`✅ ${allMediaToCreate.length} menús creados`);
  payload.logger.info(
    `✅ Script completado: ${businesses.length} negocios actualizados`,
  );
  process.exit(0);
};
