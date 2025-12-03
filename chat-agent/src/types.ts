export interface WhatsAppWebhookPayload {
  sessionId: string;
  event: string;
  data: {
    messages: {
      key: {
        fromMe: boolean;
        id: string;
        remoteJid: string;
        senderPn: string;
        cleanedSenderPn: string;
        senderLid: string;
        addressingMode: string;
      };
      broadcast: boolean;
      pushName: string;
      message: {
        extendedTextMessage: {
          text: string;
          previewType: string;
          contextInfo: {
            ephemeralSettingTimestamp: string;
            disappearingMode: {
              initiator: string;
              trigger: string;
            };
            expiration: number;
          };
          inviteLinkGroupTypeV2: string;
        };
        messageContextInfo: {
          deviceListMetadata: {
            recipientKeyHash: string;
            recipientTimestamp: string;
          };
          messageSecret: string;
          deviceListMetadataVersion: number;
        };
      };
      messageBody: string;
      remoteJid: string;
      id: string;
      messageTimestamp: number;
    };
  };
}
