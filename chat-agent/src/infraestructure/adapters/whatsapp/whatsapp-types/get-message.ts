// Enum para los estados de confirmación (ack) de los mensajes
enum MessageAck {
  ERROR = -1,
  PENDING = 0,
  SERVER = 1,
  DEVICE = 2,
  READ = 3,
  PLAYED = 4,
}

// Interface PRINCIPAL para todos los Query Parameters
// MORE INFO:https://waha.devlike.pro/docs/how-to/chats/
export interface GetChatMessagesQueryParams {
  downloadMedia?: boolean;
  limit?: number;
  offset?: number;
  "filter.timestamp.lte"?: number;
  "filter.timestamp.gte"?: number;
  "filter.fromMe"?: boolean;
  "filter.ack"?: number | MessageAck;
}
