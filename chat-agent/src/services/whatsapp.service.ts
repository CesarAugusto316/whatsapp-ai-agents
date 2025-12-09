import { SendEventPayload } from "@/types/send-appointment";
import { SendContactPayload } from "@/types/send-contact";
import { SendLocationPayload } from "@/types/send-location";
import { SendMessagePayload, SendMessageResponse } from "@/types/send-message";
import { env } from "cloudflare:workers";

const apiUrl = env.WAHA_API;
const apiKey = env.WAHA_API_KEY; // waha API key

/**
 *
 * @description Waha API
 * more info: https://waha.devlike.pro/docs/how-to/send-messages/
 */
export const whatsappService = {
  sendText: ({ session, text, chatId }: SendMessagePayload) => {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          chatId,
          session,
          text,
        } as SendMessagePayload),
      }),
    );
  },

  sendContact: (args: SendContactPayload) => {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendContactVcard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(args),
      }),
    );
  },

  sendLocation: (args: SendLocationPayload) => {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/sendLocation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(args),
      }),
    );
  },

  sendEvent: (args: SendEventPayload) => {
    return fetch(
      new Request<SendMessageResponse>(`${apiUrl}/${args.session}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(args),
      }),
    );
  },
};
