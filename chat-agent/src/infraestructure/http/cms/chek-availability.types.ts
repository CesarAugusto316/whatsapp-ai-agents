interface TimeSlot {
  hour: string;
  availableSlots: number;
  isAvailable: boolean;
}

export interface AvailabilityResponse {
  success: boolean;
  message?: string;
  businessId: string;
  requestedStart: string;
  requestedEnd: string;
  requestedPeople?: number;
  totalCapacityPerHour: number;
  availableSlotsPerHour: TimeSlot[];
  isFullyAvailable: boolean;
  suggestedTimes?: string[];
}
