import z from "zod";

const businessInfoSchema = z.object({
  name: z.string().describe("The name of the business"),
});
