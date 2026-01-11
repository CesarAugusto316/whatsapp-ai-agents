import { GetChatMessagesQueryParams } from "@/types/whatsapp/get-message";
import { SendEventPayload } from "@/types/whatsapp/send-appointment";
import { SendContactPayload } from "@/types/whatsapp/send-contact";
import { SendLocationPayload } from "@/types/whatsapp/send-location";
import {
  SendMessagePayload,
  SendSeenPayload,
} from "@/types/whatsapp/send-message";
import { env, fetch } from "bun";

const apiUrl = env.WAHA_API + "/api";
const apiKey = env.WAHA_API_KEY; // waha API key

/**
 *
 * If you get a new message via 🔄 Events and want to reply to that message,
 * you need to first send that you’ve seen the message (double green tick)
 *
 * Read ⚠️ How to Avoid Blocking
 * more info: https://waha.devlike.pro/docs/overview/%EF%B8%8F-how-to-avoid-blocking/
 *
 * @description Waha API
 * more info: https://waha.devlike.pro/docs/how-to/send-messages/
 */
class WhatsAppService {
  private headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Api-Key": apiKey || "",
  };

  public getMessages(
    session: string,
    chatId: string,
    queryParams?: GetChatMessagesQueryParams,
  ) {
    const url = new URL(`${apiUrl}/${session}/chats/${chatId}/messages`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.append(key, value);
      }
    }
    return fetch(url, {
      method: "GET",
      headers: this.headers,
    });
  }

  /**
   *
   * more info: https://waha.devlike.pro/docs/how-to/send-messages/
   * @description Send a seen message to the chat always before sending a message
   */
  public async sendSeen(args: SendSeenPayload) {
    await this.timeOut();
    return fetch(`${apiUrl}/sendSeen`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }

  public async sendStartTyping(args: SendSeenPayload) {
    await this.timeOut();
    return fetch(`${apiUrl}/startTyping`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }

  public async sendStopTyping(args: SendSeenPayload) {
    return fetch(`${apiUrl}/stopTyping`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }

  private randomTime() {
    const min = 1_400;
    const max = 2_800;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private timeOut() {
    return new Promise((resolve) => setTimeout(resolve, this.randomTime()));
  }

  public async sendText({ session, text, chatId }: SendMessagePayload) {
    await this.timeOut();
    return fetch(`${apiUrl}/sendText`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        chatId,
        session,
        text,
        reply_to: null,
        linkPreview: true,
        linkPreviewHighQuality: false,
      } as SendMessagePayload),
    });
  }

  public async sendContact(args: SendContactPayload) {
    return fetch(`${apiUrl}/sendContactVcard`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }

  public async sendLocation(args: SendLocationPayload) {
    return fetch(`${apiUrl}/sendLocation`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }

  public async sendEvent(args: SendEventPayload) {
    return fetch(`${apiUrl}/${args.session}/events`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }
}

export default new WhatsAppService();
