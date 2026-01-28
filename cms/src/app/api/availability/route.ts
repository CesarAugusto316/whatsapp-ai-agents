import { NextRequest, NextResponse } from "next/server";
import {
  checkAvailabilityService,
  suggestSlotsService,
} from "@/collections/appointments/Appointment.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 },
      );
    }

    if (!body.startDateTime) {
      return NextResponse.json(
        { error: "startDateTime is required" },
        { status: 400 },
      );
    }

    // Prepare the where clause for checkAvailabilityService
    const where = {
      startDateTime: {
        equals: body.startDateTime,
      },
      business: {
        equals: body.businessId,
      },
      ...(body.numberOfPeople && {
        numberOfPeople: {
          equals: body.numberOfPeople.toString(),
        },
      }),
      ...(body.endDateTime && {
        endDateTime: {
          equals: body.endDateTime,
        },
      }),
    };

    // Call the service
    const result = await suggestSlotsService(
      where,
      // false,
      // body.checkOverlapping || false,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in availability API:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === "businessNotFound") {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 },
        );
      }

      if (error.message === "startDateTime is required") {
        return NextResponse.json(
          { error: "startDateTime is required" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: "Method not allowed. Use POST instead." },
    { status: 405 },
  );
}
