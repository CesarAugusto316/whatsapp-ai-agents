export interface MediaFile {
  mimetype: string;
  url: string;
  filename: string;
}

export interface SendImagePayload {
  chatId: string;
  session?: string; // Opcional según tu ejemplo
  file: MediaFile;
  caption?: string;
}

export interface SendVideoPayload {
  chatId: string;
  session?: string; // Opcional según tu ejemplo
  file: MediaFile;
  caption?: string;
  convert?: boolean; // false
  asNote?: boolean; // false
}
