import { fetch } from "bun";

const apiUrl = process.env.CMS_API;
const slug = process.env.CMS_SLUG || "third-party-access";
const apiKey = process.env.CMS_API_KEY;

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
    return fetch(`${apiUrl}/businesses/${id}?depth=0`, {
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
  public getAppointments(businessId: string) {
    // TODO: INCLUIR "day" en el where
    const url = `${apiUrl}/appointments?where[business][equals]=${businessId}&depth=0`;
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  // TODO:DEBE BUSCAR EL ULTIMO APPOINMENT asociado a un business
  public getLastAppointment(businessId: string, costumerId: string) {
    const url = `${apiUrl}/appointments?where[business][equals]=${businessId}&sort=-createdAt&depth=0`;
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  public getAppointmentById(appointmentId: string, costumerId: string) {
    return fetch(`${apiUrl}/appointments/${appointmentId}?depth=0`, {
      method: "GET",
      headers: this.headers,
    });
  }

  public createAppointment(appointmentBody: Record<string, string>) {
    return fetch(`${apiUrl}/appointments`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  public updateAppointment(
    businessId: string,
    appointmentId: string,
    appointmentBody: Record<string, string>,
  ) {
    return fetch(`${apiUrl}/appointments/${appointmentId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  public deleteAppointment(businessId: string, appointmentId: string) {
    return fetch(`${apiUrl}/appointments/${appointmentId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  // TODO phoneNumber as primary key
  public getCostumerByPhone(businessId: string, phoneNumber: string) {
    return fetch(`${apiUrl}/costumers/${phoneNumber}`, {
      method: "GET",
      headers: this.headers,
    });
  }

  // public getCostumerById(id: string, customerId: string) {
  //   return fetch(`${apiUrl}/businesses/${id}/costumers/${customerId}`, {
  //     method: "GET",
  //     headers: this.headers,
  //   });
  // }

  public createCostumer(costumer: Record<string, string>) {
    return fetch(`${apiUrl}/costumers`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(costumer),
    });
  }

  public updateCostumer(
    costumerId: string,
    costumerBody: Record<string, string>,
  ) {
    return fetch(`${apiUrl}/costumers/${costumerId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(costumerBody),
    });
  }
}

export default new BusinessService();
