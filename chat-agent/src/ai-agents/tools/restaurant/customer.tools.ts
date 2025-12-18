import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "../helpers";
import { customerPhoneNumber, restaurantInfoSchema } from "./schemas";

// CUSTOMERS
export const getCustomerProfile = tool({
  name: "getCustomerProfile",
  description:
    "Get a costumer/user info by providing their phone number and restaurantId",
  inputSchema: z.preprocess(
    parseInput,
    restaurantInfoSchema.extend({
      customerPhoneNumber,
    }),
  ),
  execute: async ({ restaurantId, customerPhoneNumber }) => {
    const customer = await businessService.getCostumerByPhone({
      "where[phoneNumber][like]": customerPhoneNumber,
      "where[business][equals]": restaurantId,
      limit: 1,
      depth: 0,
    });
    return customer;
  },
});

export const createNewCustomer = tool({
  name: "createNewCustomer",
  description:
    "Create a new customer if not exists for a restaurant by providing their name, phone number",
  inputSchema: z.preprocess(
    parseInput,
    restaurantInfoSchema.extend({
      name: z.string().min(2).max(20).describe("Customer's name"),
      customerPhoneNumber,
      email: z.email().describe("Customer's email").optional(),
    }),
  ),
  execute: async ({ name, restaurantId, customerPhoneNumber, email }) => {
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
  // toModelOutput(),
});
// CUSTOMERS
