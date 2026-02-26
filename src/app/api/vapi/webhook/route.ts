import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/supabase/service";
import { checkAvailability, createCalendarEvent } from "@/server/google-calendar";

export async function POST(request: Request) {
  const body = await request.json();

  // Vapi sends tool call results via this endpoint
  const { message } = body;

  if (message?.type === "tool-calls") {
    const results = await Promise.all(
      message.toolCallList.map(async (toolCall: {
        id: string;
        function: { name: string; arguments: Record<string, string> };
      }) => {
        const { name, arguments: args } = toolCall.function;

        // Identify the business from the assistant
        const supabase = createServiceClient();
        const { data: business } = await supabase
          .from("businesses")
          .select("*")
          .eq("vapi_assistant_id", message.call.assistantId)
          .single();

        if (!business) {
          return { toolCallId: toolCall.id, result: "Error: Business not found" };
        }

        if (name === "check_availability") {
          const { date, time } = args;
          try {
            const result = await checkAvailability(
              business.id,
              date,
              time,
              business.timezone,
              business.appointment_duration_mins
            );
            if (result.available) {
              return {
                toolCallId: toolCall.id,
                result: `Available. The ${business.appointment_duration_mins}-minute slot on ${date} at ${time} is open.`,
              };
            } else {
              const next = result.nextAvailable
                ? ` The next available time is around ${result.nextAvailable}.`
                : "";
              return {
                toolCallId: toolCall.id,
                result: `Not available.${next}`,
              };
            }
          } catch (err) {
            console.error("check_availability error:", err);
            return {
              toolCallId: toolCall.id,
              result: "Unable to check availability at this time. Please call back during business hours.",
            };
          }
        }

        if (name === "create_booking") {
          const { caller_name, caller_phone, date, time, service } = args;
          try {
            // Double-check availability
            const avail = await checkAvailability(
              business.id,
              date,
              time,
              business.timezone,
              business.appointment_duration_mins
            );
            if (!avail.available) {
              return {
                toolCallId: toolCall.id,
                result: `That slot is no longer available. ${avail.nextAvailable ? `Next available: ${avail.nextAvailable}` : "Please try another time."}`,
              };
            }

            const { fromZonedTime } = await import("date-fns-tz");
            const { addMinutes } = await import("date-fns");
            const startUtc = fromZonedTime(`${date}T${time}:00`, business.timezone);
            const endUtc = addMinutes(startUtc, business.appointment_duration_mins);

            const googleEventId = await createCalendarEvent(
              business.id,
              business.name,
              business.timezone,
              business.appointment_duration_mins,
              { callerName: caller_name, callerPhone: caller_phone, service: service ?? null, date, time }
            );

            await supabase.from("bookings").insert({
              business_id: business.id,
              caller_name,
              caller_phone,
              service: service ?? null,
              start_time: startUtc.toISOString(),
              end_time: endUtc.toISOString(),
              google_event_id: googleEventId,
              status: "confirmed",
            });

            return {
              toolCallId: toolCall.id,
              result: `Booking confirmed! ${caller_name} is scheduled for ${date} at ${time}. A calendar event has been created.`,
            };
          } catch (err) {
            console.error("create_booking error:", err);
            return {
              toolCallId: toolCall.id,
              result: "I was unable to complete the booking. Please call back and we will assist you.",
            };
          }
        }

        return { toolCallId: toolCall.id, result: "Unknown tool" };
      })
    );

    return NextResponse.json({ results });
  }

  // Handle call end events — log the call
  if (message?.type === "end-of-call-report") {
    const supabase = createServiceClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", message.call.assistantId)
      .single();

    if (business) {
      const durationSeconds = Math.round(
        (message.call.endedAt
          ? new Date(message.call.endedAt).getTime() - new Date(message.call.startedAt).getTime()
          : 0) / 1000
      );

      const summary: string = message.summary ?? "";
      const outcome = summary.toLowerCase().includes("booked") || summary.toLowerCase().includes("appointment")
        ? "booked"
        : summary.toLowerCase().includes("question")
        ? "question_answered"
        : "no_answer";

      await supabase.from("call_logs").insert({
        business_id: business.id,
        vapi_call_id: message.call.id,
        caller_number: message.call.customer?.number ?? null,
        duration_seconds: durationSeconds,
        outcome,
      });
    }
  }

  return NextResponse.json({ received: true });
}
