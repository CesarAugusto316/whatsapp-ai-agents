import { BOOL } from "@/ai-agents/agent.types";
import { redis } from "@/storage/cache-storage.config";
import {
  Appointment,
  Business,
  CreateAppointment,
  CreateCustomer,
  Customer,
} from "@/types/business/cms-types";
import { env, fetch } from "bun";

const apiUrl = env.CMS_API;
const slug = env.CMS_SLUG || "third-party-access";
const apiKey = env.CMS_API_KEY;

// more info: https://payloadcms.com/docs/queries/sort
export interface BusinessQueryParams {
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
  queryParams: BusinessQueryParams = defaultQueryParams,
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

class BusinessService {
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
  public async getBusinessById(id: string): Promise<Business> {
    const url = generateUrl(`businesses/${id}`, { depth: 0 });
    const key = `business:${id}`;
    const cache = await redis.get(key);

    if (cache) {
      return JSON.parse(cache) satisfies Business;
    }
    const response = (await (
      await fetch(url, {
        method: "GET",
        headers: this.headers,
      })
    ).json()) as Business;

    if (response) {
      redis.set(key, JSON.stringify(response), "EX", 60 * 60 * 12);
    }
    return response;
  }

  /**
   *
   * TODO: return a boolean
   *
   * MORE INFO: https://payloadcms.com/docs/queries/overview
   * MORE INFO: https://payloadcms.com/docs/queries/select
   * @param queryParams
   * @returns boolean
   */
  public async checkAvailability(
    queryParams: Pick<
      BusinessQueryParams,
      | "where[startDateTime][equals]"
      | "where[endDateTime][equals]"
      | "where[numberOfPeople][equals]"
    >, // where[phoneNumber][equals]=${phoneNumber}
  ) {
    const url = generateUrl("appointments", {
      depth: 0,
      ...queryParams,
    });
    const appointments = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    const res = (await appointments.json()) as { docs: Appointment[] };
    return res.docs.length === 0 ? BOOL.YES : BOOL.NO;
  }

  // TODO phoneNumber as primary key
  public async getCostumerByPhone(
    queryParams: Pick<
      BusinessQueryParams,
      "where[phoneNumber][like]" | "where[business][equals]" | "limit" | "depth"
    >, // where[phoneNumber][equals]=${phoneNumber}
  ): Promise<Customer | undefined> {
    const {
      "where[business][equals]": businessId,
      "where[phoneNumber][like]": phoneNumber,
    } = queryParams;

    const key = `business:${businessId}:phoneNumber:${phoneNumber}`;
    const cache = await redis.get(key);

    if (cache) {
      return JSON.parse(cache) satisfies Customer;
    }
    const url = generateUrl(`customers`, {
      depth: 0,
      limit: 1,
      ...queryParams,
    });
    const response = (await (
      await fetch(url, {
        method: "GET",
        headers: this.headers,
      })
    ).json()) as { docs: Customer[] };

    const customer = response?.docs.at(0);
    if (customer) {
      await redis.set(key, JSON.stringify(customer), "EX", 60 * 60 * 24 * 7); // 7 days
    }
    return customer;
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

  public getAppointmentsByParams(queryParams: BusinessQueryParams) {
    const url = generateUrl(`appointments`, { depth: 0, ...queryParams });
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
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

export default new BusinessService();
