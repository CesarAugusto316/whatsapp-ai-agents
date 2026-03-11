import z from "zod";

export const productItemSchema = z.object({
  id: z.string().min(1, "productId es requerido"),
  name: z.string().min(1, "productName es requerido"),
  quantity: z.number().int().positive("quantity debe ser mayor a 0"),
  notes: z.string().max(300, "too_long: Máximo 200 caracteres").optional(),
});

export const orderActionSchema = z.enum([
  "add",
  "remove",
  "update",
  "view",
  "confirm",
]);

export const orderArgSchema = z.object({
  action: orderActionSchema,
  item: productItemSchema,
});

export const orderSchema = z
  .object({
    customerName: z
      .string()
      .min(3, "too_short: Mínimo 3 caracteres")
      .max(30, "too_long: Máximo 30 caracteres")
      .regex(
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        "invalid_format: Solo letras y espacios",
      ),
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
