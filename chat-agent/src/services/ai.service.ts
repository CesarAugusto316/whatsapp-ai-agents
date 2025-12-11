import { Agent, Connection, ConnectionContext, WSMessage } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { env } from "cloudflare:workers";
import { generateText, stepCountIs, tool } from "ai";
import { object, string } from "zod/v3";
// import * as z from "zod/v3";

// Define environment variables & bindings here
// interface Env extends CloudflareBindings {}

interface State {
  counter: number;
  messages: string[];
  lastUpdated: Date | null;
}

// Create a Workers AI instance
const workersai = createWorkersAI({ binding: env.AI });
// MORE INFO: https://developers.cloudflare.com/workers-ai/models/granite-4.0-h-micro/
// DOCS: https://www.ibm.com/granite/docs/models/granite
const model = workersai("@cf/ibm-granite/granite-4.0-h-micro");

// Pass the Env as a TypeScript type argument
// Any services connected to your Agent or Worker as Bindings
// are then available on this.env.<BINDING_NAME>

// The core class for creating Agents that can maintain state, orchestrate
// complex AI workflows, schedule tasks, and interact with users and other
// Agents.
export class MyAgent extends Agent<CloudflareBindings, State> {
  // Optional initial state definition
  initialState: State = {
    counter: 0,
    messages: [],
    lastUpdated: null,
  };

  // Called when a new Agent instance starts or wakes from hibernation
  async onStart() {
    console.log("Agent started with state:", this.state);
  }

  // Handle HTTP requests coming to this Agent instance
  // Returns a Response object
  async onRequest(request: Request): Promise<Response> {
    const { text } = await generateText({
      model,
      system: "You are an AI agent on Cloudflare Workers",
      prompt: "Build me an AI agent on Cloudflare Workers",
      stopWhen: stepCountIs(5), // stop after a maximum of 5 steps if tools were called
      tools: {
        // getWeather: tool({
        //   description: "Get the weather for a location",
        //   inputSchema: z.object({
        //     city: z.string().describe("The city to get the weather for"),
        //   }),
        //   execute: async ({ city }) => {
        //     const response = await fetch(
        //       "",
        //       // `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
        //     );
        //     const data = await response.json();
        //     const weatherData = {
        //       location: {
        //         name: data.location.name,
        //         country: data.location.country,
        //         localtime: data.location.localtime,
        //       },
        //       current: {
        //         temp_c: data.current.temp_c,
        //         condition: {
        //           text: data.current.condition.text,
        //           code: data.current.condition.code,
        //         },
        //       },
        //     };
        //     return weatherData;
        //   },
        // }),
        weather: tool({
          description: "Get the weather in a location",
          inputSchema: object({
            location: string().describe("The location to get the weather for"),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
        }),
      },
    });
    return new Response("Hello from Agent!" + text);
  }

  // Called when a WebSocket connection is established
  // Access the original request via ctx.request for auth etc.
  async onConnect(connection: Connection, ctx: ConnectionContext) {
    // Connections are automatically accepted by the SDK.
    // You can also explicitly close a connection here with connection.close()
    // Access the Request on ctx.request to inspect headers, cookies and the URL
  }

  // Called for each message received on a WebSocket connection
  // Message can be string, ArrayBuffer, or ArrayBufferView
  async onMessage(connection: Connection, message: WSMessage) {
    // Handle incoming messages
    connection.send("Received your message");
  }

  async scheduleMyAppoinments() {
    // schedule a task to run in 10 seconds
    let task = await this.schedule(10, "someTask", { message: "hello" });

    // schedule a task to run at a specific date
    let task2 = await this.schedule(new Date("2025-01-01"), "someTask", {});

    // schedule a task to run every 10 minutes
    let { id } = await this.schedule("*/10 * * * *", "someTask", {
      message: "hello",
    });

    // schedule a task to run every 10 minutes, but only on Mondays
    let task3 = await this.schedule("*/10 * * * 1", "someTask", {
      message: "hello",
    });

    // cancel a scheduled task
    this.cancelSchedule(task.id);

    // Get a specific schedule by ID
    // Returns undefined if the task does not exist
    let gettask = await this.getSchedule(task.id);

    // Get all scheduled tasks
    // Returns an array of Schedule objects
    let gettasks = this.getSchedules();

    // Cancel a task by its ID
    // Returns true if the task was cancelled, false if it did not exist
    await this.cancelSchedule(task.id);

    // Filter for specific tasks
    // e.g. all tasks starting in the next hour
    let tasks = this.getSchedules({
      timeRange: {
        start: new Date(Date.now()),
        end: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }

  // Handle WebSocket connection errors
  // async onError(connection: Connection, error: unknown): Promise<void> {
  //   console.error(`Connection error:`, error);
  // }

  // Handle WebSocket connection close events
  async onClose(
    connection: Connection,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    console.log(`Connection closed: ${code} - ${reason}`);
  }

  // Called when the Agent's state is updated from any source
  // source can be "server" or a client Connection
  onStateUpdate(state: State, source: "server" | Connection) {
    console.log("State updated:", state, "Source:", source);
  }

  // You can define your own custom methods to be called by requests,
  // WebSocket messages, or scheduled tasks
  async customProcessingMethod(data: any) {
    // Process data, update state, schedule tasks, etc.
    this.setState({ ...this.state, lastUpdated: new Date() });
  }
}
