import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/supabase/service";
import { checkAvailability, createCalendarEvent } from "@/server/google-calendar";
import { toZonedTime } from "date-fns-tz";
import { addDays, addMinutes, format } from "date-fns";

// ─── Date / time parsing ──────────────────────────────────────────────────────

/**
 * Resolves natural language dates to YYYY-MM-DD.
 * Uses the call's start time as "now" so "today"/"tomorrow" are always correct.
 */
function parseDate(raw: string, callStartedAt: string, timezone: string): string {
  const trimmed = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const now = toZonedTime(new Date(callStartedAt), timezone);
  const lower = trimmed.toLowerCase();

  if (lower === "today") return format(now, "yyyy-MM-dd");
  if (lower === "tomorrow") return format(addDays(now, 1), "yyyy-MM-dd");
  if (lower.includes("day after tomorrow")) return format(addDays(now, 2), "yyyy-MM-dd");

  // Day-of-week: "monday", "next tuesday", etc.
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const matchedDay = dayNames.findIndex((d) => lower.includes(d));
  if (matchedDay !== -1) {
    const currentDay = now.getDay();
    let daysAhead = matchedDay - currentDay;
    // Always go forward (never same day unless "this X" with daysAhead=0 meaning next week)
    if (daysAhead <= 0) daysAhead += 7;
    return format(addDays(now, daysAhead), "yyyy-MM-dd");
  }

  // Fallback: today
  return format(now, "yyyy-MM-dd");
}

/**
 * Resolves natural language times to HH:MM (24h).
 * Handles: "3pm", "3:30pm", "3:30 PM", "15:00", "morning" (9am), "afternoon" (1pm), "evening" (6pm).
 */
function parseTime(raw: string): string {
  const trimmed = raw.trim();

  // Already HH:MM
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();

  // Named periods
  if (lower.includes("morning")) return "09:00";
  if (lower.includes("noon") || lower.includes("midday")) return "12:00";
  if (lower.includes("afternoon")) return "13:00";
  if (lower.includes("evening")) return "18:00";
  if (lower.includes("night")) return "19:00";

  // Numeric: "3pm", "3:30pm", "3 pm", "3.30pm", "1530"
  const match = lower.match(/^(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm)?$/);
  if (match) {
    let hour = parseInt(match[1]);
    const min = match[2] ? parseInt(match[2]) : 0;
    const meridiem = match[3];

    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    // No meridiem and hour ≤ 7 → assume PM (business context)
    if (!meridiem && hour <= 7) hour += 12;

    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  return trimmed;
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body;

  if (message?.type === "tool-calls") {
    const supabase = createServiceClient();
    const callStartedAt: string = message.call?.startedAt ?? new Date().toISOString();

    const results = await Promise.all(
      message.toolCallList.map(async (toolCall: {
        id: string;
        function: { name: string; arguments: Record<string, string> };
      }) => {
        const { name, arguments: args } = toolCall.function;

        const { data: business } = await supabase
          .from("businesses")
          .select("*")
          .eq("vapi_assistant_id", message.call.assistantId)
          .single();

        if (!business) {
          return { toolCallId: toolCall.id, result: "Error: Business configuration not found." };
        }

        // Resolve natural language date and time
        const resolvedDate = args.date ? parseDate(args.date, callStartedAt, business.timezone) : format(toZonedTime(new Date(), business.timezone), "yyyy-MM-dd");
        const resolvedTime = args.time ? parseTime(args.time) : "09:00";

        if (name === "check_availability") {
          try {
            const result = await checkAvailability(
              business.id,
              resolvedDate,
              resolvedTime,
              business.timezone,
              business.appointment_duration_mins
            );

            if (result.available) {
              return {
                toolCallId: toolCall.id,
                result: `That slot is available — ${business.appointment_duration_mins} minutes on ${resolvedDate} at ${resolvedTime}.`,
              };
            }

            const next = result.nextAvailable
              ? ` The next open slot is around ${result.nextAvailable}.`
              : " Please try a different time.";
            return {
              toolCallId: toolCall.id,
              result: `That time is not available.${next}`,
            };
          } catch (err) {
            console.error("check_availability error:", err);
            return {
              toolCallId: toolCall.id,
              result: "I'm unable to check availability right now. Please try calling back shortly.",
            };
          }
        }

        if (name === "create_booking") {
          const callerName: string = args.caller_name ?? "Guest";
          const callerPhone: string = args.caller_phone ?? "";
          const service: string | null = args.service ?? null;

          try {
            // Re-verify availability
            const avail = await checkAvailability(
              business.id,
              resolvedDate,
              resolvedTime,
              business.timezone,
              business.appointment_duration_mins
            );

            if (!avail.available) {
              const next = avail.nextAvailable ? ` Next available: ${avail.nextAvailable}.` : "";
              return {
                toolCallId: toolCall.id,
                result: `Sorry, that slot just became unavailable.${next} Would you like to try a different time?`,
              };
            }

            const startUtc = new Date(`${resolvedDate}T${resolvedTime}:00`);
            const endUtc = addMinutes(startUtc, business.appointment_duration_mins);

            const googleEventId = await createCalendarEvent(
              business.id,
              business.name,
              business.timezone,
              business.appointment_duration_mins,
              { callerName, callerPhone, service, date: resolvedDate, time: resolvedTime }
            );

            await supabase.from("bookings").insert({
              business_id: business.id,
              caller_name: callerName,
              caller_phone: callerPhone,
              service,
              start_time: startUtc.toISOString(),
              end_time: endUtc.toISOString(),
              google_event_id: googleEventId,
              status: "confirmed",
            });

            return {
              toolCallId: toolCall.id,
              result: `All set! ${callerName} is booked for ${resolvedDate} at ${resolvedTime}. See you then!`,
            };
          } catch (err) {
            console.error("create_booking error:", err);
            return {
              toolCallId: toolCall.id,
              result: "I wasn't able to complete the booking. Please call back and we'll sort it out.",
            };
          }
        }

        return { toolCallId: toolCall.id, result: "Unknown tool." };
      })
    );

    return NextResponse.json({ results });
  }

  // Log call end
  if (message?.type === "end-of-call-report") {
    const supabase = createServiceClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", message.call.assistantId)
      .single();

    if (business) {
      const durationSeconds = Math.round(
        (message.call.endedAt && message.call.startedAt
          ? new Date(message.call.endedAt).getTime() - new Date(message.call.startedAt).getTime()
          : 0) / 1000
      );

      const summary: string = message.summary ?? "";
      const outcome = summary.toLowerCase().includes("book") || summary.toLowerCase().includes("appointment")
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
