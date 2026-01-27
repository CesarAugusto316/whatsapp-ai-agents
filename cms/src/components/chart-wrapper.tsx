import { Locale, Payload } from "payload";
import { I18n } from "@payloadcms/translations";
import { User } from "@/payload-types";
import {
  checkAvailabilityService,
  suggestSlotsService,
} from "@/collections/appointments/Appointment.service";
import { AvailabilityResponse } from "@/collections/appointments/check-availability";
import { OccupancyHistogram } from "./bar-chart";
import { TimeLine } from "./time-line";
import { DatePicker, Select } from "@payloadcms/ui";

export default async function Charts({
  payload,
  user,
}: {
  payload: Payload;
  locale: Locale;
  i18n: I18n;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  user: User;
}) {
  const businesses = await payload.find({
    collection: "businesses",
    where: {
      "general.user": {
        equals: user.id,
      },
    },
  });

  const res = (await checkAvailabilityService(
    {
      startDateTime: {
        // selected Date
        equals: new Date().toISOString(),
      },
      business: {
        equals:
          // selected business ID
          "e5e9aaa8-40bc-46c2-b5e0-9b932582ba0d",
      },
    },
    false,
  )) as AvailabilityResponse;

  console.log({ businesses, user });

  return (
    <div
      style={{ display: "grid", gap: 40, paddingTop: 30, paddingBottom: 30 }}
    >
      <h2 style={{ textAlign: "center" }}>
        Reservaciones para el{" "}
        {new Date(res.startDate).toLocaleDateString("ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h2>

      <div style={{ display: "flex", gap: 12 }}>
        {/* To use hooks, must be componetized in an client component */}
        <Select
          options={businesses.docs.map((business) => ({
            label: business.name,
            value: business.id,
            id: business.id,
          }))}
        />

        {/* To use hooks, must be componetized in an client component */}
        <DatePicker />
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
        }}
      >
        <OccupancyHistogram
          slots={res.slotsByTimeRange}
          maxCapacity={res.maxCapacityPerHour}
        />
        <TimeLine
          slots={res.slotsByTimeRange}
          maxCapacity={res.maxCapacityPerHour}
        />
      </section>
    </div>
  );
}
