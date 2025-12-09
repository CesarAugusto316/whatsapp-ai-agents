import { SendEventPayload } from "@/types/send-appointment";
import { SendContactPayload } from "@/types/send-contact";
import { SendLocationPayload } from "@/types/send-location";
import {
  SendMessagePayload,
  SendMessageResponse,
  SendSeenPayload,
} from "@/types/send-message";
import { env } from "cloudflare:workers";

const apiUrl = env.WAHA_API;
const apiKey = env.WAHA_API_KEY; // waha API key

/**
 *
 * If you get a new message via 🔄 Events and want to reply to that message,
 * you need to first send that you’ve seen the message (double green tick)
 * - read ⚠️ How to Avoid Blocking
 * @description Waha API
 * more info: https://waha.devlike.pro/docs/how-to/send-messages/
 */
class WhatsappService {
  private headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  /**
   *
   * more info: https://waha.devlike.pro/docs/how-to/send-messages/
   * @description Send a seen message to the chat always before sending a message
   */
  private sendSeen(args: SendSeenPayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendSeen`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      }),
    );
  }

  private sendStartTyping(args: SendSeenPayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/startTyping`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      }),
    );
  }

  private sendStopTyping(args: SendSeenPayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/stopTyping`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      }),
    );
  }

  private randomTime() {
    const min = 1_200;
    const max = 2_200;
    return Math.floor(Math.random() * (max - min + 1)) + min / 2;
  }

  private timeOut() {
    return new Promise((resolve) => setTimeout(resolve, this.randomTime()));
  }

  public async beforeSend(
    args: SendSeenPayload,
    callAi: () => Promise<string>,
  ) {
    await this.timeOut();
    await this.sendSeen({ session: args.session, chatId: args.chatId });
    await this.timeOut();
    await this.sendStartTyping({ session: args.session, chatId: args.chatId });
    const [aiPromise] = await Promise.all([callAi(), this.timeOut()]);
    await this.sendStopTyping({ session: args.session, chatId: args.chatId });
    return aiPromise;
  }

  public async sendText({ session, text, chatId }: SendMessagePayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendText`, {
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
      }),
    );
  }

  public async sendContact(args: SendContactPayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendContactVcard`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      }),
    );
  }

  public async sendLocation(args: SendLocationPayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendLocation`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      }),
    );
  }

  public async sendEvent(args: SendEventPayload) {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/${args.session}/events`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      }),
    );
  }
}

export default new WhatsappService();
