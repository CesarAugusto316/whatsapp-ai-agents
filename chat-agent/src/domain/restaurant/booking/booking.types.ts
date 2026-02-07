import { BookingSchema } from "./schemas";
import { Business } from "@/infraestructure/adapters/cms";
import { ChatMessage } from "@/infraestructure/adapters/ai";

export const BOOL = {
  YES: true,
  NO: false,
} as const;

/**
 * @todo REMOVE, since we have RAG this is unnecessary
 */
export enum CUSTOMER_INTENT {
  WHAT = "WHAT",
  HOW = "HOW",
}

/**
 * @todo REMOVE, since we have RAG this is unnecessary
 * @description Enum for intention classification
 */
export enum InputIntent {
  INPUT_DATA = "INPUT_DATA",
  CUSTOMER_QUESTION = "CUSTOMER_QUESTION",
}

export type AgentArgs = {
  messages: ChatMessage[];
  business: Business;
  customerPhone: string;
};

export const BookingStatuses = {
  MAKE_STARTED: "MAKE_STARTED",
  MAKE_RESTARTED: "MAKE_RESTARTED",
  MAKE_VALIDATED: "MAKE_VALIDATED",
  MAKE_CONFIRMED: "MAKE_CONFIRMED",

  UPDATE_STARTED: "UPDATE_STARTED",
  UPDATE_RESTARTED: "UPDATE_RESTARTED",
  UPDATE_VALIDATED: "UPDATE_VALIDATED",
  UPDATE_CONFIRMED: "UPDATE_CONFIRMED",

  CANCEL_STARTED: "CANCEL_STARTED",
  CANCEL_VALIDATED: "CANCEL_VALIDATED",
  CANCEL_CONFIRMED: "CANCEL_CONFIRMED",
} as const;

export type BookingStatus = keyof typeof BookingStatuses;

export interface BookingState extends BookingSchema {
  id: string;
  status: FMStatus;
  customerId: string;
  businessId: string;
  attempts: number;
}

export type BookingOption = "1" | "2" | "3";
export type FMStatus = BookingStatus | BookingOption;

// PRE_BOOKING = CONVERSATIONAL + INTENTS
export const BookingOptions = {
  MAKE_BOOKING: "1",
  UPDATE_BOOKING: "2",
  CANCEL_BOOKING: "3",
} as const;
// POST_BOOKING = CONVERSATIONAL + INTENTS

/**
 * @todo move this to other file
 */
// PRE_ORDER = CONVERSATIONAL + INTENTS
export const ProductOrderOptions = {
  MAKE_PRODUCT_ORDER: "4",
  UPDATE_PRODUCT_ORDER: "5",
  CANCEL_PRODUCT_ORDER: "6",
} as const;
// POST_ORDER = CONVERSATIONAL + INTENTS

export const CustomerActions = {
  CONFIRM: "CONFIRMAR",
  RESTART: "REINGRESAR",
  EXIT: "SALIR",
} as const;

export type CustomerActionKey = keyof typeof CustomerActions;

export type CustomerActionValue =
  | typeof CustomerActions.CONFIRM
  | typeof CustomerActions.RESTART
  | typeof CustomerActions.EXIT;
