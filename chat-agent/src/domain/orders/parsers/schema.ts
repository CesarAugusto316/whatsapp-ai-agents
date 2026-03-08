import z from "zod";

const productItemSchema = z.object({
  productId: z.string().min(1, "productId es requerido"),
  quantity: z.number().int().positive("quantity debe ser mayor a 0"),
  description: z
    .string()
    .max(200, "too_long: Máximo 200 caracteres")
    .optional(),
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
        const productIds = products.map((p) => p.productId);
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

export type ProductItem = z.infer<typeof productItemSchema>;
