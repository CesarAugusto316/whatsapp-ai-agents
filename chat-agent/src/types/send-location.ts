export interface SendLocationPayload {
  chatId: string;
  latitude: number;
  longitude: number;
  title: string;
  reply_to: string | null;
  session: string;
}
