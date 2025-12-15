import { CreateAppointment, CreateCustomer } from "@/types/business/cms-types";
import { fetch } from "bun";

const apiUrl = process.env.CMS_API;
const slug = process.env.CMS_SLUG || "third-party-access";
const apiKey = process.env.CMS_API_KEY;

export interface BusinessQueryParams {
  limit?: number;
  page?: number;
  depth?: number;
  // more info: https://payloadcms.com/docs/queries/sort
  sort?: string; // -createdAt
  "where[business][equals]"?: string; // businessId,
  "where[customer][equals]"?: string; // businessId,
  "where[day][equals]"?: string | Date; // 2024-03-15
  "where[startDateTime][equals]"?: string | Date; // 2024-03-15
  "where[endDateTime][equals]"?: string | Date; // 2024-03-15

  // COSTUMER:
  "where[phoneNumber][equals]"?: string | Date; // 2024-03-15
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
  public getBusinessById(id: string) {
    const url = generateUrl(`businesses/${id}`, { depth: 0 });
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  /**
   *
   * @description Get all appointments for a business
   * MORE INFO: https://payloadcms.com/docs/queries/overview
   * MORE INFO: https://payloadcms.com/docs/queries/select
   */
  public getAppointments(queryParams?: BusinessQueryParams) {
    return fetch(generateUrl("appointments", queryParams), {
      method: "GET",
      headers: this.headers,
    });
  }

  // // NEXT:
  // // TODO:DEBE BUSCAR EL ULTIMO APPOINMENT asociado a un business
  // public getLastAppointment(businessId: string, costumerId: string) {
  //   const url = `${apiUrl}/appointments?where[business][equals]=${businessId}&sort=-createdAt&depth=0`;
  //   return fetch(url, {
  //     method: "GET",
  //     headers: this.headers,
  //   });
  // }

  public getAppointmentById(appointmentId: string) {
    const url = generateUrl(`appointments/${appointmentId}`, { depth: 0 });
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  public createAppointment(appointmentBody: CreateAppointment) {
    return fetch(`${apiUrl}/appointments`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  public updateAppointment(
    appointmentId: string,
    appointmentBody: Partial<CreateAppointment>,
  ) {
    return fetch(`${apiUrl}/appointments/${appointmentId}`, {
      method: "PUT",
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

  // TODO phoneNumber as primary key
  public getCostumerByPhone(
    queryParams: Pick<
      BusinessQueryParams,
      "where[phoneNumber][equals]" | "where[business][equals]" | "limit"
    >, // where[phoneNumber][equals]=${phoneNumber}
  ) {
    const url = generateUrl(`customers`, queryParams);
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  public getCostumerById(
    customerId: string,
    queryParams?: Pick<
      BusinessQueryParams,
      "where[business][equals]" | "limit"
    >,
  ) {
    const url = generateUrl(`customers/${customerId}`, queryParams);
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  public createCostumer(costumer: CreateCustomer) {
    return fetch(`${apiUrl}/customers`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(costumer),
    });
  }

  public updateCostumer(
    costumerId: string,
    costumerBody: Partial<CreateCustomer>,
  ) {
    return fetch(`${apiUrl}/customers/${costumerId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(costumerBody),
    });
  }
}

export default new BusinessService();
