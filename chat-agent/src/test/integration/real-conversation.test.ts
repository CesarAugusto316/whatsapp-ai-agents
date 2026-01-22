import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { redisClient } from "@/infraestructure/cache/redis.client";

// Constants from the logs
const BUSINESS_ID = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";
const CUSTOMER_PHONE = "+3455555555";

interface TestResponse {
  bag: Record<string, any>;
  lastStepResult?: {
    execute?: {
      result: string;
      metadata?: any;
    };
    compensate?: {
      result: string;
    };
  };
}

describe("Real conversation flow integration test", () => {
  beforeAll(() => {
    process.env.PORT = process.env.PORT || "3000";
  });

  beforeEach(async () => {
    // Clean up Redis keys for this business and customer before each test
    const chatKey = `chat:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    const reservationKey = `reservation:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    await redisClient.del(chatKey);
    await redisClient.del(reservationKey);
  });

  test(
    "full conversation flow from hello to reservation confirmation",
    async () => {
      // Helper to make a POST request
      const makeRequest = async (body: string): Promise<TestResponse> => {
        const payload = {
          payload: {
            body,
            from: CUSTOMER_PHONE,
          },
        };
        const req = new Request(
          `http://localhost:3000/test-ai/${BUSINESS_ID}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
        const res = await fetch(req);
        console.log({ res });
        expect(res.status).toBe(200);
        const responseBody = await res.json();
        return responseBody as TestResponse;
      };

      // Step 1: Initial greeting
      console.log("Step 1: Sending 'hola'");
      const response1 = await makeRequest("hola");
      expect(response1.lastStepResult).toBeDefined();
      expect(response1.lastStepResult?.execute).toBeDefined();
      expect(typeof response1.lastStepResult?.execute?.result).toBe("string");
      const result1 = response1.lastStepResult!.execute!.result;
      expect(result1).toContain("Cesar");
      expect(result1).toContain("Hola");
      expect(result1).toContain("reserva");

      // Step 2: Clarification about option 1
      console.log("Step 2: Clarifying about option 1");
      const response2 = await makeRequest(
        "solo escribo el numero 1? nada mas?",
      );
      expect(typeof response2.lastStepResult?.execute?.result).toBe("string");
      const result2 = response2.lastStepResult!.execute!.result;
      expect(result2).toContain("1");

      // Step 3: Start reservation by sending "1"
      console.log("Step 3: Sending '1' to start reservation");
      const response3 = await makeRequest("1");
      expect(typeof response3.lastStepResult?.execute?.result).toBe("string");
      const result3 = response3.lastStepResult!.execute!.result;
      expect(result3).toContain("día");
      expect(result3).toContain("hora");
      expect(result3).toContain("personas");

      const payload = {
        name: "Cesar Rivera",
        people: 2,
        date: "Para el 26 de enero a las 6pm",
      };

      console.log(
        `Step 4: Sending 'para ${payload.people} personas' (partial data)`,
      );
      const response4 = await makeRequest(`para ${payload.people} personas`);
      expect(typeof response4.lastStepResult?.execute?.result).toBe("string");
      const result4 = response4.lastStepResult!.execute!.result;
      // Should ask for missing data
      expect(result4).toContain("problema");
      expect(result4).toContain("día");
      expect(result4).toContain("hora");

      // Step 5: Provide full date and time
      console.log("Step 5: Sending 'para el 26 de enero a las 6pm'");
      const response5 = await makeRequest(payload.date);
      expect(typeof response5.lastStepResult?.execute?.result).toBe("string");
      const result5 = response5.lastStepResult!.execute!.result;
      // Should show summary and ask for confirmation
      expect(result5).toContain("CONFIRMAR");
      // expect(result5).toContain("REINGRESAR");
      expect(result5).toContain("SALIR");
      expect(result5).toContain("26 de enero");
      expect(result5).toContain("18:00");
      expect(result5).toContain("19:00");

      // Step 6: Clarify confirmation step
      console.log("Step 6: Asking 'solo escribir confirmar?'");
      const response6 = await makeRequest("solo escribir confirmar?");
      expect(typeof response6.lastStepResult?.execute?.result).toBe("string");
      const result6 = response6.lastStepResult!.execute!.result;
      expect(result6).toContain("CONFIRMAR");
      expect(result6).toContain("escribir");

      // Step 7: Confirm reservation
      console.log("Step 7: Sending 'Confirmar' to finalize");
      const response7 = await makeRequest("Confirmar");
      expect(typeof response7.lastStepResult?.execute?.result).toBe("string");
      const result7 = response7.lastStepResult!.execute!.result;
      expect(result7).toContain("reserva");
      expect(result7).toContain("creada"); // success
      expect(result7).toContain("éxito");
      expect(result7).toContain("ID");
      expect(result7).toContain(payload.name); // nombre del cliente
      expect(result7).toContain(payload.people.toString()); //  2 personas

      // Verify that a reservation was actually created in the system
      expect(response7.bag).toBeDefined();
      expect(typeof response7.bag).toBe("object");
      const confirmBag = response7.bag["execute:CONFIRM"];
      expect(confirmBag).toBeDefined();
      expect(typeof confirmBag).toBe("object");
      expect(confirmBag.reservation).toBeDefined();
      expect(typeof confirmBag.reservation).toBe("object");
      expect(typeof confirmBag.reservation.id).toBe("string");
      expect(confirmBag.reservation.status).toBe("confirmed");
      expect(confirmBag.reservation.numberOfPeople).toBe(2);

      // Additional verification: check that Redis state is cleared or updated
      const reservationKey = `reservation:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
      const state = await redisClient.get(reservationKey);
      // After confirmation, reservation state might be cleared or contain final state
      // This depends on the implementation. We'll just ensure it's not in a partial state.
      if (state) {
        const parsed = JSON.parse(state as string);
        expect(parsed.status).not.toBe("MAKE_STARTED");
      }

      console.log("All conversation steps completed successfully!");
    },
    60_000 * 3,
  ); // 60 second timeout for the entire flow (LLM calls can be slow)
});
