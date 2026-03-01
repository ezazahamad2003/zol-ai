import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";
import { updateVapiAssistant } from "@/server/vapi";

/**
 * POST /api/vapi/sync
 * Syncs the authenticated user's business settings (including voice) to the Vapi assistant.
 * Called by the settings form after a successful Supabase update.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (!business.vapi_assistant_id) {
    return NextResponse.json({ message: "No Vapi assistant to sync" });
  }

  await updateVapiAssistant(business);
  return NextResponse.json({ success: true });
}
