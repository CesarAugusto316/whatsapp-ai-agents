import { Locale, Payload } from "payload";
import { I18n } from "@payloadcms/translations";
import { User } from "@/payload-types";
import { suggestSlotsService } from "@/collections/appointments/Appointment.service";
import { AvailabilityResponse } from "@/collections/appointments/check-availability";
import { OccupancyHistogram } from "./simple-bar-chart";
import { TimeLine } from "./gantt";

export default async function Charts({}: {
  payload: Payload;
  locale: Locale;
  i18n: I18n;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  user: User;
}) {
  const res = (await suggestSlotsService({
    business: { equals: "e5e9aaa8-40bc-46c2-b5e0-9b932582ba0d" },
  })) as AvailabilityResponse;

  return (
    <div>
      <h1 style={{ marginBottom: 26, marginTop: 26, textAlign: "center" }}>
        Reservaciones para el{" "}
        {new Date(res.startDate).toLocaleDateString("ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h1>

      <section
        style={{
          marginBottom: 40,
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
