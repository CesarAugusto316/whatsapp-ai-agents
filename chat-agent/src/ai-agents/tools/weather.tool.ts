import { z } from "zod";
import { tool } from "ai";
import { parseInput } from "./helpers";

// 1. Define tu esquema de validación separadamente
const weatherSchema = z.object({
  location: z.string().describe("The location to get the weather for"),
});

export const weather = tool({
  name: "weather",
  inputSchema: z.preprocess(parseInput, weatherSchema),
  description: "Get the weather for a given location",
  execute: async ({ location }) => {
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHERMAP_API_KEY}`);
    // const data = await response.json();
    return {
      location,
      weather: "sunny",
      temperature: "25°C",
      humidity: "60%",
    };
  },
});
