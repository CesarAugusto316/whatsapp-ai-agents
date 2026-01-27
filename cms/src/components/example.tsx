import { Locale, Payload } from "payload";
import { I18n } from "@payloadcms/translations";
import { User } from "@/payload-types";
import { suggestSlotsService } from "@/collections/appointments/Appointment.service";
import { AvailabilityResponse } from "@/collections/appointments/check-availability";
import BarCharts from "./simple-bar-chart";

export default async function MyAfterDashboardComponent({
  ...rest
}: {
  payload: Payload;
  locale: Locale;
  i18n: I18n;
  params: {};
  searchParams: {};
  user: User;
}) {
  console.log({ rest });

  const res = (await suggestSlotsService({
    business: { equals: "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c" },
  })) as AvailabilityResponse;

  return (
    <BarCharts
      slotsByTimeRange={res.slotsByTimeRange ?? []}
      maxCapacityPerHour={res.maxCapacityPerHour ?? 40}
    />
  );
}
