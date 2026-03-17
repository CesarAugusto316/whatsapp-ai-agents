import z from "zod";

export const productItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "productName es requerido"),
  quantity: z.number().min(1, "quantity debe ser mayor a 0").default(1),
  notes: z.string().max(300, "too_long: Máximo 200 caracteres").optional(),
  // estimatedProcessingTime: z
  //   .object({
  //     min: z.number(),
  //     max: z.number(),
  //     unit: z.string(),
  //   })
  //   .partial()
  //   .optional(),
  // description: z.string().optional(),
  // price: z.number().optional(),
  // inventory: z.number().optional(),
});

export const orderActionSchema = z.enum([
  "add",
  "remove",
  "update",
  "view",
  "confirm",
  "enterUsername",
]);

export const customerNameSchema = z
  .string()
  .min(3, "too_short: Mínimo 3 caracteres")
  .max(30, "too_long: Máximo 30 caracteres")
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "invalid_format: Solo letras y espacios");

export const orderArgSchema = z.object({
  action: orderActionSchema,
  item: productItemSchema.optional(),
});

export const orderSchema = z
  .object({
    customerName: customerNameSchema,
    products: z.array(productItemSchema).refine(
      (products) => {
        const productIds = products.map((p) => p.id);
        return productIds.length === new Set(productIds).size;
      },
      {
        message:
          "duplicate_product: No se permiten productos duplicados en la orden",
      },
    ),
  })
  .partial({ products: true });

export type OrderSchema = z.infer<typeof orderSchema>;
export type OrderAction = z.infer<typeof orderActionSchema>;
export type ProductItem = z.infer<typeof productItemSchema>;
