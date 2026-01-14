interface ContactVCard {
  vcard: string | null;
  fullName?: string;
  organization?: string;
  phoneNumber?: string;
  whatsappId?: string;
}

export interface SendContactPayload {
  chatId: string;
  contacts: ContactVCard[];
  reply_to: string | null;
  session: string;
}
