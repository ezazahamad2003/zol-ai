import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";
import { getAuthUrl } from "@/server/google-calendar";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding`);
  }

  const url = getAuthUrl(business.id);
  return NextResponse.redirect(url);
}
