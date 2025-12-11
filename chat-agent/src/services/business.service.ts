const apiUrl = process.env.CMS_API;

class BusinessService {
  private headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  /**
   *
   * more info: https://waha.devlike.pro/docs/how-to/send-messages/
   * @description Send a seen message to the chat always before sending a message
   */
  public getBusiness(args: Object) {
    return fetch(`${apiUrl}/sendSeen`, {
      method: "GET",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }
}

export default new BusinessService();
