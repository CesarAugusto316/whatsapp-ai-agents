interface EventLocation {
  name: string;
}

interface EventDetails {
  name: string;
  description: string;
  startTime: number;
  endTime: number | null;
  location: EventLocation;
  extraGuestsAllowed: boolean;
}

export interface SendEventPayload {
  chatId: string;
  reply_to: string | null;
  event: EventDetails;
  session?: string; // Opcional según tu ejemplo
}
