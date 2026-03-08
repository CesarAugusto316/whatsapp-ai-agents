import z from "zod";

export const orderSchema = z.object({
  customerName: z
    .string()
    .min(3, "too_short: Mínimo 3 caracteres")
    .max(30, "too_long: Máximo 30 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "invalid_format: Solo letras y espacios",
    ),
});

export type OrderSchema = z.infer<typeof orderSchema>;
