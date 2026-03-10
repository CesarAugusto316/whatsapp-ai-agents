import { env, fetch } from "bun";
import { GetChatMessagesQueryParams } from "./whatsapp-types/get-message";
import {
  SendMessagePayload,
  SendSeenPayload,
} from "./whatsapp-types/send-message";
import { SendContactPayload } from "./whatsapp-types/send-contact";
import { SendLocationPayload } from "./whatsapp-types/send-location";
import { SendEventPayload } from "./whatsapp-types/send-appointment";
import { formatForWhatsApp } from "./format-for-whatsapp";
import {
  CircuitBreaker,
  resilientQuery,
  ResilientQueryOptions,
} from "@/application/patterns";
import { SendImagePayload } from "./whatsapp-types/send-image";

const apiUrl = env.WAHA_API + "/api";
const apiKey = env.WAHA_API_KEY; // waha API key

// Configuración específica para LLMs
const circuitBreaker = new CircuitBreaker(
  {
    failureThreshold: 3, // 3 fallos seguidos abren el circuito
    resetTimeout: 60_000, // 30 segundos en OPEN
    halfOpenSuccessThreshold: 2, // 2 éxitos para cerrar
  },
  "whatsapp-client",
);

const resilientConfig = {
  timeoutMs: 45_000,
  circuitBraker: circuitBreaker,
  retryConfig: {
    backoffRate: 2,
    maxAttempts: 3,
    intervalSeconds: 2,
  },
} satisfies ResilientQueryOptions;

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
class WhatsAppAdapter {
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
  public async sendSeen<T>(args: SendSeenPayload) {
    await this.timeOut();
    return resilientQuery<T>(async () => {
      const res = await fetch(`${apiUrl}/sendSeen`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      return res.json() as T;
    }, resilientConfig);
  }

  public async sendStartTyping<T>(args: SendSeenPayload) {
    await this.timeOut();
    return resilientQuery<T>(async () => {
      const res = await fetch(`${apiUrl}/startTyping`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      return res.json() as T;
    }, resilientConfig);
  }

  public async sendStopTyping<T>(args: SendSeenPayload) {
    return resilientQuery<T>(async () => {
      const res = await fetch(`${apiUrl}/stopTyping`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      return res.json() as T;
    }, resilientConfig);
  }

  private randomTime() {
    const min = 1_400;
    const max = 2_800;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private timeOut() {
    return new Promise((resolve) => setTimeout(resolve, this.randomTime()));
  }

  public async sendMsgText<T>({ session, text, chatId }: SendMessagePayload) {
    await this.timeOut();
    return resilientQuery<T>(async () => {
      const res = await fetch(`${apiUrl}/sendText`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          chatId,
          session,
          text: formatForWhatsApp(text ?? ""),
          reply_to: null,
          linkPreview: true,
          linkPreviewHighQuality: false,
        } as SendMessagePayload),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      return res.json() as T;
    }, resilientConfig);
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

  public async sendImage(args: SendImagePayload) {
    return fetch(`${apiUrl}/${args.session}/sendImage`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
    });
  }
}

export default new WhatsAppAdapter();
