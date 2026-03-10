export interface SendImagePayload {
  chatId: string;
  session?: string; // Opcional según tu ejemplo
  file: {
    mimetype: string;
    url: string;
    filename: string;
  };
  caption?: string;
}
