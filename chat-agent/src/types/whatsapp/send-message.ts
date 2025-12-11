import { WahaMessagePayload } from "./received-event";

export interface SendMessagePayload {
  chatId: string;
  reply_to?: string | null;
  text?: string;
  linkPreview?: boolean;
  linkPreviewHighQuality?: boolean;
  session: string;
  messageIds?: string[];
}

export interface SendSeenPayload {
  chatId: string;
  session: string;
  messageIds?: string[];
}

export interface SendMessageResponse extends WahaMessagePayload {
  // Hereda todos los campos de la interfaz del evento 'message'
}
