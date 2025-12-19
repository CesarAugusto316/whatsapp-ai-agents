import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "../helpers";

export const createNewCustomer = (
  restaurantId: string,
  customerPhoneNumber: string,
) =>
  tool({
    name: "createNewCustomer",
    description:
      "Create a new customer if not exists for a restaurant by providing their name, phone number",
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        email: z.email().describe("Customer's email").optional(),
        name: z.string().min(2).max(20).describe("Customer's name"),
      }),
    ),
    execute: async ({ name, email }) => {
      const costumer = await businessService.createCostumer({
        business: restaurantId,
        name,
        phoneNumber: customerPhoneNumber,
        email,
      });
      // Implement the logic to fetch costumer information using the phoneNumber
      // Example: const costumerInfo = await fetchCostumerInfo(phoneNumber);
      // Return the costumer information as a string or object
      return costumer.json();
    },
  });
