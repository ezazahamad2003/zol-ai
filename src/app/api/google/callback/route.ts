import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createServiceClient } from "@/server/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const businessId = searchParams.get("state");

  if (!code || !businessId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get primary calendar ID
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarList = await calendar.calendarList.get({ calendarId: "primary" });
  const calendarId = calendarList.data.id ?? "primary";

  const supabase = createServiceClient();
  await supabase.from("google_calendar_tokens").upsert(
    {
      business_id: businessId,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      calendar_id: calendarId,
      expires_at: new Date(tokens.expiry_date ?? Date.now() + 3600000).toISOString(),
    },
    { onConflict: "business_id" }
  );

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=true`
  );
}
