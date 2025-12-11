// Main event interface
export interface WahaRecievedEvent {
  id: string;
  timestamp: number;
  session: string;
  metadata: Record<string, string>;
  engine: "WEBJS" | string; // Could be other engines like 'NOWEB', 'GOWS'
  event: string; // Could be 'message', 'ack', 'group_join', etc.
  payload: WahaMessagePayload;
  me: WahaMe;
  environment: WahaEnvironment;
}

// Message payload interface
export interface WahaMessagePayload {
  id: string;
  timestamp: number;
  from: string;
  fromMe: boolean;
  source: string;
  to: string;
  participant?: string; // Optional for group messages
  body: string;
  hasMedia: boolean;
  media?: WahaMedia; // Optional - only present if hasMedia is true
  ack: number;
  ackName?: string; // Optional acknowledgment status name
  author?: string; // Optional message author
  location?: WahaLocation; // Optional location data
  vCards?: string[]; // Optional vCard array
  _data: Record<string, any>;
  replyTo?: WahaReplyTo; // Optional reply data
}

// Media interface
export interface WahaMedia {
  url: string;
  mimetype: string;
  filename: string;
  s3?: {
    // Optional S3 storage info
    Bucket: string;
    Key: string;
  };
  error: any; // Could be null or error object
}

// Location interface
export interface WahaLocation {
  latitude: string;
  longitude: string;
  live: boolean;
  name?: string; // Optional location name
  address?: string; // Optional address
  url?: string; // Optional URL
  description?: string; // Optional description
  thumbnail?: string; // Optional thumbnail URL
}

// Reply interface
export interface WahaReplyTo {
  id: string;
  participant: string;
  body: string;
  _data: Record<string, any>;
}

// User/me interface
export interface WahaMe {
  id: string;
  lid: string;
  jid: string;
  pushName: string;
}

// Environment interface
export interface WahaEnvironment {
  version: string;
  engine: string;
  tier: string;
  browser: string;
}
