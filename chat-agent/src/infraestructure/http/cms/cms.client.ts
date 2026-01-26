import { env, fetch } from "bun";
import {
  Appointment,
  Business,
  CreateAppointment,
  CreateCustomer,
  Customer,
} from "./cms-types";
import { redisClient } from "@/infraestructure/cache/redis.client";
import { AvailabilityResponse } from "./chek-availability.types";
import {
  CircuitBreaker,
  resilientQuery,
  ResilientQueryOptions,
} from "@/application/patterns";
const apiUrl = env.CMS_API + "/api";
const slug = env.CMS_SLUG || "third-party-access";
const apiKey = env.CMS_API_KEY;

// more info: https://payloadcms.com/docs/queries/sort
export interface CMSQueryParams {
  limit?: number;
  page?: number;
  depth?: number;
  sort?: "-createdAt" | "-updatedAt"; // -createdAt
  "where[business][equals]"?: string; // businessId,
  "where[customer][equals]"?: string; // businessId,

  // APPOINTMENT
  "where[numberOfPeople][equals]"?: number; // businessId,
  "where[startDateTime][equals]"?: string; // 2024-03-15
  "where[endDateTime][equals]"?: string; // 2024-03-15
  "where[status][equals]"?: Appointment["status"]; // 2024-03-15

  // COSTUMER:
  "where[phoneNumber][like]"?: string; // 2024-03-15
  // "where[name][equals]"?: string | Date; // 2024-03-15
  // "where[business][equals]"?: string; // businessId,
}

const defaultQueryParams = {
  limit: 10,
  page: 1,
  depth: 0,
};

const generateUrl = (
  path: string,
  queryParams: CMSQueryParams = defaultQueryParams,
) => {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  const url = new URL(`${apiUrl}/${path}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.append(key, value?.toString());
    }
  }
  return url;
};

// Configuración específica para LLMs
const circuitBreaker = new CircuitBreaker(
  {
    failureThreshold: 3, // 3 fallos seguidos abren el circuito
    resetTimeout: 60_000, // 30 segundos en OPEN
    halfOpenSuccessThreshold: 2, // 2 éxitos para cerrar
  },
  "cms-client",
);

const resilientConfig = {
  timeoutMs: 60_000,
  circuitBraker: circuitBreaker,
  retryConfig: {
    backoffRate: 2,
    maxAttempts: 3,
    intervalSeconds: 2,
  },
} satisfies ResilientQueryOptions;

class CMSClient {
  private headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `${slug} API-Key ${apiKey}`,
  };

  /**
   *
   * more info: https://waha.devlike.pro/docs/how-to/send-messages/
   * @description Send a seen message to the chat always before sending a message
   */
  public async getBusinessById(id: string): Promise<Business | undefined> {
    return resilientQuery<Business>(async () => {
      const url = generateUrl(`businesses/${id}`, { depth: 0 });
      const key = `business:${id}`;
      const cache = await redisClient.get(key);

      if (cache) {
        return JSON.parse(cache) satisfies Business;
      }
      const res = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const business = (await res.json()) as Business;

      if (business) {
        redisClient.set(key, JSON.stringify(business), "EX", 60 * 60 * 12);
      }
      return business;
    }, resilientConfig);
  }

  public async checkAvailability(
    queryParams: Pick<
      CMSQueryParams,
      | "where[startDateTime][equals]"
      | "where[endDateTime][equals]"
      | "where[numberOfPeople][equals]"
      | "where[business][equals]"
    >,
  ) {
    return resilientQuery(async () => {
      const url = generateUrl("appointments/check-availability", {
        depth: 0,
        ...queryParams,
      });
      const res = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      return res.json() as Promise<AvailabilityResponse>;
    }, resilientConfig);
  }

  public async suggestSlots(
    queryParams: Pick<CMSQueryParams, "where[business][equals]">,
  ) {
    return resilientQuery(async () => {
      const url = generateUrl("appointments/suggest-slots", {
        depth: 0,
        ...queryParams,
      });
      const res = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      return res.json() as Promise<AvailabilityResponse>;
    }, resilientConfig);
  }

  // TODO phoneNumber as primary key
  public async getCostumerByPhone(
    queryParams: Pick<
      CMSQueryParams,
      "where[phoneNumber][like]" | "where[business][equals]" | "limit" | "depth"
    >,
  ): Promise<Customer | undefined> {
    //
    return resilientQuery<Customer>(async () => {
      const {
        "where[business][equals]": businessId,
        "where[phoneNumber][like]": phoneNumber,
      } = queryParams;

      const key = `customer:business:${businessId}:phoneNumber:${phoneNumber}`;
      const cache = await redisClient.get(key);

      if (cache) {
        return JSON.parse(cache) satisfies Customer;
      }
      const url = generateUrl(`customers`, {
        depth: 0,
        limit: 1,
        ...queryParams,
      });
      const res = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const customer = ((await res.json()) as { docs: Customer[] }).docs.at(0);
      if (customer) {
        await redisClient.set(
          key,
          JSON.stringify(customer),
          "EX",
          60 * 60 * 24 * 30,
        ); // 30 days
      }
      return customer;
    }, resilientConfig);
  }

  public createCostumer(costumer: CreateCustomer) {
    const url = generateUrl(`customers`, { depth: 0 });
    return fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(costumer),
    });
  }

  public updateCostumer(
    costumerId: string,
    costumerBody: Partial<CreateCustomer>,
  ) {
    const url = generateUrl(`customers/${costumerId}`, { depth: 0 });
    return fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(costumerBody),
    });
  }

  public getAppointmentById(appointmentId: string) {
    const url = generateUrl(`appointments/${appointmentId}`, { depth: 0 });
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  public getAppointmentsByParams(queryParams: CMSQueryParams) {
    return resilientQuery<{ docs: Appointment[] }>(async () => {
      const url = generateUrl(`appointments`, { depth: 0, ...queryParams });
      const res = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch appointments: ${res.status}`);
      }
      return res.json() as Promise<{ docs: Appointment[] }>;
    }, resilientConfig);
  }

  public createAppointment(appointmentBody: CreateAppointment) {
    const url = generateUrl("appointments", { depth: 0 });
    return fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  // UPDATE, to cancel or change the date
  public updateAppointment(
    appointmentId: string,
    appointmentBody: Partial<CreateAppointment>,
  ) {
    const url = generateUrl(`appointments/${appointmentId}`, { depth: 0 });
    return fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  public deleteAppointment(appointmentId: string) {
    return fetch(`${apiUrl}/appointments/${appointmentId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }
}

export default new CMSClient();
