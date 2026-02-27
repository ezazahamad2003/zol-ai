/**
 * BACKEND: Google Calendar integration
 * Handles OAuth token management, availability checks, and event creation.
 * Called from: /api/google/callback (token storage), /api/vapi/webhook (bookings)
 */
import { google } from "googleapis";
import { createServiceClient } from "@/server/supabase/service";
import { addMinutes, formatISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );
}

export function getAuthUrl(businessId: string): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    state: businessId,
    prompt: "consent",
  });
}

async function getAuthorizedClient(businessId: string) {
  const supabase = createServiceClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (!tokenRow) throw new Error("No Google Calendar connected for this business");

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: new Date(tokenRow.expires_at).getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from("google_calendar_tokens")
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(tokens.expiry_date ?? Date.now() + 3600000).toISOString(),
        })
        .eq("business_id", businessId);
    }
  });

  return { oauth2Client, calendarId: tokenRow.calendar_id };
}

export async function checkAvailability(
  businessId: string,
  date: string,
  time: string,
  timezone: string,
  durationMins: number
): Promise<{ available: boolean; nextAvailable?: string }> {
  const { oauth2Client, calendarId } = await getAuthorizedClient(businessId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const localStart = fromZonedTime(`${date}T${time}:00`, timezone);
  const localEnd = addMinutes(localStart, durationMins);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: localStart.toISOString(),
      timeMax: localEnd.toISOString(),
      timeZone: timezone,
      items: [{ id: calendarId }],
    },
  });

  const busy = data.calendars?.[calendarId]?.busy ?? [];
  if (busy.length === 0) return { available: true };

  // Try the next 5 one-hour slots to find an opening
  for (let i = 1; i <= 5; i++) {
    const nextStart = addMinutes(localStart, i * 60);
    const nextEnd = addMinutes(nextStart, durationMins);
    const { data: nextData } = await calendar.freebusy.query({
      requestBody: {
        timeMin: nextStart.toISOString(),
        timeMax: nextEnd.toISOString(),
        timeZone: timezone,
        items: [{ id: calendarId }],
      },
    });
    const nextBusy = nextData.calendars?.[calendarId]?.busy ?? [];
    if (nextBusy.length === 0) {
      const inTz = toZonedTime(nextStart, timezone);
      return { available: false, nextAvailable: formatISO(inTz, { representation: "complete" }) };
    }
  }

  return { available: false };
}

export async function createCalendarEvent(
  businessId: string,
  businessName: string,
  timezone: string,
  durationMins: number,
  booking: {
    callerName: string;
    callerPhone?: string;
    service: string | null;
    date: string;
    time: string;
  }
): Promise<string> {
  const { oauth2Client, calendarId } = await getAuthorizedClient(businessId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const startUtc = fromZonedTime(`${booking.date}T${booking.time}:00`, timezone);
  const endUtc = addMinutes(startUtc, durationMins);

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `${booking.callerName}${booking.service ? ` — ${booking.service}` : ""}`,
      description: `Booked via ${businessName} AI Receptionist${booking.callerPhone ? `\nPhone: ${booking.callerPhone}` : ""}`,
      start: { dateTime: startUtc.toISOString(), timeZone: timezone },
      end: { dateTime: endUtc.toISOString(), timeZone: timezone },
      attendees: [{ displayName: booking.callerName }],
    },
  });

  return event.data.id!;
}
