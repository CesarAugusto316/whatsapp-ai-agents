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
    return fetch(`${apiUrl}/businesses/${id}`, {
      method: "GET",
      headers: this.headers,
    });
  }

  public getAppointments(id: string, appointmentId: string) {
    return fetch(`${apiUrl}/businesses/${id}/appointments/${appointmentId}`, {
      method: "GET",
      headers: this.headers,
    });
  }

  public getAppointmentById(id: string, appointmentId: string) {
    return fetch(`${apiUrl}/businesses/${id}/appointments/${appointmentId}`, {
      method: "GET",
      headers: this.headers,
    });
  }

  public createAppointment(
    id: string,
    appointmentBody: Record<string, string>,
  ) {
    return fetch(`${apiUrl}/businesses/${id}/appointments`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  public updateAppointment(
    id: string,
    appointmentId: string,
    appointmentBody: Record<string, string>,
  ) {
    return fetch(`${apiUrl}/businesses/${id}/appointments/${appointmentId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(appointmentBody),
    });
  }

  public deleteAppointment(id: string, appointmentId: string) {
    return fetch(`${apiUrl}/businesses/${id}/appointments/${appointmentId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  // TODO phoneNumber as primary key
  public getCostumerByPhone(id: string, phoneNumber: string) {
    return fetch(`${apiUrl}/businesses/${id}/costumers/${phoneNumber}`, {
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

  public createCostumer(id: string, costumer: Record<string, string>) {
    return fetch(`${apiUrl}/businesses/${id}/costumers`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(costumer),
    });
  }

  public updateCostumer(
    id: string,
    costumerId: string,
    costumerBody: Record<string, string>,
  ) {
    return fetch(`${apiUrl}/businesses/${id}/costumers/${costumerId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(costumerBody),
    });
  }
}

export default new BusinessService();
