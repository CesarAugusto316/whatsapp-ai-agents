import { Business } from "@/types/business/cms-types";
import { ModelMessage } from "ai";

export const AVAILABLE = {
  YES: true,
  NO: false,
} as const;

export enum ROUTING_AGENT {
  InfoReservation = "infoReservation",
  MakeReservation = "makeReservation",
  UpdateReservation = "updateReservation",
  CancelReservation = "cancelReservation",
}

export enum RESERVATION {
  START_TRIGGER = "INICIAR RESERVA",
  CREATE_TRIGGER = "CONFIRMAR RESERVA",
  UPDATE_TRIGGER = "CAMBIAR RESERVA",
  CANCEL_TRIGGER = "CANCELAR RESERVA",
  SUCCESS = "RESERVA CONFIRMADA",
  FAILURE = "RESERVA NO CONFIRMADA",
}

export type AgentArgs = {
  messages: ModelMessage[];
  business: Business;
  customerPhone: string;
};

export type WeekDay = Omit<Business["schedule"], "averageTime">;

export const WEEK_DAYS: Array<keyof WeekDay> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
