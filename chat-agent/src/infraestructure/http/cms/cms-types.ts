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

export interface User {
  id: string;
  role: "admin" | "business";
  name: string;
  phoneNumber?: string | null;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "appointments".
 */
export interface Appointment {
  id: string;
  business: string | Business;
  customer: string | Customer;
  customerName: string;
  numberOfPeople: number;
  startDateTime: string;
  endDateTime?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string | null;
  updatedAt: string;
  createdAt: string;
}

export type CreateAppointment = Omit<
  Appointment,
  "id" | "updatedAt" | "createdAt"
>;

export type Day = {
  open: number;
  close: number;
  id?: string | null;
};

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "businesses".
 */
export interface Business {
  id: string;
  name: string;
  general: {
    phoneNumber: string;
    /**
     * Use this field to indicate whether the business requires appointment approval or not. Tell the chatbot to disable it or do it manually here.
     */
    requireAppointmentApproval?: boolean | null;
    businessType: "restaurant" | "medical" | "legal" | "real_estate";
    tables?: number | null;
    description?: string | null;
    user: string | User;
    timezone:
      | "Europe/Madrid"
      | "Europe/Paris"
      | "Europe/London"
      | "America/Lima"
      | "America/New_York"
      | "Asia/Tokyo";
    /**
     * Use this field to mark the business as active or inactive. Tell the chatbot to disable it or do it manually here. Use it for holidays, etc.
     */
    isActive?: boolean | null;
    nextHoliday?:
      | {
          startDate: string;
          endDate: string;
          id?: string | null;
        }[]
      | null;
  };
  schedule: {
    averageTime: number;
    monday?: Day[] | null;
    tuesday?: Day[] | null;
    wednesday?: Day[] | null;
    thursday?: Day[] | null;
    friday?: Day[] | null;
    saturday?: Day[] | null;
    sunday?: Day[] | null;
  };
  updatedAt: string;
  createdAt: string;
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "customers".
 */
export interface Customer {
  id: string;
  phoneNumber: string;
  business: string | Business;
  name: string;
  /**
   * Allow user to block costumers for bad behavior
   */
  block?: boolean | null;
  email?: string | null;
  updatedAt: string;
  createdAt: string;
}

export type CreateCustomer = Omit<Customer, "id" | "updatedAt" | "createdAt">;
