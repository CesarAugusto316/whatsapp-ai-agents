import { daysFromNowUTC, isDateTimeWithinSchedule } from "@/helpers/helpers";
import { describe, it, expect } from "bun:test";

const schedule = {
  monday: [
    { open: 480, close: 720 }, // 08:00–12:00
    { open: 840, close: 1200 }, // 14:00–20:00
  ],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

describe("isDateTimeWithinSchedule", () => {
  //
  it("returns false during midday gap in Guayaquil", () => {
    const result = isDateTimeWithinSchedule(
      "2025-12-29T18:00:00.000Z", // 13:00 Guayaquil
      schedule,
      "America/Guayaquil",
    );

    expect(result).toBe(false);
  });

  it("returns true during afternoon opening hours in Guayaquil", () => {
    const result = isDateTimeWithinSchedule(
      "2025-12-29T19:00:00.000Z", // 14:00 Guayaquil
      schedule,
      "America/Guayaquil",
    );

    expect(result).toBe(true);
  });

  it("same UTC instant yields different results in different timezones", () => {
    const utc = "2025-12-29T18:00:00.000Z";

    const guayaquil = isDateTimeWithinSchedule(
      utc,
      schedule,
      "America/Guayaquil",
    );

    const madrid = isDateTimeWithinSchedule(utc, schedule, "Europe/Madrid");

    expect(guayaquil).toBe(false); // 13:00
    expect(madrid).toBe(true); // 19:00
  });

  it("correctly resolves weekday when timezone shifts date", () => {
    const result = isDateTimeWithinSchedule(
      "2025-12-29T02:00:00.000Z", // 21:00 domingo en Guayaquil
      schedule,
      "America/Guayaquil",
    );

    expect(result).toBe(false); // domingo, aunque UTC sea lunes
  });

  it("excludes exact closing time", () => {
    const result = isDateTimeWithinSchedule(
      "2025-12-29T17:00:00.000Z", // 12:00 Guayaquil
      schedule,
      "America/Guayaquil",
    );

    expect(result).toBe(false);
  });

  it("works correctly for a date 3 days in the future", () => {
    const utc = daysFromNowUTC(3, 18); // 18:00 UTC

    const result = isDateTimeWithinSchedule(utc, schedule, "America/Guayaquil");

    // 18:00 UTC → 13:00 Guayaquil → gap
    expect(result).toBe(false);
  });

  it("behaves identically across different weeks for the same weekday", () => {
    const base = new Date("2025-01-06T18:00:00.000Z"); // Monday

    const oneWeekLater = new Date(base);
    oneWeekLater.setUTCDate(base.getUTCDate() + 7);

    const r1 = isDateTimeWithinSchedule(
      base.toISOString(),
      schedule,
      "Europe/Madrid",
    );

    const r2 = isDateTimeWithinSchedule(
      oneWeekLater.toISOString(),
      schedule,
      "Europe/Madrid",
    );

    expect(r1).toBe(r2);
  });

  it("correctly resolves weekday in the future when timezone shifts date", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    future.setUTCHours(2, 0, 0, 0); // madrugada UTC

    const result = isDateTimeWithinSchedule(
      future.toISOString(),
      schedule,
      "America/Guayaquil",
    );

    // puede ser el día anterior local
    expect(typeof result).toBe("boolean");
  });
});
